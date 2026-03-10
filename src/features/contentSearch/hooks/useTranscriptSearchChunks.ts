import { useEffect, useState } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION,
  type VideoTranscriptSearchChunkDoc,
} from '../../../types/videoTranscripts';
import { debugError } from '../../../lib/debug';

let transcriptSearchChunksCache: VideoTranscriptSearchChunkDoc[] | null = null;
let transcriptSearchChunksPromise: Promise<VideoTranscriptSearchChunkDoc[]> | null = null;

async function loadTranscriptSearchChunks() {
  if (transcriptSearchChunksCache) {
    return transcriptSearchChunksCache;
  }

  if (!transcriptSearchChunksPromise) {
    transcriptSearchChunksPromise = getDocs(
      collectionGroup(db, VIDEO_TRANSCRIPT_SEARCH_CHUNKS_SUBCOLLECTION)
    )
      .then((snapshot) => {
        const chunks = snapshot.docs.map(
          (docSnap) => docSnap.data() as VideoTranscriptSearchChunkDoc
        );
        transcriptSearchChunksCache = chunks;
        return chunks;
      })
      .catch((error) => {
        transcriptSearchChunksPromise = null;
        throw error;
      });
  }

  return transcriptSearchChunksPromise;
}

export function resetTranscriptSearchChunksCache() {
  transcriptSearchChunksCache = null;
  transcriptSearchChunksPromise = null;
}

export function useTranscriptSearchChunks(enabled: boolean) {
  const [chunks, setChunks] = useState<VideoTranscriptSearchChunkDoc[]>(() => transcriptSearchChunksCache ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (transcriptSearchChunksCache) {
      setChunks(transcriptSearchChunksCache);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadTranscriptSearchChunks()
      .then((nextChunks) => {
        if (!cancelled) {
          setChunks(nextChunks);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          debugError('[useTranscriptSearchChunks] Failed to load transcript search chunks', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    chunks,
    loading,
  };
}

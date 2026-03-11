import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getBytes, ref } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import {
  VIDEO_TRANSCRIPTS_COLLECTION,
  type VideoTranscriptDoc,
  type VideoTranscriptStoragePayload,
} from '../types/videoTranscripts';

function parseTranscriptPayload(raw: ArrayBuffer | Uint8Array) {
  const text = new TextDecoder().decode(raw);
  return JSON.parse(text) as VideoTranscriptStoragePayload;
}

export function useVideoTranscript(
  youtubeVideoId: string | null,
  enabled: boolean,
  shouldLoadContent: boolean
) {
  const [metadata, setMetadata] = useState<VideoTranscriptDoc | null>(null);
  const [transcript, setTranscript] = useState<VideoTranscriptStoragePayload | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !youtubeVideoId) {
      setMetadata(null);
      setTranscript(null);
      setIsChecking(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsChecking(true);
    setError(null);

    getDoc(doc(db, VIDEO_TRANSCRIPTS_COLLECTION, youtubeVideoId))
      .then((snapshot) => {
        if (isCancelled) {
          return;
        }

        if (!snapshot.exists()) {
          setMetadata(null);
          return;
        }

        setMetadata(snapshot.data() as VideoTranscriptDoc);
      })
      .catch(() => {
        if (!isCancelled) {
          setMetadata(null);
          setError('Не удалось проверить транскрипт');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsChecking(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [enabled, youtubeVideoId]);

  useEffect(() => {
    if (!enabled || !shouldLoadContent || !metadata?.storagePath || transcript) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    getBytes(ref(storage, metadata.storagePath))
      .then((raw) => {
        if (!isCancelled) {
          setTranscript(parseTranscriptPayload(raw));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError('Не удалось загрузить транскрипт');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [enabled, metadata?.storagePath, shouldLoadContent, transcript]);

  const hasTranscript = metadata?.status === 'available' && Boolean(metadata.storagePath);

  return {
    error,
    hasTranscript,
    isChecking,
    isLoading,
    metadata,
    transcript,
  };
}

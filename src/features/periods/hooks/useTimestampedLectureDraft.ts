import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildLectureContentFromSegments,
  buildLectureSegmentId,
  buildTimestampedLectureContent,
  LECTURE_NOTE_IDLE_THRESHOLD_MS,
  type LectureNoteSegment,
} from '../../../types/notes';
import type { StudyVideoPlaybackSnapshot } from '../components/StudyVideoPlayer';

interface UseTimestampedLectureDraftOptions {
  getPlaybackSnapshot?: () => StudyVideoPlaybackSnapshot;
  idleThresholdMs?: number;
  initialSegments: LectureNoteSegment[];
}

function createEmptySegment() {
  return {
    id: buildLectureSegmentId(),
    startMs: null,
    text: '',
  } satisfies LectureNoteSegment;
}

function sanitizeSegments(segments: LectureNoteSegment[]) {
  return segments.filter((segment) => segment.text.trim());
}

export function useTimestampedLectureDraft({
  getPlaybackSnapshot,
  idleThresholdMs = LECTURE_NOTE_IDLE_THRESHOLD_MS,
  initialSegments,
}: UseTimestampedLectureDraftOptions) {
  const initialSignature = useMemo(() => JSON.stringify(initialSegments), [initialSegments]);
  const normalizedInitialSegments = useMemo(
    () => sanitizeSegments(initialSegments),
    [initialSignature]
  );
  const [segments, setSegments] = useState<LectureNoteSegment[]>(() => normalizedInitialSegments);
  const [composer, setComposer] = useState<LectureNoteSegment>(createEmptySegment);
  const composerRef = useRef(composer);

  useEffect(() => {
    composerRef.current = composer;
  }, [composer]);

  const resetDraft = useCallback((nextSegments: LectureNoteSegment[]) => {
    setSegments(sanitizeSegments(nextSegments));
    setComposer(createEmptySegment());
  }, []);

  const finalizeComposer = useCallback(() => {
    setSegments((current) => {
      if (!composerRef.current.text.trim()) {
        return current;
      }

      return [...current, composerRef.current];
    });
    setComposer(createEmptySegment());
  }, []);

  useEffect(() => {
    if (!composer.text.trim()) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      finalizeComposer();
    }, idleThresholdMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [composer, finalizeComposer, idleThresholdMs]);

  const updateComposerText = useCallback(
    (nextText: string) => {
      setComposer((current) => {
        if (!nextText.trim()) {
          return {
            ...current,
            startMs: null,
            text: nextText,
          };
        }

        if (current.startMs !== null) {
          return {
            ...current,
            text: nextText,
          };
        }

        return {
          ...current,
          startMs: getPlaybackSnapshot?.().currentTimeMs ?? null,
          text: nextText,
        };
      });
    },
    [getPlaybackSnapshot]
  );

  const updateSegmentText = useCallback((segmentId: string, nextText: string) => {
    setSegments((current) =>
      current.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              text: nextText,
            }
          : segment
      )
    );
  }, []);

  const removeEmptySegment = useCallback((segmentId: string) => {
    setSegments((current) =>
      current.filter((segment) => segment.id !== segmentId || segment.text.trim())
    );
  }, []);

  const persistedSegments = useMemo(
    () => sanitizeSegments([...segments, composer]),
    [composer, segments]
  );

  return {
    composer,
    finalizeComposer,
    persistedSegments,
    plainText: buildLectureContentFromSegments(persistedSegments),
    resetDraft,
    segments,
    timestampedText: buildTimestampedLectureContent(persistedSegments),
    updateComposerText,
    updateSegmentText,
    removeEmptySegment,
  };
}

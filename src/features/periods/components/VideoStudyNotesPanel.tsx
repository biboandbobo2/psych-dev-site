import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoginModal from '../../../components/LoginModal';
import { useNotes } from '../../../hooks/useNotes';
import { debugError } from '../../../lib/debug';
import {
  normalizeLectureNoteSegments,
  type LectureNoteSegment,
} from '../../../types/notes';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { StudyVideoPlaybackSnapshot } from './StudyVideoPlayer';
import { LectureNoteSegmentsEditor } from './LectureNoteSegmentsEditor';
import { useTimestampedLectureDraft } from '../hooks/useTimestampedLectureDraft';

interface VideoStudyNotesPanelProps {
  courseId: string;
  draftSegments: LectureNoteSegment[];
  getPlaybackSnapshot?: () => StudyVideoPlaybackSnapshot;
  lectureResourceId: string;
  onDraftSegmentsChange: (segments: LectureNoteSegment[]) => void;
  onTimestampClick: (startMs: number) => void;
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type NoteViewMode = 'plain' | 'timestamped';

export function VideoStudyNotesPanel({
  courseId,
  draftSegments,
  getPlaybackSnapshot,
  lectureResourceId,
  onDraftSegmentsChange,
  onTimestampClick,
  periodId,
  periodTitle,
  videoTitle,
}: VideoStudyNotesPanelProps) {
  const user = useAuthStore((state) => state.user);
  const { getLectureNote, upsertLectureNote } = useNotes(undefined, { subscribe: false });
  const lectureContext = useMemo(
    () => ({
      courseId,
      periodId: periodId ?? lectureResourceId,
      periodTitle: periodTitle.trim() || videoTitle,
      lectureTitle: videoTitle,
      lectureVideoId: lectureResourceId,
    }),
    [courseId, lectureResourceId, periodId, periodTitle, videoTitle]
  );

  const draftSignature = useMemo(() => JSON.stringify(draftSegments), [draftSegments]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [viewMode, setViewMode] = useState<NoteViewMode>('plain');
  const hasUserEditedRef = useRef(false);
  const lastPublishedDraftSignatureRef = useRef(draftSignature);
  const lastSavedSignatureRef = useRef(draftSignature);
  const {
    composer,
    persistedSegments,
    plainText,
    segments,
    updateComposerText,
    updateSegmentText,
    removeEmptySegment,
  } = useTimestampedLectureDraft({
    getPlaybackSnapshot,
    initialSegments: draftSegments,
  });
  const persistedSignature = useMemo(
    () => JSON.stringify(persistedSegments),
    [persistedSegments]
  );
  const hasContent = persistedSegments.length > 0;
  const isDirty = persistedSignature !== lastSavedSignatureRef.current;

  const saveLectureNote = useCallback(
    async (
      nextContent: string,
      nextSegments: LectureNoteSegment[],
      options?: { silent?: boolean }
    ) => {
      if (!user) {
        return false;
      }

      if (!nextContent.trim() && lastSavedSignatureRef.current === '[]') {
        return false;
      }

      if (!options?.silent) {
        setSaveState('saving');
      }

      try {
        await upsertLectureNote(nextContent, lectureContext, {
          lectureSegments: nextSegments,
        });
        lastSavedSignatureRef.current = JSON.stringify(nextSegments);

        if (!options?.silent) {
          setSaveState(nextSegments.length > 0 ? 'saved' : 'idle');
        }

        return true;
      } catch (error) {
        debugError('[VideoStudyNotesPanel] Failed to save note', error);
        if (!options?.silent) {
          setSaveState('error');
        }
        return false;
      }
    },
    [lectureContext, upsertLectureNote, user]
  );

  useEffect(() => {
    lastPublishedDraftSignatureRef.current = draftSignature;
  }, [draftSignature]);

  useEffect(() => {
    if (lastPublishedDraftSignatureRef.current === persistedSignature) {
      return;
    }

    lastPublishedDraftSignatureRef.current = persistedSignature;
    onDraftSegmentsChange(persistedSegments);
  }, [onDraftSegmentsChange, persistedSegments, persistedSignature]);

  useEffect(() => {
    let cancelled = false;

    hasUserEditedRef.current = false;

    if (!user) {
      lastSavedSignatureRef.current = draftSignature;
      setIsHydrating(false);
      setSaveState('idle');
      return undefined;
    }

    const loadSavedNote = async () => {
      setIsHydrating(true);
      try {
        const note = await getLectureNote(lectureContext);
        const savedSegments = normalizeLectureNoteSegments(
          note?.lectureSegments,
          note?.content ?? ''
        );
        const savedSignature = JSON.stringify(savedSegments);
        lastSavedSignatureRef.current = savedSignature;

        if (!cancelled && !hasUserEditedRef.current && draftSignature === '[]') {
          onDraftSegmentsChange(savedSegments);
        }

        if (!cancelled) {
          setSaveState(savedSegments.length > 0 ? 'saved' : 'idle');
        }
      } catch (error) {
        debugError('[VideoStudyNotesPanel] Failed to load note', error);
        if (!cancelled) {
          setSaveState('error');
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    void loadSavedNote();

    return () => {
      cancelled = true;
    };
  }, [draftSignature, getLectureNote, lectureContext, onDraftSegmentsChange, user]);

  useEffect(() => {
    if (!user || isHydrating) {
      return undefined;
    }

    if (!isDirty) {
      setSaveState(hasContent ? 'saved' : 'idle');
      return undefined;
    }

    if (!plainText.trim() && lastSavedSignatureRef.current === '[]') {
      setSaveState('idle');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void saveLectureNote(plainText, persistedSegments);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    hasContent,
    isDirty,
    isHydrating,
    persistedSegments,
    plainText,
    saveLectureNote,
    user,
  ]);

  useEffect(() => {
    return () => {
      if (
        !user ||
        isHydrating ||
        persistedSignature === lastSavedSignatureRef.current ||
        (!plainText.trim() && lastSavedSignatureRef.current === '[]')
      ) {
        return;
      }

      void saveLectureNote(plainText, persistedSegments, { silent: true });
    };
  }, [
    isHydrating,
    persistedSegments,
    persistedSignature,
    plainText,
    saveLectureNote,
    user,
  ]);

  const statusLabel = !user
    ? 'Войдите, чтобы сохранять конспект'
    : saveState === 'saving'
    ? 'Автосохранение...'
    : saveState === 'error'
    ? 'Ошибка сохранения'
    : isDirty
    ? 'Есть несохранённые изменения'
    : hasContent
    ? 'Конспект сохранён'
    : 'Автосохранение включено';

  const indicatorClassName = !user
    ? 'bg-white/20 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]'
    : saveState === 'saving'
    ? 'bg-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.15)]'
    : saveState === 'error'
    ? 'bg-rose-400 shadow-[0_0_0_4px_rgba(251,113,133,0.15)]'
    : !isDirty && hasContent
    ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]'
    : 'bg-white/35 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]';

  const markUserEdited = useCallback(() => {
    hasUserEditedRef.current = true;
  }, []);

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setViewMode('plain')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'plain'
                  ? 'bg-white/14 text-white'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              Обычный
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timestamped')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                viewMode === 'timestamped'
                  ? 'bg-white/14 text-white'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              Таймкоды
            </button>
          </div>

          {!user ? (
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Войти
            </button>
          ) : null}
        </div>

        <div className="flex-1 min-h-0">
          <div className="relative h-full min-h-[18rem] rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4">
            <div className="group absolute right-4 top-4 z-10">
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                aria-label={statusLabel}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${indicatorClassName}`} />
              </button>

              <div className="pointer-events-none absolute right-0 top-8 z-10 max-w-[12rem] translate-y-1 rounded-xl border border-white/10 bg-[#11161d]/95 px-3 py-2 text-xs leading-5 text-white/80 opacity-0 shadow-2xl transition duration-150 group-hover:translate-y-0 group-hover:opacity-100">
                {statusLabel}
              </div>
            </div>

            <div className="h-full overflow-y-auto pr-2 pt-1">
              <LectureNoteSegmentsEditor
                composer={composer}
                onComposerChange={(value) => {
                  markUserEdited();
                  updateComposerText(value);
                }}
                onSegmentBlur={removeEmptySegment}
                onSegmentChange={(segmentId, value) => {
                  markUserEdited();
                  updateSegmentText(segmentId, value);
                }}
                onTimestampClick={onTimestampClick}
                segments={segments}
                showTimestamps={viewMode === 'timestamped'}
              />
            </div>
          </div>
        </div>
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

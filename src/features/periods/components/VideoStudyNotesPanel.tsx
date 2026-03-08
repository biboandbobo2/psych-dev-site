import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoginModal from '../../../components/LoginModal';
import { useNotes } from '../../../hooks/useNotes';
import { debugError } from '../../../lib/debug';
import { useAuthStore } from '../../../stores/useAuthStore';

interface VideoStudyNotesPanelProps {
  courseId: string;
  draftContent: string;
  lectureResourceId: string;
  onDraftChange: (value: string) => void;
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function VideoStudyNotesPanel({
  courseId,
  draftContent,
  lectureResourceId,
  onDraftChange,
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

  const [saving, setSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const draftRef = useRef(draftContent);
  const lastSavedContentRef = useRef('');
  const hasUserEditedRef = useRef(false);

  useEffect(() => {
    draftRef.current = draftContent;
  }, [draftContent]);

  const saveLectureNote = useCallback(
    async (nextContent: string, options?: { silent?: boolean }) => {
      if (!user) {
        if (!options?.silent) {
          setIsLoginOpen(true);
        }
        return false;
      }

      if (!nextContent.trim()) {
        if (!options?.silent) {
          setSaveState('idle');
        }
        return false;
      }

      if (!options?.silent) {
        setSaving(true);
        setSaveState('saving');
      }

      try {
        await upsertLectureNote(nextContent, lectureContext);
        lastSavedContentRef.current = nextContent;

        if (!options?.silent) {
          setSaveState('saved');
        }

        return true;
      } catch (error) {
        debugError('[VideoStudyNotesPanel] Failed to save note', error);
        if (!options?.silent) {
          setSaveState('error');
        }
        return false;
      } finally {
        if (!options?.silent) {
          setSaving(false);
        }
      }
    },
    [lectureContext, upsertLectureNote, user]
  );

  useEffect(() => {
    let cancelled = false;

    hasUserEditedRef.current = false;
    setSaving(false);

    if (!user) {
      lastSavedContentRef.current = '';
      setIsHydrating(false);
      setSaveState('idle');
      return undefined;
    }

    const loadSavedNote = async () => {
      setIsHydrating(true);
      try {
        const note = await getLectureNote(lectureContext);
        const savedContent = note?.content ?? '';
        lastSavedContentRef.current = savedContent;

        if (!cancelled && !hasUserEditedRef.current && !draftRef.current.trim()) {
          onDraftChange(savedContent);
        }

        if (!cancelled) {
          setSaveState(savedContent ? 'saved' : 'idle');
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
  }, [getLectureNote, lectureContext, onDraftChange, user]);

  useEffect(() => {
    if (!user || isHydrating) {
      return undefined;
    }

    if (draftContent === lastSavedContentRef.current) {
      if (draftContent.trim()) {
        setSaveState('saved');
      }
      return undefined;
    }

    if (!draftContent.trim()) {
      setSaveState('idle');
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void saveLectureNote(draftContent);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftContent, isHydrating, saveLectureNote, user]);

  useEffect(() => {
    return () => {
      const pendingContent = draftRef.current;
      if (!user || isHydrating || !pendingContent.trim() || pendingContent === lastSavedContentRef.current) {
        return;
      }

      void saveLectureNote(pendingContent, { silent: true });
    };
  }, [isHydrating, saveLectureNote, user]);

  const statusLabel = user
    ? saveState === 'saving'
      ? 'Автосохранение...'
      : saveState === 'saved'
      ? 'Конспект сохранён'
      : saveState === 'error'
      ? 'Ошибка сохранения'
      : 'Есть несохранённые изменения'
    : 'Войдите, чтобы сохранять конспект';

  const indicatorClassName = user
    ? saveState === 'saved'
      ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]'
      : saveState === 'saving'
      ? 'bg-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.15)]'
      : saveState === 'error'
      ? 'bg-rose-400 shadow-[0_0_0_4px_rgba(251,113,133,0.15)]'
      : 'bg-white/35 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]'
    : 'bg-white/20 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]';

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
        <div className="flex-1 pb-4">
          <div className="group relative h-full min-h-[18rem]">
            <button
              type="button"
              className="absolute right-4 top-4 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              aria-label={statusLabel}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${indicatorClassName}`} />
            </button>

            <div className="pointer-events-none absolute right-4 top-12 z-10 max-w-[12rem] translate-y-1 rounded-xl border border-white/10 bg-[#11161d]/95 px-3 py-2 text-xs leading-5 text-white/80 opacity-0 shadow-2xl transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {statusLabel}
            </div>

            <textarea
              value={draftContent}
              onChange={(event) => {
                hasUserEditedRef.current = true;
                onDraftChange(event.target.value);
              }}
              placeholder="Пишите короткий конспект по ходу лекции..."
              className="h-full min-h-[18rem] w-full resize-none rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 pr-12 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[color:var(--accent)] focus:bg-black/30"
              aria-label="Заметки по лекции"
            />
          </div>
        </div>

        {!user ? (
          <div className="mt-auto flex justify-end border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Войти
            </button>
          </div>
        ) : null}
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

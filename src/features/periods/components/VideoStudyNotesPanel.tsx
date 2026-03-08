import { useEffect, useMemo, useRef, useState } from 'react';
import LoginModal from '../../../components/LoginModal';
import { useNotes } from '../../../hooks/useNotes';
import { debugError } from '../../../lib/debug';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AGE_RANGE_LABELS, normalizeAgeRange } from '../../../types/notes';

interface VideoStudyNotesPanelProps {
  courseId: string;
  draftContent: string;
  lectureResourceId: string;
  onDraftChange: (value: string) => void;
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const LECTURE_NOTE_TITLE = 'Заметки по лекции';

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
  const resolvedAgeRange = useMemo(() => normalizeAgeRange(periodId), [periodId]);
  const resolvedPeriodTitle = resolvedAgeRange ? AGE_RANGE_LABELS[resolvedAgeRange] : periodTitle.trim();
  const lectureContext = useMemo(
    () => ({
      courseId,
      periodId: periodId ?? lectureResourceId,
      periodTitle: resolvedPeriodTitle || periodTitle.trim() || videoTitle,
      lectureTitle: videoTitle,
      lectureVideoId: lectureResourceId,
    }),
    [courseId, lectureResourceId, periodId, periodTitle, resolvedPeriodTitle, videoTitle]
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
      setSaveState('loading');
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

    setSaving(true);
    setSaveState('saving');

    const timeoutId = window.setTimeout(async () => {
      try {
        await upsertLectureNote(draftContent, lectureContext);
        lastSavedContentRef.current = draftContent;
        setSaveState('saved');
      } catch (error) {
        debugError('[VideoStudyNotesPanel] Failed to autosave note', error);
        setSaveState('error');
      } finally {
        setSaving(false);
      }
    }, 900);

    return () => {
      setSaving(false);
      window.clearTimeout(timeoutId);
    };
  }, [draftContent, isHydrating, lectureContext, upsertLectureNote, user]);

  const statusLabel = user
    ? saveState === 'loading'
      ? 'Загружаем прошлый конспект...'
      : saveState === 'saving'
      ? 'Автосохранение...'
      : saveState === 'saved'
      ? 'Сохранено в /notes'
      : saveState === 'error'
      ? 'Ошибка автосохранения'
      : 'Автосохранение включено'
    : 'Нужен вход для автосохранения';

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col px-4 py-4 text-white lg:px-5 lg:py-5">
        <div className="border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Режим конспекта
            </p>
            {resolvedPeriodTitle ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">
                {resolvedPeriodTitle}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{LECTURE_NOTE_TITLE}</h3>
          <p className="mt-2 text-sm leading-6 text-white/55 line-clamp-2">{videoTitle}</p>
        </div>

        <div className="flex-1 py-4">
          <textarea
            value={draftContent}
            onChange={(event) => {
              hasUserEditedRef.current = true;
              onDraftChange(event.target.value);
            }}
            placeholder="Пишите короткий конспект по ходу лекции..."
            className="h-full min-h-[18rem] w-full resize-none rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[color:var(--accent)] focus:bg-black/30"
            aria-label="Заметки по лекции"
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="text-xs text-white/55">{statusLabel}</span>
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
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

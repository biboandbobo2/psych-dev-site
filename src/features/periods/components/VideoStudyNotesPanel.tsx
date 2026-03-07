import { useEffect, useMemo, useState } from 'react';
import LoginModal from '../../../components/LoginModal';
import { useNotes } from '../../../hooks/useNotes';
import { debugError } from '../../../lib/debug';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AGE_RANGE_LABELS, normalizeAgeRange } from '../../../types/notes';

interface VideoStudyNotesPanelProps {
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}

type SaveState = 'idle' | 'saved';

const LECTURE_NOTE_TITLE = 'Заметки по лекции';

export function VideoStudyNotesPanel({
  periodId,
  periodTitle,
  videoTitle,
}: VideoStudyNotesPanelProps) {
  const user = useAuthStore((state) => state.user);
  const { createNote } = useNotes(undefined, { subscribe: false });
  const resolvedAgeRange = useMemo(() => normalizeAgeRange(periodId), [periodId]);
  const resolvedPeriodTitle = resolvedAgeRange ? AGE_RANGE_LABELS[resolvedAgeRange] : periodTitle.trim();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    setContent('');
    setSaving(false);
    setSaveState('idle');
  }, [resolvedAgeRange, periodTitle, videoTitle]);

  const handleSave = async () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      alert('Напишите заметку');
      return;
    }

    setSaving(true);
    try {
      await createNote(LECTURE_NOTE_TITLE, trimmedContent, resolvedAgeRange, null, null);
      setContent('');
      setSaveState('saved');
    } catch (error) {
      debugError('[VideoStudyNotesPanel] Failed to save note', error);
      alert('Ошибка при сохранении заметки');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <aside className="rounded-[1.4rem] border border-border/70 bg-card/95 p-4 shadow-brand backdrop-blur-sm lg:h-full lg:min-h-[28rem]">
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-fg">{LECTURE_NOTE_TITLE}</h3>
            {resolvedPeriodTitle ? (
              <span className="rounded-full border border-border/70 bg-card2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                {resolvedPeriodTitle}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-muted line-clamp-2">{videoTitle}</p>
        </div>

        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setSaveState('idle');
          }}
          placeholder="Пишите короткий конспект по ходу лекции..."
          className="min-h-[18rem] w-full resize-none rounded-[1.1rem] border border-border/80 bg-white/80 px-4 py-3 text-sm leading-7 text-fg outline-none transition placeholder:text-muted focus:border-[color:var(--accent)] focus:bg-white lg:min-h-[22rem]"
          disabled={saving}
          aria-label="Заметки по лекции"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {saveState === 'saved'
              ? 'Сохранено в /notes'
              : user
              ? 'Сохранится в заметках'
              : 'Нужен вход для сохранения'}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : user ? 'Сохранить' : 'Войти'}
          </button>
        </div>
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

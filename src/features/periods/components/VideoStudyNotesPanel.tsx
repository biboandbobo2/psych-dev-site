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
      <aside className="flex h-full min-h-[22rem] flex-col px-4 py-4 text-white lg:min-h-[calc(100vh-16rem)] lg:px-5 lg:py-5">
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
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setSaveState('idle');
            }}
            placeholder="Пишите короткий конспект по ходу лекции..."
            className="h-full min-h-[18rem] w-full resize-none rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[color:var(--accent)] focus:bg-black/30"
            disabled={saving}
            aria-label="Заметки по лекции"
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="text-xs text-white/55">
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

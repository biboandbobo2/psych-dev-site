import { useEffect, useMemo, useState } from 'react';
import LoginModal from '../../../components/LoginModal';
import { NoteFormFields } from '../../../components/NoteFormFields';
import { useNotes } from '../../../hooks/useNotes';
import { debugError } from '../../../lib/debug';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AGE_RANGE_LABELS, type AgeRange, normalizeAgeRange } from '../../../types/notes';

interface VideoStudyNotesPanelProps {
  periodId?: string;
  periodTitle: string;
  videoTitle: string;
}

type SaveState = 'idle' | 'saved';

const buildDefaultTitle = (videoTitle: string, periodTitle: string) => {
  const normalizedVideoTitle = videoTitle.trim();
  const normalizedPeriodTitle = periodTitle.trim();

  if (!normalizedVideoTitle) return normalizedPeriodTitle || 'Заметка по лекции';
  if (!normalizedPeriodTitle || normalizedVideoTitle === normalizedPeriodTitle) {
    return normalizedVideoTitle;
  }

  return `${normalizedPeriodTitle}: ${normalizedVideoTitle}`;
};

export function VideoStudyNotesPanel({
  periodId,
  periodTitle,
  videoTitle,
}: VideoStudyNotesPanelProps) {
  const user = useAuthStore((state) => state.user);
  const { createNote } = useNotes(undefined, { subscribe: false });
  const resolvedAgeRange = useMemo(() => normalizeAgeRange(periodId), [periodId]);
  const defaultTitle = useMemo(
    () => buildDefaultTitle(videoTitle, periodTitle),
    [periodTitle, videoTitle]
  );

  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState('');
  const [ageRange, setAgeRange] = useState<AgeRange | null>(resolvedAgeRange);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    setTitle(defaultTitle);
    setContent('');
    setAgeRange(resolvedAgeRange);
    setTopicId(null);
    setTopicTitle(null);
    setSaving(false);
    setSaveState('idle');
  }, [defaultTitle, resolvedAgeRange]);

  const handleTopicSelect = (newTopicId: string | null, newTopicTitle: string | null) => {
    setTopicId(newTopicId);
    setTopicTitle(newTopicTitle);

    if (newTopicTitle && !title.trim()) {
      setTitle(newTopicTitle);
    }
  };

  const handleReset = () => {
    setTitle(defaultTitle);
    setContent('');
    setTopicId(null);
    setTopicTitle(null);
    setAgeRange(resolvedAgeRange);
    setSaveState('idle');
  };

  const handleSave = async () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    if (!title.trim()) {
      alert('Введите название заметки');
      return;
    }

    setSaving(true);
    try {
      await createNote(title.trim(), content, ageRange, topicId, topicTitle);
      handleReset();
      setSaveState('saved');
    } catch (error) {
      debugError('[VideoStudyNotesPanel] Failed to save note', error);
      alert('Ошибка при сохранении заметки');
    } finally {
      setSaving(false);
    }
  };

  const helperText = user
    ? saveState === 'saved'
      ? 'Заметка сохранена. Можно продолжать конспект.'
      : 'Заметка сохранится в разделе /notes.'
    : 'Войдите через Google, чтобы сохранять заметки из режима конспекта.';

  return (
    <>
      <aside className="rounded-[1.75rem] border border-border/70 bg-card2 p-4 shadow-brand xl:sticky xl:top-24 xl:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Режим конспекта
            </p>
            <h3 className="text-xl font-semibold leading-tight text-fg">Пишите заметки рядом с видео</h3>
            <p className="text-sm leading-6 text-muted">
              Плеер остаётся под рукой, а конспект сразу уходит в ваши заметки.
            </p>
          </div>
          {ageRange ? (
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
              {AGE_RANGE_LABELS[ageRange]}
            </span>
          ) : null}
        </div>

        <NoteFormFields
          title={title}
          content={content}
          ageRange={ageRange}
          topicId={topicId}
          saving={saving}
          titlePlaceholder="Например: Кризис трёх лет"
          contentPlaceholder="Фиксируйте ключевые идеи, инсайты и вопросы по ходу лекции..."
          onTitleChange={(value) => {
            setTitle(value);
            setSaveState('idle');
          }}
          onContentChange={(value) => {
            setContent(value);
            setSaveState('idle');
          }}
          onAgeRangeChange={(value) => {
            setAgeRange(value);
            setSaveState('idle');
          }}
          onTopicSelect={handleTopicSelect}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-sm leading-6 text-muted">{helperText}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-fg transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
            >
              Очистить
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : user ? 'Сохранить заметку' : 'Войти и сохранить'}
            </button>
          </div>
        </div>
      </aside>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

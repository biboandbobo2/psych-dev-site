import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { NoteFormFields } from './NoteFormFields';
import { SaveNoteAsEventButton } from './SaveNoteAsEventButton';
import { useTimeline } from '../hooks/useTimeline';
import { debugError } from '../lib/debug';

interface NoteModalProps {
  isOpen: boolean;
  noteId?: string;
  /**
   * Конспект лекции: курс, занятие и заголовок заданы лекцией и не
   * редактируются; `lessonPath` — ссылка «Открыть в лекции» (deep-link в
   * режим конспекта), null — путь неизвестен.
   */
  lecture?: { lessonPath: string | null } | null;
  initialTitle?: string;
  initialContent?: string;
  initialCourseId?: string | null;
  initialPeriodId?: string | null;
  initialPeriodTitle?: string | null;
  initialTopicId?: string | null;
  initialTopicTitle?: string | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    courseId: string | null;
    periodId: string | null;
    periodTitle: string | null;
    topicId: string | null;
    topicTitle: string | null;
  }) => Promise<void>;
}

export function NoteModal({
  isOpen,
  noteId,
  initialTitle = '',
  initialContent = '',
  initialCourseId = null,
  initialPeriodId = null,
  initialPeriodTitle = null,
  initialTopicId = null,
  initialTopicTitle = null,
  lecture = null,
  onClose,
  onSave,
}: NoteModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [courseId, setCourseId] = useState<string | null>(initialCourseId);
  const [periodId, setPeriodId] = useState<string | null>(initialPeriodId);
  const [periodTitle, setPeriodTitle] = useState<string | null>(initialPeriodTitle);
  const [topicId, setTopicId] = useState<string | null>(initialTopicId);
  const [topicTitle, setTopicTitle] = useState<string | null>(initialTopicTitle);
  const [saving, setSaving] = useState(false);
  // Валидация и ошибки сохранения — строкой в модалке, не alert().
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { addEventToTimeline } = useTimeline();

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialTitle);
    setContent(initialContent);
    setCourseId(initialCourseId);
    setPeriodId(initialPeriodId);
    setPeriodTitle(initialPeriodTitle);
    setTopicId(initialTopicId);
    setTopicTitle(initialTopicTitle);
    setSaving(false);
    setError(null);
    setNotice(null);
  }, [isOpen, initialTitle, initialContent, initialCourseId, initialPeriodId, initialPeriodTitle, initialTopicId, initialTopicTitle]);

  const headerTitle = useMemo(
    () => (lecture ? 'Конспект лекции' : noteId ? 'Редактировать заметку' : 'Новая заметка'),
    [lecture, noteId]
  );

  const handleSaveClick = async () => {
    if (!title.trim()) {
      setError('Введите название заметки');
      return;
    }

    if (!courseId || !periodId || !periodTitle) {
      setError('Выберите курс и занятие');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title,
        content,
        courseId,
        periodId,
        periodTitle,
        topicId,
        topicTitle: topicTitle ?? null,
      });
      setSaving(false);
      onClose();
    } catch (saveError) {
      debugError('Error saving note:', saveError);
      setError('Не удалось сохранить заметку. Проверьте связь и попробуйте ещё раз.');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-card shadow-2xl">
        <NoteModalHeader title={headerTitle} onClose={onClose} disabled={saving} />

        <div className="space-y-4 p-6">
          {lecture ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card2 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-fg">{title}</p>
                <p className="text-muted">
                  {periodTitle} · правки попадут и в конспект под видео
                </p>
              </div>
              {lecture.lessonPath ? (
                <Link to={lecture.lessonPath} className="font-medium text-accent hover:underline">
                  Открыть в лекции
                </Link>
              ) : null}
            </div>
          ) : null}
          <NoteFormFields
            title={title}
            content={content}
            selectedCourseId={courseId}
            selectedPeriodId={periodId}
            saving={saving}
            autoFocus
            showContext={!lecture}
            contentLabel={lecture ? 'Конспект' : undefined}
            onTitleChange={setTitle}
            onContentChange={setContent}
            onCourseChange={setCourseId}
            onPeriodChange={(nextPeriodId, nextPeriodTitle) => {
              setPeriodId(nextPeriodId);
              setPeriodTitle(nextPeriodTitle);
              setTopicId(null);
              setTopicTitle(null);
            }}
          />
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="text-sm font-medium text-accent">
              {notice}
            </p>
          ) : null}
        </div>

        <NoteModalFooter
          onClose={onClose}
          onSave={handleSaveClick}
          saving={saving}
          noteTitle={title}
          noteContent={content}
          // «На таймлайн» имеет смысл только в курсе про возрастные периоды.
          canPinToTimeline={courseId === 'development'}
          addEventToTimeline={addEventToTimeline}
          onPinnedToTimeline={() => setNotice('Событие добавлено на таймлайн')}
        />
      </div>
    </div>
  );
}

function NoteModalHeader({
  title,
  onClose,
  disabled,
}: {
  title: string;
  onClose: () => void;
  disabled: boolean;
}) {
  return (
    <header className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <h2 className="text-xl font-bold text-fg">{title}</h2>
      <button
        onClick={onClose}
        disabled={disabled}
        className="text-2xl text-muted transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Закрыть"
      >
        ×
      </button>
    </header>
  );
}

function NoteModalFooter({
  onClose,
  onSave,
  saving,
  noteTitle,
  noteContent,
  canPinToTimeline,
  addEventToTimeline,
  onPinnedToTimeline,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  noteTitle: string;
  noteContent: string;
  canPinToTimeline: boolean;
  addEventToTimeline: ReturnType<typeof useTimeline>['addEventToTimeline'];
  onPinnedToTimeline: () => void;
}) {
  return (
    <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-card2 px-6 py-4">
      {canPinToTimeline ? (
        <div className="mr-auto">
          <SaveNoteAsEventButton
            noteTitle={noteTitle}
            noteContent={noteContent}
            onEventCreate={async (event) => {
              await addEventToTimeline(event);
            }}
            onSuccess={onPinnedToTimeline}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-md border border-border px-4 py-2 text-fg transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Сохранение...
            </>
          ) : (
            'Сохранить'
          )}
        </button>
      </div>
    </footer>
  );
}

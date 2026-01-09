import { useEffect, useMemo, useState } from 'react';
import { type AgeRange } from '../types/notes';
import { TopicSelector } from './TopicSelector';
import { SaveNoteAsEventButton } from './SaveNoteAsEventButton';
import { useTimeline } from '../hooks/useTimeline';
import { debugError } from '../lib/debug';

interface NoteModalProps {
  isOpen: boolean;
  noteId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialAgeRange?: AgeRange | null;
  initialTopicId?: string | null;
  initialTopicTitle?: string | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    ageRange: AgeRange | null;
    topicId: string | null;
    topicTitle: string | null;
  }) => Promise<void>;
}

export function NoteModal({
  isOpen,
  noteId,
  initialTitle = '',
  initialContent = '',
  initialAgeRange = null,
  initialTopicId = null,
  initialTopicTitle = null,
  onClose,
  onSave,
}: NoteModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(initialAgeRange);
  const [topicId, setTopicId] = useState<string | null>(initialTopicId);
  const [topicTitle, setTopicTitle] = useState<string | null>(initialTopicTitle);
  const [saving, setSaving] = useState(false);

  const { addEventToTimeline } = useTimeline();

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialTitle);
    setContent(initialContent);
    setAgeRange(initialAgeRange);
    setTopicId(initialTopicId);
    setTopicTitle(initialTopicTitle);
    setSaving(false);
  }, [isOpen, initialTitle, initialContent, initialAgeRange, initialTopicId, initialTopicTitle]);

  const headerTitle = useMemo(() => (noteId ? 'Редактировать заметку' : 'Новая заметка'), [noteId]);

  const handleSaveClick = async () => {
    if (!title.trim()) {
      alert('Введите название заметки');
      return;
    }

    setSaving(true);
    try {
      await onSave({ title, content, ageRange, topicId, topicTitle: topicTitle ?? null });
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSaving(false);
      onClose();
    } catch (error) {
      debugError('Error saving note:', error);
      alert('Ошибка при сохранении заметки: ' + (error as Error).message);
      setSaving(false);
    }
  };

  const handleTopicSelect = (newTopicId: string | null, newTopicTitle: string | null) => {
    setTopicId(newTopicId);
    setTopicTitle(newTopicTitle);
    if (newTopicTitle && !title.trim()) {
      setTitle(newTopicTitle);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <NoteModalHeader title={headerTitle} onClose={onClose} disabled={saving} />

        <div className="space-y-4 p-6">
          <TopicSelector
            selectedAgeRange={ageRange}
            selectedTopicId={topicId}
            onAgeRangeChange={setAgeRange}
            onTopicSelect={handleTopicSelect}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Заголовок заметки</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Введите заголовок..."
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Ваши размышления</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Напишите свои мысли..."
              className="min-h-[300px] w-full resize-y rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>
        </div>

        <NoteModalFooter
          onClose={onClose}
          onSave={handleSaveClick}
          saving={saving}
          noteTitle={title}
          noteContent={content}
          addEventToTimeline={addEventToTimeline}
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
    <header className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <button
        onClick={onClose}
        disabled={disabled}
        className="text-2xl text-gray-400 transition hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
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
  addEventToTimeline,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  noteTitle: string;
  noteContent: string;
  addEventToTimeline: ReturnType<typeof useTimeline>['addEventToTimeline'];
}) {
  return (
    <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4">
      <SaveNoteAsEventButton
        noteTitle={noteTitle}
        noteContent={noteContent}
        onEventCreate={addEventToTimeline}
        onSuccess={() => alert('Событие добавлено на таймлайн!')}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-md border border-gray-300 px-4 py-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
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

import { useState } from 'react';
import { useNotes } from '../hooks/useNotes';
import { type AgeRange, AGE_RANGE_LABELS, type Note } from '../types/notes';
import { NoteModal } from '../components/NoteModal';

export default function Notes() {
  const [filterAgeRange, setFilterAgeRange] = useState<AgeRange | null>(null);
  const { notes, loading, error, createNote, updateNote, deleteNote } = useNotes(filterAgeRange);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const handleSaveNote = async (data: {
    title: string;
    content: string;
    ageRange: AgeRange | null;
    topicId: string | null;
  }) => {
    try {
      if (editingNote) {
        console.log('=== Updating existing note ===');
        console.log('Note ID:', editingNote.id);
        console.log('Updates:', data);
        await updateNote(editingNote.id, data);
      } else {
        console.log('=== Creating new note ===');
        console.log('Data:', data);
        await createNote(data.title, data.content, data.ageRange, data.topicId);
      }
      console.log('✅ Note operation completed successfully');
    } catch (error) {
      console.error('❌ Error in handleSaveNote:', error);
      alert('Ошибка при сохранении заметки: ' + (error as Error).message);
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Удалить заметку?')) return;
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении заметки');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="text-gray-600">Загрузка заметок...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 text-xl font-bold text-red-900">❌ Ошибка загрузки заметок</h2>
            <p className="mb-4 text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">📝 Мои заметки</h1>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={filterAgeRange ?? ''}
            onChange={(event) => {
              const value = event.target.value as AgeRange | '';
              setFilterAgeRange(value === '' ? null : value);
            }}
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
          >
            <option value="">Все заметки</option>
            {Object.entries(AGE_RANGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateNote}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            + Новая заметка
          </button>
        </div>

        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="rounded-lg bg-gray-50 py-12 text-center text-gray-600">
              <p className="font-medium">У вас пока нет заметок</p>
              <p className="mt-1 text-sm text-gray-500">Создайте первую заметку для размышлений!</p>
            </div>
          ) : (
            notes.map((note) => (
              <article
                key={note.id}
                className="rounded-lg bg-white p-5 shadow transition hover:shadow-md"
              >
                <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{note.title || 'Без названия'}</h3>
                    {note.ageRange && (
                      <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {AGE_RANGE_LABELS[note.ageRange]}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditNote(note)}
                      className="rounded bg-gray-100 px-3 py-1 text-sm transition hover:bg-gray-200"
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 transition hover:bg-red-200"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </header>
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {note.content || 'Пустая заметка'}
                </p>
                <footer className="mt-3 text-xs text-gray-400">
                  Обновлено: {note.updatedAt ? note.updatedAt.toLocaleString('ru-RU') : '—'}
                </footer>
              </article>
            ))
          )}
        </div>
      </div>

      <NoteModal
        isOpen={isModalOpen}
        noteId={editingNote?.id}
        initialTitle={editingNote?.title}
        initialContent={editingNote?.content}
        initialAgeRange={editingNote?.ageRange ?? filterAgeRange}
        initialTopicId={editingNote?.topicId}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
      />
    </div>
  );
}

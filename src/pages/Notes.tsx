import { useEffect, useMemo, useState } from 'react';
import { useNotes } from '../hooks/useNotes';
import { type AgeRange, type Note } from '../types/notes';
import { sortNotes, type SortOption } from '../utils/sortNotes';
import { NotesHeader } from './notes/components/NotesHeader';
import { NotesList } from './notes/components/NotesList';
import { NotesEmpty } from './notes/components/NotesEmpty';
import { NotesEditor } from './notes/components/NotesEditor';
import { debugError } from '../lib/debug';

const SORT_STORAGE_KEY = 'notesSortPreference';

export default function Notes() {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | AgeRange>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window === 'undefined') return 'date-new';
    const saved = window.localStorage.getItem(SORT_STORAGE_KEY) as SortOption | null;
    return saved ?? 'date-new';
  });
  const [showStats, setShowStats] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SORT_STORAGE_KEY, sortBy);
  }, [sortBy]);

  const activeAgeRange = selectedPeriod === 'all' ? null : selectedPeriod;
  const { notes, loading, error, createNote, updateNote, deleteNote } = useNotes(activeAgeRange);

  const sortedNotes = useMemo(() => sortNotes(notes, sortBy), [notes, sortBy]);

  const displayNotes = useMemo(() => {
    if (!searchQuery.trim()) return sortedNotes;
    const term = searchQuery.trim().toLowerCase();
    return sortedNotes.filter((note) => {
      const haystack = [note.title, note.content, note.periodTitle, note.topicTitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [sortedNotes, searchQuery]);

  const totalNotes = notes.length;
  const studiedPeriods = useMemo(() => {
    const set = new Set(
      notes
        .map((note) => note.periodId ?? note.ageRange ?? null)
        .filter(Boolean) as string[]
    );
    return set.size;
  }, [notes]);

  const createdToday = useMemo(() => {
    const today = new Date();
    return notes.filter((note) => isSameDay(note.createdAt, today)).length;
  }, [notes]);

  const createdThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return notes.filter((note) => getNoteDate(note.createdAt) >= weekAgo).length;
  }, [notes]);

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
    topicTitle: string | null;
  }) => {
    try {
      if (editingNote) {
        await updateNote(editingNote.id, data);
      } else {
        await createNote(data.title, data.content, data.ageRange, data.topicId, data.topicTitle);
      }
    } catch (err) {
      debugError('Error saving note', err);
      alert('Ошибка при сохранении заметки');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Удалить заметку?')) return;
    try {
      await deleteNote(noteId);
    } catch (err) {
      debugError(err);
      alert('Ошибка при удалении заметки');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
        <p className="text-muted">Загрузка заметок...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 text-xl font-semibold text-red-900">❌ Ошибка загрузки заметок</h2>
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total: totalNotes,
    periods: studiedPeriods,
    today: createdToday,
    week: createdThisWeek,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <NotesHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        showStats={showStats}
        onToggleStats={() => setShowStats((prev) => !prev)}
        onCreate={handleCreateNote}
        notesForExport={displayNotes}
      />

      {displayNotes.length === 0 ? (
        <NotesEmpty
          hasQuery={Boolean(searchQuery.trim())}
          query={searchQuery}
          onResetSearch={() => setSearchQuery('')}
          onCreate={handleCreateNote}
        />
      ) : (
        <NotesList
          notes={displayNotes}
          showStats={showStats}
          stats={stats}
          onEdit={handleEditNote}
          onDelete={handleDeleteNote}
        />
      )}

      <NotesEditor
        isOpen={isModalOpen}
        editingNote={editingNote}
        activeAgeRange={selectedPeriod === 'all' ? null : selectedPeriod}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
      />
    </div>
  );
}

function getNoteDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

function isSameDay(dateA: Date | string, dateB: Date): boolean {
  const a = getNoteDate(dateA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

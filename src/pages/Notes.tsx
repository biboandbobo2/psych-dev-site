import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotes } from '../hooks/useNotes';
import { useActiveCourse, usePublishedLessonOptions } from '../hooks';
import { buildNotePeriodKey, type Note } from '../types/notes';
import { sortNotes, type SortOption } from '../utils/sortNotes';
import { NotesHeader } from './notes/components/NotesHeader';
import { NotesList } from './notes/components/NotesList';
import { NotesEmpty } from './notes/components/NotesEmpty';
import { NotesEditor } from './notes/components/NotesEditor';
import { NotesSidebar } from './notes/components/NotesSidebar';
import { debugError } from '../lib/debug';
import { useCourseStore } from '../stores';
import type { CourseType } from '../types/tests';

const SORT_STORAGE_KEY = 'notesSortPreference';

export default function Notes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window === 'undefined') return 'date-new';
    const saved = window.localStorage.getItem(SORT_STORAGE_KEY) as SortOption | null;
    return saved ?? 'date-new';
  });
  const [showStats, setShowStats] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { currentCourse, setCurrentCourse } = useCourseStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SORT_STORAGE_KEY, sortBy);
  }, [sortBy]);

  const { courseOptions, lessonsByCourse, loading: lessonsLoading } = usePublishedLessonOptions();
  const activeCourse = useActiveCourse(courseOptions, lessonsLoading);
  const courseParam = searchParams.get('course');
  const periodParam = searchParams.get('period');
  const activeLessons = lessonsByCourse[activeCourse] ?? [];
  const selectedPeriod =
    periodParam && activeLessons.some((lesson) => lesson.periodKey === periodParam)
      ? periodParam
      : 'all';
  const selectedLesson =
    selectedPeriod === 'all'
      ? null
      : activeLessons.find((lesson) => lesson.periodKey === selectedPeriod) ?? null;
  const { notes, loading, error, createManualNote, updateNote, deleteNote } = useNotes();

  useEffect(() => {
    if (!courseParam || courseParam === currentCourse || !courseOptions.some((course) => course.id === courseParam)) {
      return;
    }

    setCurrentCourse(courseParam as CourseType);
  }, [courseOptions, courseParam, currentCourse, setCurrentCourse]);

  useEffect(() => {
    if (lessonsLoading || !courseOptions.length) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    let changed = false;

    if (courseParam !== activeCourse) {
      nextParams.set('course', activeCourse);
      changed = true;
    }

    if (periodParam && !activeLessons.some((lesson) => lesson.periodKey === periodParam)) {
      nextParams.delete('period');
      changed = true;
    }

    if (changed) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    activeCourse,
    activeLessons,
    courseOptions.length,
    courseParam,
    lessonsLoading,
    periodParam,
    searchParams,
    setSearchParams,
  ]);

  const scopedNotes = useMemo(() => {
    const courseNotes = notes.filter((note) => note.courseId === activeCourse);
    if (selectedPeriod === 'all') {
      return courseNotes;
    }

    return courseNotes.filter((note) => note.periodKey === selectedPeriod);
  }, [activeCourse, notes, selectedPeriod]);

  const sortedNotes = useMemo(() => sortNotes(scopedNotes, sortBy), [scopedNotes, sortBy]);

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

  const totalNotes = scopedNotes.length;
  const studiedPeriods = useMemo(() => {
    const set = new Set(
      scopedNotes
        .map((note) => note.periodId ?? note.ageRange ?? null)
        .filter(Boolean) as string[]
    );
    return set.size;
  }, [scopedNotes]);

  const createdToday = useMemo(() => {
    const today = new Date();
    return scopedNotes.filter((note) => isSameDay(note.createdAt, today)).length;
  }, [scopedNotes]);

  const createdThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return scopedNotes.filter((note) => getNoteDate(note.createdAt) >= weekAgo).length;
  }, [scopedNotes]);

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
    courseId: string | null;
    periodId: string | null;
    periodTitle: string | null;
    topicId: string | null;
    topicTitle: string | null;
  }) => {
    try {
      if (!data.courseId || !data.periodId || !data.periodTitle) {
        throw new Error('Выберите курс и занятие');
      }

      if (editingNote) {
        await updateNote(editingNote.id, {
          title: data.title,
          content: data.content,
          courseId: data.courseId,
          periodId: data.periodId,
          periodTitle: data.periodTitle,
          topicId: data.topicId,
          topicTitle: data.topicTitle,
          noteScope: editingNote.noteScope ?? 'manual',
        });
      } else {
        await createManualNote(
          data.title,
          data.content,
          {
            courseId: data.courseId,
            periodId: data.periodId,
            periodTitle: data.periodTitle,
          },
          data.topicId,
          data.topicTitle
        );
      }

      setCurrentCourse(data.courseId as CourseType);
      setSearchParams(
        {
          course: data.courseId,
          period: buildNotePeriodKey(data.courseId, data.periodId),
        },
        { replace: true }
      );
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
  const activeCourseLabel =
    courseOptions.find((course) => course.id === activeCourse)?.name ?? activeCourse;

  const handleCourseSelect = (courseId: string) => {
    setCurrentCourse(courseId as CourseType);
    setSearchParams({ course: courseId }, { replace: true });
  };

  const handleLessonSelect = (periodKey: 'all' | string) => {
    if (periodKey === 'all') {
      setSearchParams({ course: activeCourse }, { replace: true });
      return;
    }

    setSearchParams({ course: activeCourse, period: periodKey }, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <aside className="lg:w-80 lg:flex-shrink-0 lg:self-start lg:sticky lg:top-8">
          <NotesSidebar
            activeCourseId={activeCourse}
            activeLessonKey={selectedPeriod}
            courses={courseOptions}
            lessons={activeLessons}
            onCourseSelect={handleCourseSelect}
            onLessonSelect={handleLessonSelect}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <NotesHeader
            activeCourseLabel={activeCourseLabel}
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
            defaultCourseId={activeCourse}
            defaultPeriodId={selectedLesson?.periodId ?? null}
            defaultPeriodTitle={selectedLesson?.periodTitle ?? null}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveNote}
          />
        </div>
      </div>
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

import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useNotes } from '../hooks/useNotes';
import { useActiveCourse, usePublishedLessonOptions } from '../hooks';
import {
  buildLectureSegmentsFromContent,
  buildNotePeriodKey,
  normalizeAgeRange,
  type Note,
} from '../types/notes';
import { getEffectivePeriodKey, sortNotes, type SortOption } from '../utils/sortNotes';
import { getCourseLessonPath } from '../lib/courseNavItems';
import { NotesHeader } from './notes/components/NotesHeader';
import { NotesList } from './notes/components/NotesList';
import { NotesEmpty } from './notes/components/NotesEmpty';
import { NotesEditor } from './notes/components/NotesEditor';
import { NoteDeleteConfirm } from './notes/components/NoteDeleteConfirm';
import { debugError } from '../lib/debug';
import { useCourseStore } from '../stores';
import type { CourseType } from '../types/tests';

const SORT_STORAGE_KEY = 'notesSortPreference';

export default function Notes() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window === 'undefined') return 'date-new';
    const saved = window.localStorage.getItem(SORT_STORAGE_KEY) as SortOption | null;
    return saved ?? 'date-new';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const { currentCourse, setCurrentCourse } = useCourseStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SORT_STORAGE_KEY, sortBy);
  }, [sortBy]);

  const { courseOptions, lessonsByCourse, loading: lessonsLoading } = usePublishedLessonOptions();
  const activeCourse = useActiveCourse(courseOptions, lessonsLoading);
  const courseParam = searchParams.get('course');
  const activeLessons = useMemo(() => lessonsByCourse[activeCourse] ?? [], [lessonsByCourse, activeCourse]);
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
    if (selectedPeriod === 'all') {
      return;
    }

    const hasSelectedLesson = activeLessons.some((lesson) => lesson.periodKey === selectedPeriod);
    if (!hasSelectedLesson) {
      setSelectedPeriod('all');
    }
  }, [activeLessons, selectedPeriod]);

  const scopedNotes = useMemo(() => {
    const courseNotes = notes.filter((note) => isNoteInCourse(note, activeCourse));
    if (selectedPeriod === 'all') {
      return courseNotes;
    }

    return courseNotes.filter((note) => getEffectivePeriodKey(note) === selectedPeriod);
  }, [activeCourse, notes, selectedPeriod]);

  const sortedNotes = useMemo(
    () => sortNotes(scopedNotes, sortBy, activeLessons.map((lesson) => lesson.periodKey)),
    [activeLessons, scopedNotes, sortBy]
  );

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

  const summary = useMemo(() => {
    if (!scopedNotes.length) return '';
    const lessonCount = new Set(
      scopedNotes.map(getEffectivePeriodKey).filter(Boolean) as string[]
    ).size;
    const notesPart = pluralize(scopedNotes.length, ['заметка', 'заметки', 'заметок']);
    return lessonCount
      ? `${notesPart} · ${pluralize(lessonCount, ['занятие', 'занятия', 'занятий'])}`
      : notesPart;
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
    if (!data.courseId || !data.periodId || !data.periodTitle) {
      throw new Error('Выберите курс и занятие');
    }

    if (editingNote?.noteScope === 'lecture') {
      // Конспект: курс, занятие и заголовок принадлежат лекции; правится
      // только текст, и он же пересобирается в сегменты (иначе оверлей
      // показал бы старые сегменты и перетёр бы правку автосейвом).
      await updateNote(editingNote.id, {
        content: data.content,
        lectureSegments: buildLectureSegmentsFromContent(
          data.content,
          editingNote.lectureSegments ?? []
        ),
      });
    } else if (editingNote) {
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
    setSelectedPeriod(buildNotePeriodKey(data.courseId, data.periodId));
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteNote(pendingDelete.id);
      setPageError(null);
    } catch (err) {
      debugError(err);
      setPageError('Не удалось удалить заметку. Проверьте связь и попробуйте ещё раз.');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (!lessonsLoading && !currentCourse && !courseParam) {
    // Страница всегда открывается в контексте курса. Если курс не выбран
    // (прямой заход без ?course=) — возвращаем на «Дом».
    return <Navigate to="/home" replace />;
  }

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

  const lectureLessonPath =
    editingNote?.noteScope === 'lecture' ? buildLectureLaunchPath(editingNote) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <NotesHeader
        lessons={activeLessons}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        onCreate={handleCreateNote}
        notesForExport={displayNotes}
        summary={summary}
      />

      {pageError ? (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          <span>{pageError}</span>
          <button onClick={() => setPageError(null)} aria-label="Скрыть сообщение" className="text-red-700/70 hover:text-red-700">
            ✕
          </button>
        </div>
      ) : null}

      {displayNotes.length === 0 ? (
        <NotesEmpty
          hasQuery={Boolean(searchQuery.trim())}
          query={searchQuery}
          onResetSearch={() => setSearchQuery('')}
          onCreate={handleCreateNote}
        />
      ) : (
        <NotesList notes={displayNotes} onEdit={handleEditNote} onDelete={setPendingDelete} />
      )}

      <NoteDeleteConfirm
        note={pendingDelete}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <NotesEditor
        isOpen={isModalOpen}
        editingNote={editingNote}
        lectureLessonPath={lectureLessonPath}
        defaultCourseId={activeCourse}
        defaultPeriodId={selectedLesson?.periodId ?? null}
        defaultPeriodTitle={selectedLesson?.periodTitle ?? null}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
      />
    </div>
  );
}

function isNoteInCourse(note: Note, courseId: string) {
  if (note.courseId === courseId) {
    return true;
  }

  if (courseId !== 'development') {
    return false;
  }

  if (note.courseId === null || note.courseId === undefined) {
    return normalizeAgeRange(note.ageRange ?? note.periodId ?? null) !== null;
  }

  return false;
}

/**
 * Deep-link на страницу занятия с автооткрытием режима конспекта — тот же
 * контракт `?study=1&panel=notes&video=`, что у «Продолжить» (courseVideoResume).
 */
function buildLectureLaunchPath(note: Note): string | null {
  if (!note.courseId || !note.periodId) {
    return null;
  }

  const lessonPath = getCourseLessonPath(note.courseId, note.periodId);
  if (!note.lectureVideoId) {
    return lessonPath;
  }

  const params = new URLSearchParams({ study: '1', panel: 'notes', video: note.lectureVideoId });
  return `${lessonPath}?${params.toString()}`;
}

function pluralize(count: number, [one, few, many]: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
      ? few
      : many;
  return `${count} ${word}`;
}

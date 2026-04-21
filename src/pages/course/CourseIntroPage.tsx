import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { SITE_NAME } from '../../routes';
import { useCourses } from '../../hooks/useCourses';
import { useAuth } from '../../auth/AuthProvider';
import { useNotes } from '../../hooks/useNotes';
import { getPublishedTests } from '../../lib/tests';
import { getAllTestResults, groupResultsByTest } from '../../lib/testResults';
import type { Test } from '../../types/tests';
import type { TestAttemptSummary } from '../../types/testResults';
import { PageLoader } from '../../components/ui';

interface CourseIntroPageProps {
  courseId: string;
}

type ExpandedSection = 'lesson-tests' | 'course-tests' | 'notes' | null;

interface SpecialCta {
  label: string;
  description: string;
  to: string;
  icon: string;
  accent: string;
}

function getSpecialCta(courseId: string): SpecialCta | null {
  if (courseId === 'development') {
    return {
      label: 'Таймлайн жизни',
      description: 'Визуализируйте жизненный путь и связывайте события с возрастными периодами.',
      to: '/timeline',
      icon: '🗺️',
      accent: 'from-amber-400 to-orange-500',
    };
  }
  if (courseId === 'clinical') {
    return {
      label: 'Таблица по расстройствам',
      description: 'Интерактивная матрица психических расстройств — симптомы, критерии, терапия.',
      to: '/disorder-table',
      icon: '📊',
      accent: 'from-rose-400 to-pink-500',
    };
  }
  return null;
}

function formatResultDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function pluralizeNotes(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'заметка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'заметки';
  return 'заметок';
}

interface ActionButtonProps {
  to: string;
  icon: string;
  title: string;
  summary: string;
  palette: {
    bg: string;
    hover: string;
    text: string;
    accent: string;
  };
  expanded: boolean;
  onToggle: () => void;
}

function ActionButton({ to, icon, title, summary, palette, expanded, onToggle }: ActionButtonProps) {
  return (
    <div className={cn('relative flex h-full rounded-2xl transition', palette.bg, palette.hover)}>
      <Link
        to={to}
        className={cn(
          'flex flex-1 items-center gap-3 rounded-2xl px-4 py-3 pr-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          palette.text,
          palette.accent
        )}
      >
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">{title}</span>
          <span className="block text-xs opacity-80">{summary}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Скрыть детали' : 'Показать детали'}
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition',
          palette.text,
          'hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2',
          palette.accent
        )}
      >
        <span className={cn('block transition', expanded ? 'rotate-180' : '')} aria-hidden>
          ▾
        </span>
      </button>
    </div>
  );
}

function TestRow({ test, summary }: { test: Test; summary: TestAttemptSummary | undefined }) {
  return (
    <Link
      to={`/tests/dynamic/${test.id}`}
      className="flex flex-col gap-1 rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 transition hover:border-[#9EB7D9] hover:bg-[#F7FAFF] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <span className="font-medium text-[#2C3E50]">{test.title}</span>
      {summary ? (
        <span className="text-xs text-[#556476]">
          <span className="font-semibold text-[#244A8F]">
            {summary.bestScore}/{test.questionCount} · {summary.bestPercentage}%
          </span>
          <span className="mx-1 text-[#AFBACB]">·</span>
          {formatResultDate(summary.lastAttemptDate)}
        </span>
      ) : (
        <span className="text-xs text-[#8A97AB]">Ещё не проходили</span>
      )}
    </Link>
  );
}

function TestsContent({
  tests,
  resultsByTestId,
  loading,
  emptyMessage,
}: {
  tests: Test[];
  resultsByTestId: Map<string, TestAttemptSummary>;
  loading: boolean;
  emptyMessage: string;
}) {
  if (loading) return <p className="text-sm text-[#6B7A8D]">Загружаем тесты...</p>;
  if (tests.length === 0) return <p className="text-sm text-[#6B7A8D]">{emptyMessage}</p>;
  return (
    <div className="space-y-2">
      {tests.map((test) => (
        <TestRow key={test.id} test={test} summary={resultsByTestId.get(test.id)} />
      ))}
    </div>
  );
}

function NotesContent({ courseId }: { courseId: string }) {
  const { notes, loading } = useNotes();
  const courseNotes = useMemo(
    () => notes.filter((note) => note.courseId === courseId).slice(0, 3),
    [notes, courseId]
  );

  if (loading) return <p className="text-sm text-[#6B7A8D]">Загружаем заметки...</p>;
  if (courseNotes.length === 0) {
    return <p className="text-sm text-[#6B7A8D]">Заметок по этому курсу пока нет.</p>;
  }
  return (
    <ul className="space-y-2">
      {courseNotes.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50]"
        >
          <p className="font-medium">{note.title}</p>
          {note.periodTitle ? (
            <p className="text-xs text-[#6B7A8D]">{note.periodTitle}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AboutPlaceholder({ courseName }: { courseName: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-[#DDE5EE] bg-[#F9FBFF] p-5">
      <h2 className="text-lg font-semibold text-[#2C3E50]">О курсе</h2>
      <p className="mt-1 text-xs uppercase tracking-wide text-[#8A97AB]">Раздел скоро заполнит администратор</p>
      <dl className="mt-4 space-y-3 text-sm text-[#556476]">
        <div>
          <dt className="font-semibold text-[#2C3E50]">Авторы</dt>
          <dd className="text-[#8A97AB]">—</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2C3E50]">Идея курса</dt>
          <dd className="text-[#8A97AB]">Будет добавлено описание целей «{courseName}».</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2C3E50]">Программа</dt>
          <dd className="text-[#8A97AB]">—</dd>
        </div>
      </dl>
    </section>
  );
}

export default function CourseIntroPage({ courseId }: CourseIntroPageProps) {
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const [tests, setTests] = useState<Test[] | null>(null);
  const [testsLoading, setTestsLoading] = useState(true);
  const [resultsByTestId, setResultsByTestId] = useState<Map<string, TestAttemptSummary>>(new Map());
  const [resultsLoading, setResultsLoading] = useState(true);
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const { notes: allNotes, loading: notesLoading } = useNotes();

  useEffect(() => {
    let cancelled = false;
    setTestsLoading(true);
    getPublishedTests()
      .then((list) => {
        if (cancelled) return;
        setTests(list.filter((test) => test.course === courseId));
      })
      .catch(() => {
        if (!cancelled) setTests([]);
      })
      .finally(() => {
        if (!cancelled) setTestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setResultsByTestId(new Map());
      setResultsLoading(false);
      return;
    }
    setResultsLoading(true);
    getAllTestResults(user.uid)
      .then((results) => {
        if (cancelled) return;
        setResultsByTestId(groupResultsByTest(results));
      })
      .catch(() => {
        if (!cancelled) setResultsByTestId(new Map());
      })
      .finally(() => {
        if (!cancelled) setResultsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const course = useMemo(
    () => courses.find((candidate) => candidate.id === courseId),
    [courses, courseId]
  );

  if (coursesLoading) return <PageLoader />;

  const courseName = course?.name ?? 'Курс';
  const courseIcon = course?.icon ?? '📘';
  const specialCta = getSpecialCta(courseId);

  const lessonTests = (tests ?? []).filter((test) => test.rubric !== 'full-course');
  const courseTests = (tests ?? []).filter((test) => test.rubric === 'full-course');
  const courseNotes = allNotes.filter((note) => note.courseId === courseId);
  const notesLoadingIndicator = notesLoading ? 'Загрузка...' : null;

  const passedLessonCount = lessonTests.filter((test) => {
    const summary = resultsByTestId.get(test.id);
    return summary && summary.bestPercentage >= (test.requiredPercentage ?? 70);
  }).length;
  const passedCourseCount = courseTests.filter((test) => {
    const summary = resultsByTestId.get(test.id);
    return summary && summary.bestPercentage >= (test.requiredPercentage ?? 70);
  }).length;

  const testsAreLoading = testsLoading || resultsLoading;

  const handleToggle = (section: Exclude<ExpandedSection, null>) => {
    setExpanded((current) => (current === section ? null : section));
  };

  const notesLink = `/notes?course=${encodeURIComponent(courseId)}`;

  const palettes = {
    lessonTests: {
      bg: 'bg-blue-100',
      hover: 'hover:bg-blue-200/70',
      text: 'text-blue-900',
      accent: 'focus-visible:ring-blue-500',
    },
    courseTests: {
      bg: 'bg-emerald-100',
      hover: 'hover:bg-emerald-200/70',
      text: 'text-emerald-900',
      accent: 'focus-visible:ring-emerald-500',
    },
    notes: {
      bg: 'bg-amber-100',
      hover: 'hover:bg-amber-200/70',
      text: 'text-amber-900',
      accent: 'focus-visible:ring-amber-500',
    },
  } as const;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 py-4">
      <Helmet>
        <title>
          {courseName} — {SITE_NAME}
        </title>
      </Helmet>

      <header className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {courseIcon}
        </span>
        <h1 className="text-3xl font-black leading-tight text-[#1F2F46] sm:text-4xl">{courseName}</h1>
      </header>

      {specialCta ? (
        <Link
          to={specialCta.to}
          className={`flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r ${specialCta.accent} p-5 text-white transition hover:brightness-105`}
        >
          <span className="text-3xl" aria-hidden>
            {specialCta.icon}
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">Ключевой инструмент</span>
            <span className="block text-xl font-bold">{specialCta.label}</span>
            <span className="block text-sm opacity-90">{specialCta.description}</span>
          </span>
          <span className="hidden text-2xl sm:block" aria-hidden>
            →
          </span>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ActionButton
          to="/tests-lesson"
          icon="📝"
          title="Тесты по занятиям"
          summary={testsAreLoading ? 'Загрузка...' : `${passedLessonCount} пройдено из ${lessonTests.length}`}
          palette={palettes.lessonTests}
          expanded={expanded === 'lesson-tests'}
          onToggle={() => handleToggle('lesson-tests')}
        />
        <ActionButton
          to="/tests"
          icon="📚"
          title="Тесты по курсу"
          summary={testsAreLoading ? 'Загрузка...' : `${passedCourseCount} пройдено из ${courseTests.length}`}
          palette={palettes.courseTests}
          expanded={expanded === 'course-tests'}
          onToggle={() => handleToggle('course-tests')}
        />
        <ActionButton
          to={notesLink}
          icon="📓"
          title="Заметки"
          summary={notesLoadingIndicator ?? `${courseNotes.length} ${pluralizeNotes(courseNotes.length)}`}
          palette={palettes.notes}
          expanded={expanded === 'notes'}
          onToggle={() => handleToggle('notes')}
        />
      </div>

      {expanded !== null ? (
        <section className="rounded-2xl border border-[#DDE5EE] bg-white p-4">
          {expanded === 'lesson-tests' && (
            <TestsContent
              tests={lessonTests}
              resultsByTestId={resultsByTestId}
              loading={testsAreLoading}
              emptyMessage="Для этого курса пока нет тестов по занятиям."
            />
          )}
          {expanded === 'course-tests' && (
            <TestsContent
              tests={courseTests}
              resultsByTestId={resultsByTestId}
              loading={testsAreLoading}
              emptyMessage="Итоговых тестов по курсу пока нет."
            />
          )}
          {expanded === 'notes' && <NotesContent courseId={courseId} />}
        </section>
      ) : null}

      <AboutPlaceholder courseName={courseName} />
    </div>
  );
}

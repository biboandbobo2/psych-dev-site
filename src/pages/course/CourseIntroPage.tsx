import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
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

function TestsCollapsible({
  title,
  emoji,
  tests,
  resultsByTestId,
  loading,
  emptyMessage,
}: {
  title: string;
  emoji: string;
  tests: Test[];
  resultsByTestId: Map<string, TestAttemptSummary>;
  loading: boolean;
  emptyMessage: string;
}) {
  const passedCount = tests.filter((test) => {
    const summary = resultsByTestId.get(test.id);
    return summary && summary.bestPercentage >= (test.requiredPercentage ?? 70);
  }).length;

  return (
    <details className="group rounded-2xl border border-[#DDE5EE] bg-white open:shadow-sm">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {emoji}
          </span>
          <span>
            <span className="block text-lg font-semibold text-[#2C3E50]">{title}</span>
            <span className="block text-xs text-[#6B7A8D]">
              {loading ? 'Загружаем...' : `${passedCount} пройдено из ${tests.length}`}
            </span>
          </span>
        </span>
        <span className="text-[#6B7A8D] transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="space-y-2 px-4 pb-4">
        {loading ? (
          <p className="text-sm text-[#6B7A8D]">Загружаем тесты...</p>
        ) : tests.length === 0 ? (
          <p className="text-sm text-[#6B7A8D]">{emptyMessage}</p>
        ) : (
          tests.map((test) => <TestRow key={test.id} test={test} summary={resultsByTestId.get(test.id)} />)
        )}
      </div>
    </details>
  );
}

function NotesCollapsible({ courseId }: { courseId: string }) {
  const { notes, loading } = useNotes();
  const courseNotes = useMemo(
    () => notes.filter((note) => note.courseId === courseId).slice(0, 3),
    [notes, courseId]
  );
  const totalCourseNotes = useMemo(
    () => notes.filter((note) => note.courseId === courseId).length,
    [notes, courseId]
  );
  const notesLink = `/notes?course=${encodeURIComponent(courseId)}`;

  return (
    <details className="group rounded-2xl border border-[#DDE5EE] bg-white open:shadow-sm">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            📓
          </span>
          <span>
            <span className="block text-lg font-semibold text-[#2C3E50]">Мои заметки по курсу</span>
            <span className="block text-xs text-[#6B7A8D]">
              {loading ? 'Загружаем...' : `${totalCourseNotes} ${pluralizeNotes(totalCourseNotes)}`}
            </span>
          </span>
        </span>
        <span className="text-[#6B7A8D] transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="space-y-2 px-4 pb-4">
        {loading ? (
          <p className="text-sm text-[#6B7A8D]">Загружаем заметки...</p>
        ) : courseNotes.length === 0 ? (
          <p className="text-sm text-[#6B7A8D]">Заметок по этому курсу пока нет.</p>
        ) : (
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
        )}
        <Link
          to={notesLink}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#3359CB] transition hover:text-[#2A49A8]"
        >
          Все заметки →
        </Link>
      </div>
    </details>
  );
}

function pluralizeNotes(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'заметка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'заметки';
  return 'заметок';
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

      <TestsCollapsible
        title="Тесты по занятиям"
        emoji="📝"
        tests={lessonTests}
        resultsByTestId={resultsByTestId}
        loading={testsLoading || resultsLoading}
        emptyMessage="Для этого курса пока нет тестов по занятиям."
      />

      <TestsCollapsible
        title="Тесты по курсу"
        emoji="📚"
        tests={courseTests}
        resultsByTestId={resultsByTestId}
        loading={testsLoading || resultsLoading}
        emptyMessage="Итоговых тестов по курсу пока нет."
      />

      <NotesCollapsible courseId={courseId} />

      <AboutPlaceholder courseName={courseName} />
    </div>
  );
}

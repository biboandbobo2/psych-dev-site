import { useMemo, useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { usePublishedLessonOptions } from '../../../hooks';
import { useEditableCourses } from '../../../hooks/useEditableCourses';
import { useMyAnnouncementGroups } from '../../../hooks/useMyAnnouncementGroups';
import { SITE_NAME } from '../../../routes';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { CourseStudent } from '../../../types/courseStudents';
import { InviteStudentsModal } from './InviteStudentsModal';
import { StudentsSection } from './StudentsSection';
import { normalizeLessonId } from './courseProgress';
import {
  averageWatched,
  groupSubtitle,
  matchesQuery,
  plural,
  sortRows,
  type StudentRow,
  type StudentSort,
} from './courseStudentsHelpers';
import { useCourseStudents } from './useCourseStudents';

const SORT_LABELS: Record<StudentSort, string> = {
  progress: 'по прогрессу',
  name: 'по имени',
  lastLogin: 'по последнему входу',
};

const FIELD_CLASS = 'h-10 rounded-xl border border-border bg-card px-3 text-sm text-fg';

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted">
      {children}
    </div>
  );
}

/**
 * «Студенты курса» — экран администратора курса: свои потоки, свои
 * индивидуальные студенты и прогресс просмотра занятий. Данные о людях берутся
 * только из callable `getCourseStudents` (коллекция `users` админу курса
 * закрыта), прогресс — из `users/{uid}/courseProgress/{courseId}`.
 * Супер-админ и со-админ открывают страницу по тем же правилам, что и автор.
 */
export default function CourseStudents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { courses, loading: coursesLoading } = useEditableCourses();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { groups: announcementGroups } = useMyAnnouncementGroups();
  const { lessonsByCourse } = usePublishedLessonOptions({ includeUnpublished: true });

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<StudentSort>('progress');
  const [inviteOpen, setInviteOpen] = useState(false);

  const courseParam = searchParams.get('course');
  // Курс вне прав не подменяется «своим»: подмена ?course= должна упираться
  // в явную заглушку, а не молча показывать чужих студентов.
  const requestedId = courseParam ?? courses[0]?.id ?? null;
  const course = courses.find((item) => item.id === requestedId) ?? null;
  const courseId = course?.id ?? null;

  const { data, progress, loading, error, reload } = useCourseStudents(courseId);

  const lessons = useMemo(
    () => (courseId ? (lessonsByCourse[courseId] ?? []) : []),
    [courseId, lessonsByCourse]
  );
  const lessonsTotal = lessons.length;

  const watchedCount = useMemo(() => {
    const lessonIds = lessons.map((lesson) => normalizeLessonId(lesson.periodId));
    return (student: CourseStudent) => {
      const watched = progress.get(student.uid);
      if (!watched) return 0;
      return lessonIds.filter((id) => watched.has(id)).length;
    };
  }, [lessons, progress]);

  const toRows = (students: CourseStudent[]): StudentRow[] =>
    sortRows(
      students
        .filter((student) => matchesQuery(student, query))
        .map((student) => ({ student, watched: watchedCount(student) })),
      sort
    );

  const groups = (data?.groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    total: group.students.length,
    rows: toRows(group.students),
  }));
  const individualRows = toRows(data?.individual ?? []);

  const inGroupsTotal = (data?.groups ?? []).reduce((sum, group) => sum + group.students.length, 0);
  const individualTotal = data?.individual.length ?? 0;
  const total = inGroupsTotal + individualTotal;

  const announcementIds = useMemo(
    () => new Set(announcementGroups.map((group) => group.id)),
    [announcementGroups]
  );

  const setCourse = (id: string) => {
    setSearchParams({ course: id }, { replace: true });
    setQuery('');
  };

  if (coursesLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted">Загружаем курсы…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <Helmet>
        <title>Студенты курса — {SITE_NAME}</title>
      </Helmet>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-sm text-muted">
            <Link to="/admin" className="text-muted hover:underline">
              Кабинет автора
            </Link>
            {course ? ` · ${course.name}` : ''}
          </p>
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">Студенты курса</h1>
          {course && !loading && !error && (
            <p className="text-sm text-muted">
              {total} {plural(total, ['студент', 'студента', 'студентов'])} · {inGroupsTotal} через
              потоки · {individualTotal} лично · {lessonsTotal}{' '}
              {plural(lessonsTotal, ['занятие', 'занятия', 'занятий'])} опубликовано
            </p>
          )}
        </div>

        {course && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-[15px] font-semibold text-fg transition hover:bg-card2"
          >
            <PlusIcon />
            Пригласить на курс
          </button>
        )}
      </header>

      {courses.length === 0 ? (
        <Notice>
          У вас пока нет курсов в управлении. Напишите администратору академии, чтобы получить
          доступ.
        </Notice>
      ) : !course ? (
        <Notice>У вас нет прав на этот курс.</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative flex w-full items-center sm:w-80">
              <span className="pointer-events-none absolute left-3 inline-flex text-muted">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Имя или email студента"
                aria-label="Поиск студента"
                className={`${FIELD_CLASS} w-full pl-9`}
              />
            </label>

            <div className="flex flex-grow flex-wrap items-center justify-end gap-3">
              {courses.length > 1 && (
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  Курс
                  <select
                    value={course.id}
                    onChange={(event) => setCourse(event.target.value)}
                    aria-label="Курс"
                    className={`${FIELD_CLASS} font-semibold`}
                  >
                    {courses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="inline-flex items-center gap-2 text-sm text-muted">
                Сортировка
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as StudentSort)}
                  aria-label="Сортировка"
                  className={`${FIELD_CLASS} font-semibold`}
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : loading ? (
            <Notice>Загружаем студентов…</Notice>
          ) : total === 0 ? (
            <Notice>
              У курса пока нет студентов. Пригласите их по email — кнопка «Пригласить на курс».
            </Notice>
          ) : (
            <div className="space-y-4">
              {groups.length === 0 ? (
                <Notice>Потоков с этим курсом нет — студенты получили доступ лично.</Notice>
              ) : (
                groups.map((group) => (
                  <StudentsSection
                    key={group.id}
                    title={group.name}
                    subtitle={groupSubtitle(group.total, averageWatched(group.rows), lessonsTotal)}
                    rows={group.rows}
                    lessonsTotal={lessonsTotal}
                    emptyText="Никто из потока не подходит под поиск."
                    action={
                      isSuperAdmin || announcementIds.has(group.id) ? (
                        <Link
                          to="/admin/announcements"
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-fg no-underline transition hover:bg-card2"
                        >
                          Объявление потоку
                        </Link>
                      ) : undefined
                    }
                  />
                ))
              )}

              {individualTotal > 0 && (
                <StudentsSection
                  title="Индивидуально"
                  subtitle={`${individualTotal} ${plural(individualTotal, ['студент', 'студента', 'студентов'])} · доступ выдан лично, вне потоков`}
                  rows={individualRows}
                  lessonsTotal={lessonsTotal}
                  emptyText="Никто из них не подходит под поиск."
                />
              )}
            </div>
          )}
        </>
      )}

      {course && (
        <InviteStudentsModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          courseId={course.id}
          courseName={course.name}
          onInvited={reload}
        />
      )}
    </div>
  );
}

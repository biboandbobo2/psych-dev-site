import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEditableCourses } from '../../../hooks/useEditableCourses';
import type { CourseOption } from '../../../hooks/useCourses';
import { SITE_NAME } from '../../../routes';
import { useAuthorCabinetStats, type CourseCabinetStats } from './useAuthorCabinetStats';

const LINK_CLASS = 'text-sm text-accent hover:underline';

function StatBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="text-lg font-semibold text-fg">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const num = (value: number | null) => (value === null ? '—' : String(value));

/** Подпись под цифрой: у неизвестной метрики её нет — «0» тут был бы враньём. */
const hint = (value: number | null, format: (value: number) => string, whenZero?: string) => {
  if (value === null) return undefined;
  return value > 0 ? format(value) : whenZero;
};

function CourseCard({ course, stats }: { course: CourseOption; stats: CourseCabinetStats | undefined }) {
  const s = stats;
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-brand space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {course.icon}
        </span>
        <h2 className="text-lg font-semibold text-fg">{course.name}</h2>
        {!course.isCore && course.published === false && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-700">
            Скрыт
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatBlock
          label="Занятия"
          value={num(s?.lessonsPublished ?? null)}
          hint={hint(s?.lessonsDraft ?? null, (value) => `${value} в черновиках`, 'без черновиков')}
        />
        <StatBlock
          label="Вопросы студентов"
          value={num(s?.questionsTotal ?? null)}
          hint={hint(s?.questionsLastWeek ?? null, (value) => `${value} за неделю`, 'новых нет')}
        />
        <StatBlock
          label="События за 4 недели"
          value={num(s?.events ?? null)}
          hint={hint(s?.uniqueStudents ?? null, (value) => `${value} студентов`)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to={`/admin/content?course=${course.id}`} className={LINK_CLASS}>
          Контент
        </Link>
        <Link to={`/admin/questions?course=${course.id}`} className={LINK_CLASS}>
          Вопросы
        </Link>
        <Link to={`/admin/telemetry?course=${course.id}`} className={LINK_CLASS}>
          Телеметрия
        </Link>
        <Link to={`/admin/content/course-intro/${course.id}`} className={LINK_CLASS}>
          О курсе
        </Link>
      </div>
    </section>
  );
}

/**
 * Кабинет автора — стартовый экран `/admin` для админа курса.
 * Super-admin сюда не попадает: у него `/admin` по-прежнему ведёт на `/superadmin`.
 */
export default function AuthorCabinet() {
  const { courses, loading: coursesLoading } = useEditableCourses();
  const { stats, loading: statsLoading } = useAuthorCabinetStats(courses);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <Helmet>
        <title>Кабинет автора — {SITE_NAME}</title>
      </Helmet>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-fg sm:text-3xl">Кабинет автора</h1>
        <p className="text-sm text-muted">Курсы, которыми вы управляете.</p>
      </header>

      {coursesLoading ? (
        <p className="text-sm text-muted">Загружаем курсы…</p>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted">
          У вас пока нет курсов в управлении. Напишите администратору академии, чтобы получить
          доступ.
        </div>
      ) : (
        <>
          {statsLoading && <p className="text-sm text-muted">Считаем сводку…</p>}
          <div className="space-y-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} stats={stats[course.id]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

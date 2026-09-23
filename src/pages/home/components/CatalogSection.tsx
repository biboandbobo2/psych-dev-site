import { useState } from 'react';
import { CatalogCourseCard } from './CatalogCourseCard';

const CATALOG_PREVIEW_COUNT = 8;

interface CatalogSectionProps {
  courses: Array<{ id: string; name: string; icon?: string }>;
  openCourseIds: Set<string>;
  purchasedCourseIds: Set<string>;
  onOpenLessons: (courseId: string) => void;
}

/** Секция «Каталог платформы»: первые 8 курсов, остальные — по кнопке. */
export function CatalogSection({
  courses,
  openCourseIds,
  purchasedCourseIds,
  onOpenLessons,
}: CatalogSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? courses : courses.slice(0, CATALOG_PREVIEW_COUNT);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-brand">
      <h3 className="mb-4 text-xl font-bold text-fg">Каталог платформы</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((course) => (
          <CatalogCourseCard
            key={course.id}
            course={course}
            isOpen={openCourseIds.has(course.id)}
            isPurchased={purchasedCourseIds.has(course.id)}
            onOpenLessons={onOpenLessons}
          />
        ))}
      </div>
      {courses.length > CATALOG_PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 text-sm font-semibold text-accent transition hover:text-[#1F4D22]"
        >
          {expanded ? 'Свернуть' : `Показать все курсы (${courses.length})`}
        </button>
      ) : null}
    </section>
  );
}

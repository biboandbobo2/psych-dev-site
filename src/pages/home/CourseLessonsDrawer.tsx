import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useCourses } from '../../hooks/useCourses';
import { useCourseNavItems } from '../../hooks/useCourseNavItems';

interface CourseLessonsDrawerProps {
  courseId: string | null;
  onClose: () => void;
}

export function CourseLessonsDrawer({ courseId, onClose }: CourseLessonsDrawerProps) {
  const isOpen = Boolean(courseId);
  const { courses } = useCourses();
  const { items, loading, error } = useCourseNavItems(courseId);
  const course = courses.find((c) => c.id === courseId);

  useEffect(() => {
    if (!isOpen) return;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:bg-black/10"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        aria-hidden={!isOpen}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 flex w-full max-w-[360px] flex-col bg-white shadow-xl transition-transform duration-300 overflow-hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E5EBF3] bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-[#6B7A8D]">Курс</p>
            <p className="truncate text-base font-semibold text-[#2C3E50]">{course?.name ?? 'Курс'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#6B7A8D] transition hover:text-[#2C3E50]"
            aria-label="Закрыть список занятий"
          >
            ×
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {loading ? (
            <p className="px-2 py-2 text-sm text-[#6B7A8D]">Загрузка занятий...</p>
          ) : error ? (
            <p className="px-2 py-2 text-sm text-red-700">Не удалось загрузить занятия.</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-2 text-sm text-[#6B7A8D]">Пока нет опубликованных занятий.</p>
          ) : (
            items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl border border-transparent px-3 py-2 text-sm transition',
                    isActive
                      ? 'border-[#9EB7D9] bg-[#EEF4FF] font-semibold text-[#244A8F]'
                      : 'text-[#465A75] hover:bg-[#F5F8FC]'
                  )
                }
              >
                <span className="block whitespace-normal break-words">{item.label}</span>
              </NavLink>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}

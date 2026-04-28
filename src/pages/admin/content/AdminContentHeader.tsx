import { Link } from 'react-router-dom';

interface AdminContentHeaderProps {
  activeCourse: string;
  canEditActiveCourse: boolean;
  canWriteAnnouncements: boolean;
}

const PERMITTED_LINK_CLASSES =
  'inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-colors';
const FORBIDDEN_BUTTON_CLASSES =
  'inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-400';

export function AdminContentHeader({
  activeCourse,
  canEditActiveCourse,
  canWriteAnnouncements,
}: AdminContentHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 mb-2">
      <h1 className="text-2xl font-bold sm:text-3xl">Управление контентом</h1>
      <div className="flex items-center gap-2">
        {canEditActiveCourse ? (
          <Link
            to={`/admin/content/course-intro/${activeCourse}`}
            className={`${PERMITTED_LINK_CLASSES} bg-[#E8F0FA] text-[#1F4F86] hover:bg-[#D5E4F5]`}
            title="«О курсе»: Идея, Авторы, Программа"
          >
            <span className="text-lg" aria-hidden>✨</span>
            <span className="text-sm font-medium">О курсе</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={FORBIDDEN_BUTTON_CLASSES}
            title="Нет прав на редактирование этого курса"
          >
            <span className="text-lg" aria-hidden>✨</span>
            <span className="text-sm font-medium">О курсе</span>
          </button>
        )}
        {canWriteAnnouncements ? (
          <Link
            to="/admin/announcements"
            className={`${PERMITTED_LINK_CLASSES} bg-purple-100 text-purple-900 hover:bg-purple-200`}
            title="Объявления и события для студентов"
          >
            <span className="text-lg" aria-hidden>📢</span>
            <span className="text-sm font-medium">Кабинет объявлений</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={FORBIDDEN_BUTTON_CLASSES}
            title="Супер-админ должен назначить вас администратором объявлений в настройках группы"
          >
            <span className="text-lg" aria-hidden>📢</span>
            <span className="text-sm font-medium">Кабинет объявлений</span>
          </button>
        )}
      </div>
    </header>
  );
}

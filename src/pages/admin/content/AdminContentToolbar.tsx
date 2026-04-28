import { Link } from 'react-router-dom';

const ACTION_BUTTON_CLASS =
  'inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition shadow-sm whitespace-nowrap sm:min-w-[220px] sm:min-h-[52px] sm:px-5 sm:py-2.5 sm:text-base';

interface AdminContentToolbarProps {
  saving: boolean;
  canEditActiveCourse: boolean;
  onCreateLesson: () => void;
  onCreateTest: () => void;
}

export function AdminContentToolbar({
  saving,
  canEditActiveCourse,
  onCreateLesson,
  onCreateTest,
}: AdminContentToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        {saving && (
          <span className="text-sm text-blue-600 animate-pulse">Сохранение порядка...</span>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          onClick={() => canEditActiveCourse && onCreateLesson()}
          disabled={!canEditActiveCourse}
          title={canEditActiveCourse ? undefined : 'Нет прав на редактирование этого курса'}
          className={`${ACTION_BUTTON_CLASS} ${
            canEditActiveCourse
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
        >
          <span aria-hidden>➕</span>
          <span>Добавить занятие</span>
        </button>

        <button
          onClick={onCreateTest}
          className={`${ACTION_BUTTON_CLASS} bg-blue-600 hover:bg-blue-700`}
        >
          <span aria-hidden>📝</span>
          <span>Создать тест</span>
        </button>

        <Link to="/admin/topics" className={`${ACTION_BUTTON_CLASS} bg-green-600 hover:bg-green-700`}>
          <span aria-hidden>📚</span>
          <span>Темы заметок</span>
        </Link>
      </div>
    </div>
  );
}

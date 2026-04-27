import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPeriodColors } from '../../../constants/periods';
import type { CourseType } from '../../../types/tests';
import type { AdminPeriod } from './types';

interface SortableItemProps {
  period: AdminPeriod;
  currentCourse: CourseType;
  canEdit: boolean;
}

export function SortableItem({ period, currentCourse, canEdit }: SortableItemProps) {
  const navigate = useNavigate();
  const isPlaceholder = Boolean(period.isPlaceholder);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: period.period,
    disabled: isPlaceholder || !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const colors = getPeriodColors(period.period);
  const isIntro = period.period === 'intro';

  const handleClick = () => {
    if (!canEdit) return;
    navigate(`/admin/content/edit/${period.period}?course=${currentCourse}`);
  };

  const dragCursor = !canEdit
    ? 'cursor-not-allowed'
    : isPlaceholder
      ? 'cursor-default'
      : 'cursor-grab active:cursor-grabbing';

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={canEdit ? undefined : 'Нет прав на редактирование этого курса'}
      className={`block rounded-lg shadow transition-shadow ${
        canEdit ? 'hover:shadow-lg' : 'opacity-60'
      } ${dragCursor} ${
        isIntro ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' : 'bg-white'
      } ${isPlaceholder && !isIntro ? 'border border-dashed border-blue-200 opacity-70' : ''} ${
        isDragging ? 'shadow-xl ring-2 ring-blue-400' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center p-4">
        <div className="flex flex-col gap-0.5 mr-3 text-gray-400">
          <span className="text-xs">⋮⋮</span>
        </div>
        <div
          className="w-2 h-16 rounded mr-4"
          style={{ backgroundColor: period.accent || colors.accent }}
        />
        <div className="flex-1" onClick={handleClick}>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold">
              {isIntro ? `✨ ${period.title || 'Вводное занятие'}` : period.title}
            </h3>
            <span
              className={`px-2 py-1 text-xs rounded ${
                period.published ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {period.published ? 'Опубликовано' : 'Черновик'}
            </span>
            {!isIntro && isPlaceholder && (
              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                Новый период
              </span>
            )}
          </div>
          {period.subtitle && (
            <p className={`text-sm mb-2 ${isIntro ? 'text-yellow-100' : 'text-gray-600'}`}>
              {period.subtitle}
            </p>
          )}
          <div className={`flex gap-4 text-xs ${isIntro ? 'text-yellow-50' : 'text-gray-500'}`}>
            <span>ID: {period.period}</span>
            <span>Порядок: {period.order}</span>
          </div>
        </div>
        <button
          onClick={handleClick}
          disabled={!canEdit}
          title={canEdit ? 'Редактировать' : 'Нет прав на редактирование этого курса'}
          className={`text-2xl ml-4 transition-transform ${
            !canEdit
              ? 'cursor-not-allowed text-gray-300'
              : `${isIntro ? 'text-white' : 'text-gray-400'} hover:scale-110`
          }`}
        >
          ✏️
        </button>
      </div>
    </div>
  );
}

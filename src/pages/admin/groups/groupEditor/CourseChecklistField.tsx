import type { ReactNode } from 'react';

interface Course {
  id: string;
  name: string;
  icon?: string;
}

interface CourseChecklistFieldProps {
  legend: ReactNode;
  description?: ReactNode;
  courses: readonly Course[];
  loading: boolean;
  isChecked: (id: string) => boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
  /** Когда задано, после достижения лимита нельзя добавить новый, но можно снять. */
  maxSelected?: number;
  selectedCount?: number;
}

export function CourseChecklistField({
  legend,
  description,
  courses,
  loading,
  isChecked,
  onToggle,
  disabled = false,
  maxSelected,
  selectedCount = 0,
}: CourseChecklistFieldProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {legend}
      </legend>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {loading ? (
        <div className="text-sm text-gray-500">Загрузка…</div>
      ) : (
        <ul className="grid grid-cols-1 gap-1 rounded-md border border-gray-200 p-2 sm:grid-cols-2">
          {courses.map((c) => {
            const checked = isChecked(c.id);
            const limitReached =
              !checked && typeof maxSelected === 'number' && selectedCount >= maxSelected;
            return (
              <li key={c.id}>
                <label
                  className={`flex items-center gap-2 rounded px-2 py-1 ${
                    limitReached
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(c.id)}
                    disabled={disabled || limitReached}
                  />
                  <span className="text-sm">
                    {c.icon} {c.name}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}

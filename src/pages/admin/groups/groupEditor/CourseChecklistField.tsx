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
}

export function CourseChecklistField({
  legend,
  description,
  courses,
  loading,
  isChecked,
  onToggle,
  disabled = false,
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
          {courses.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={isChecked(c.id)}
                  onChange={() => onToggle(c.id)}
                  disabled={disabled}
                />
                <span className="text-sm">
                  {c.icon} {c.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

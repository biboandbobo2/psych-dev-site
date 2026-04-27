import type { DisorderTableStudent } from '../../../features/disorderTable';

interface AdminTeacherSelectProps {
  students: DisorderTableStudent[];
  studentsLoading: boolean;
  studentsError: string | null;
  selectedStudent: DisorderTableStudent | null;
  targetOwnerUid: string | null;
  onChange: (uid: string | null) => void;
}

/** Селектор студента в режиме преподавателя (видим только для admin). */
export function AdminTeacherSelect({
  students,
  studentsLoading,
  studentsError,
  selectedStudent,
  targetOwnerUid,
  onChange,
}: AdminTeacherSelectProps) {
  return (
    <section className="mb-2 rounded-xl border border-violet-200 bg-violet-50/70 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-900">
          Режим преподавателя
        </span>
        <select
          value={targetOwnerUid ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          className="min-w-[220px] flex-1 rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 sm:max-w-[420px]"
        >
          {studentsLoading && <option value="">Загрузка списка студентов...</option>}
          {!studentsLoading && students.length === 0 && (
            <option value="">Студенты не найдены</option>
          )}
          {!studentsLoading &&
            students.map((student) => (
              <option key={student.uid} value={student.uid}>
                {student.displayName}
                {student.email ? ` (${student.email})` : ''}
              </option>
            ))}
        </select>
      </div>
      {selectedStudent && (
        <p className="mt-1 text-xs text-violet-800">
          Просматривается таблица студента:{' '}
          <span className="font-semibold">{selectedStudent.displayName}</span>
        </p>
      )}
      {studentsError && <p className="mt-1 text-xs text-red-700">{studentsError}</p>}
    </section>
  );
}

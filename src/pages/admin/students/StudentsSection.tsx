import { useState, type ReactNode } from 'react';
import { courseStudentLabel } from '../../../types/courseStudents';
import {
  avatarTone,
  formatLastLogin,
  studentInitials,
  type StudentRow,
} from './courseStudentsHelpers';

/** Сколько строк показываем до нажатия «Показать ещё». */
const PAGE_SIZE = 10;

const GRID = 'sm:grid sm:grid-cols-[2.4fr_1.2fr_2fr] sm:items-center sm:gap-4';

function Badge({ tone, children }: { tone: 'amber' | 'rose'; children: ReactNode }) {
  const toneClass = tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function ProgressBar({ watched, total }: { watched: number; total: number }) {
  const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-grow overflow-hidden rounded-full bg-pastel-plain">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <span
        className={`w-14 text-right text-sm font-semibold ${watched === 0 ? 'text-muted' : 'text-fg'}`}
      >
        {watched} / {total}
      </span>
    </div>
  );
}

function StudentLine({ row, lessonsTotal }: { row: StudentRow; lessonsTotal: number }) {
  const { student } = row;
  const label = courseStudentLabel(student);

  return (
    <li className={`border-b border-border/50 px-5 py-3 last:border-b-0 ${GRID}`}>
      <div className="flex items-center gap-3">
        {student.photoURL ? (
          <img
            src={student.photoURL}
            alt=""
            className="h-8 w-8 flex-shrink-0 rounded-full border-0 object-cover shadow-none"
          />
        ) : (
          <span
            aria-hidden
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(student.uid)}`}
          >
            {studentInitials(student)}
          </span>
        )}
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-fg">{label}</span>
            {student.pendingRegistration && <Badge tone="amber">Ожидает регистрации</Badge>}
            {student.disabled && <Badge tone="rose">Отключён</Badge>}
          </span>
          {student.email && student.email !== label && (
            <span className="block truncate text-xs text-muted">{student.email}</span>
          )}
        </span>
      </div>

      <div className="mt-2 text-sm text-ink-soft sm:mt-0">
        <span className="text-muted sm:hidden">Последний вход: </span>
        {formatLastLogin(student.lastLoginAt)}
      </div>

      <div className="mt-2 sm:mt-0">
        <ProgressBar watched={row.watched} total={lessonsTotal} />
      </div>
    </li>
  );
}

interface StudentsSectionProps {
  title: string;
  subtitle: string;
  rows: StudentRow[];
  lessonsTotal: number;
  /** Кнопка в шапке секции (например, «Объявление потоку»). */
  action?: ReactNode;
  /** Текст, когда строк нет: пустая секция или ничего не нашёл поиск. */
  emptyText: string;
}

/**
 * Одна секция списка — поток или «Индивидуально». На узком экране строка
 * разворачивается в карточку: горизонтальной прокрутки нет.
 */
export function StudentsSection({
  title,
  subtitle,
  rows,
  lessonsTotal,
  action,
  emptyText,
}: StudentsSectionProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = rows.slice(0, visible);
  const rest = rows.length - shown.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-brand">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card2 px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-base font-bold text-fg">{title}</h2>
          <span className="text-sm text-muted">{subtitle}</span>
        </div>
        {action}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">{emptyText}</p>
      ) : (
        <>
          <div
            className={`hidden border-b border-border/50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-ink-faint ${GRID}`}
          >
            <div>Студент</div>
            <div>Последний вход</div>
            <div>Просмотрено занятий</div>
          </div>
          <ul className="list-none p-0">
            {shown.map((row) => (
              <StudentLine key={row.student.uid} row={row} lessonsTotal={lessonsTotal} />
            ))}
          </ul>
          {rest > 0 && (
            <button
              type="button"
              onClick={() => setVisible((value) => value + PAGE_SIZE)}
              className="w-full px-5 py-3 text-left text-sm font-semibold text-accent hover:underline"
            >
              Показать ещё {Math.min(rest, PAGE_SIZE)} из {rest}
            </button>
          )}
        </>
      )}
    </section>
  );
}

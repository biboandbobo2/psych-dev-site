import { useState, type ReactNode } from 'react';
import { courseStudentLabel } from '../../../types/courseStudents';
import { LessonSquares } from './LessonSquares';
import {
  avatarTone,
  formatLastLogin,
  studentInitials,
  type StudentRow,
} from './courseStudentsHelpers';

/** Сколько строк показываем до нажатия «Показать ещё». */
const PAGE_SIZE = 10;

const GRID = 'sm:grid sm:grid-cols-[2fr_1fr_2.6fr] sm:items-center sm:gap-4';

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

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block text-sm text-muted transition-transform ${open ? 'rotate-180' : ''}`}
    >
      ▾
    </span>
  );
}

function StudentLine({ row }: { row: StudentRow }) {
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
        <LessonSquares views={row.views} />
      </div>
    </li>
  );
}

interface StudentsSectionProps {
  title: string;
  subtitle: string;
  rows: StudentRow[];
  /** Кнопка в шапке секции (например, «Объявление потоку»). */
  action?: ReactNode;
  /** Текст, когда строк нет: пустая секция или ничего не нашёл поиск. */
  emptyText: string;
  /** Секция свёрнута, пока её не раскроют (курс не в актуальных у потока); текст — почему. */
  collapsedNote?: string;
  /** Строки под стрелкой в конце секции (курс не в актуальных у студента). */
  hiddenRows?: StudentRow[];
  hiddenLabel?: string;
}

/**
 * Одна секция списка — поток или «Индивидуально». На узком экране строка
 * разворачивается в карточку: горизонтальной прокрутки нет.
 */
export function StudentsSection({
  title,
  subtitle,
  rows,
  action,
  emptyText,
  collapsedNote,
  hiddenRows = [],
  hiddenLabel,
}: StudentsSectionProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(!collapsedNote);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const shown = rows.slice(0, visible);
  const rest = rows.length - shown.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-brand">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 bg-card2 px-5 py-4 ${
          open ? 'border-b border-border/60' : ''
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-base font-bold text-fg">
            {collapsedNote ? (
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="inline-flex items-baseline gap-2 text-left"
              >
                <Chevron open={open} />
                {title}
              </button>
            ) : (
              title
            )}
          </h2>
          <span className="text-sm text-muted">{subtitle}</span>
          {collapsedNote ? <span className="text-sm text-muted">· {collapsedNote}</span> : null}
        </div>
        {action}
      </div>

      {!open ? null : rows.length === 0 && hiddenRows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">{emptyText}</p>
      ) : (
        <>
          <div
            className={`hidden border-b border-border/50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.04em] text-ink-faint ${GRID}`}
          >
            <div>Студент</div>
            <div>Последний вход</div>
            <div>Просмотры</div>
          </div>
          <ul className="list-none p-0">
            {shown.map((row) => (
              <StudentLine key={row.student.uid} row={row} />
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
          {hiddenRows.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setHiddenOpen((value) => !value)}
                aria-expanded={hiddenOpen}
                className="flex w-full items-center gap-2 border-t border-border/50 px-5 py-3 text-left text-sm text-muted hover:text-fg"
              >
                <Chevron open={hiddenOpen} />
                Ещё {hiddenRows.length}
                {hiddenLabel ? ` — ${hiddenLabel}` : ''}
              </button>
              {hiddenOpen && (
                <ul className="list-none border-t border-border/50 p-0">
                  {hiddenRows.map((row) => (
                    <StudentLine key={row.student.uid} row={row} />
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

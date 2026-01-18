import { PERIOD_CONFIG } from '../../../utils/periodConfig';
import { AGE_RANGE_LABELS } from '../../../types/notes';
import { Emoji, EmojiText } from '../../../components/Emoji';
import type { Note } from '../../../types/notes';

interface NotesListProps {
  notes: Note[];
  showStats: boolean;
  stats: {
    total: number;
    periods: number;
    today: number;
    week: number;
  };
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
}

export function NotesList({ notes, showStats, stats, onEdit, onDelete }: NotesListProps) {
  const hasStats = showStats && notes.length > 0;

  return (
    <>
      {hasStats ? <StatsPanel {...stats} /> : null}
      <div className="space-y-2">
        {notes.map((note) => (
          <NoteListItem key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </>
  );
}

function NoteListItem({ note, onEdit, onDelete }: { note: Note; onEdit: (note: Note) => void; onDelete: (noteId: string) => void }) {
  const metaKey = (note.periodId ?? note.ageRange ?? 'other') as keyof typeof PERIOD_CONFIG;
  const meta = PERIOD_CONFIG[metaKey] ?? PERIOD_CONFIG.other;
  const periodLabel = note.periodTitle ?? (note.ageRange ? AGE_RANGE_LABELS[note.ageRange] : null);

  return (
    <div
      onClick={() => onEdit(note)}
      className={`group cursor-pointer rounded-lg border border-border border-l-4 bg-card p-4 transition hover:bg-card2 hover:shadow ${meta.colorClass}`}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="flex-1 text-lg font-semibold text-fg group-hover:text-accent">
          {note.title || 'Без названия'}
        </h3>
        <span className="whitespace-nowrap text-sm text-muted">{formatDate(note.createdAt)}</span>
      </div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex-1 text-sm text-muted line-clamp-1">
          {note.content ? note.content : <EmojiText text="💭 Описание не добавлено" />}
        </p>
        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit(note);
            }}
            className="rounded-md p-1.5 text-muted transition hover:bg-white hover:text-accent hover:shadow"
            title="Редактировать"
          >
            <Emoji token="✏️" size={14} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(note.id);
            }}
            className="rounded-md p-1.5 text-muted transition hover:bg-white hover:text-red-600 hover:shadow"
            title="Удалить"
          >
            <Emoji token="🗑️" size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-fg/80">
        {periodLabel ? (
          <span>
            <Emoji token={meta.icon} size={14} /> {periodLabel}
          </span>
        ) : null}
        {note.topicTitle ? (
          <span className="inline-flex items-center gap-1">
            • <Emoji token="📚" size={14} /> {note.topicTitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatsPanel({ total, periods, today, week }: { total: number; periods: number; today: number; week: number }) {
  const stats = [
    { label: 'Всего заметок', value: total },
    { label: 'Периодов изучено', value: periods },
    { label: 'Создано сегодня', value: today },
    { label: 'На этой неделе', value: week },
  ];

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-lg bg-white px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-fg">{item.value}</div>
            <div className="text-sm text-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const value = getNoteDate(date);
  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  if (days === 0) {
    return `Сегодня в ${value.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} ${getDaysWord(days)} назад`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${getWeeksWord(weeks)} назад`;
  }

  return value.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: value.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getDaysWord(days: number): string {
  if (days === 1) return 'день';
  if (days >= 2 && days <= 4) return 'дня';
  return 'дней';
}

function getWeeksWord(weeks: number): string {
  if (weeks === 1) return 'неделю';
  if (weeks >= 2 && weeks <= 4) return 'недели';
  return 'недель';
}

function getNoteDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

function isSameDay(dateA: Date | string, dateB: Date): boolean {
  const a = getNoteDate(dateA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

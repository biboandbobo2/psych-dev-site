import { PERIOD_CONFIG } from '../../../utils/periodConfig';
import { AGE_RANGE_LABELS, buildTimestampedLectureContent } from '../../../types/notes';
import type { Note } from '../../../types/notes';

interface NotesListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NotesList({ notes, onEdit, onDelete }: NotesListProps) {
  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <NoteListItem key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function NoteListItem({ note, onEdit, onDelete }: { note: Note; onEdit: (note: Note) => void; onDelete: (note: Note) => void }) {
  const metaKey = (note.periodId ?? note.ageRange ?? 'other') as keyof typeof PERIOD_CONFIG;
  const meta = PERIOD_CONFIG[metaKey] ?? PERIOD_CONFIG.other;
  const periodLabel = note.periodTitle ?? (note.ageRange ? AGE_RANGE_LABELS[note.ageRange] : null);
  const isLecture = note.noteScope === 'lecture';
  // Конспект в превью — с таймкодами: сразу видно, что это запись по ходу лекции.
  const preview =
    isLecture && note.lectureSegments?.length
      ? buildTimestampedLectureContent(note.lectureSegments)
      : note.content;

  return (
    <div
      onClick={() => onEdit(note)}
      className={`group cursor-pointer rounded-lg border border-border border-l-4 bg-card p-4 transition hover:bg-card2 hover:shadow ${meta.colorClass}`}
    >
      <div className="mb-1 flex items-start justify-between gap-4">
        <h3 className="flex-1 text-lg font-semibold text-fg group-hover:text-accent">
          {note.title || 'Без названия'}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted">{formatDate(note.updatedAt ?? note.createdAt)}</span>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(note);
            }}
            className="rounded-md p-1 text-muted transition hover:bg-card hover:text-red-600 hover:shadow"
            title="Удалить"
            aria-label="Удалить заметку"
          >
            🗑️
          </button>
        </div>
      </div>
      <p className="mb-2 text-sm text-muted line-clamp-2">{preview || '💭 Описание не добавлено'}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-fg/80">
        {isLecture ? (
          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent">
            Конспект лекции
          </span>
        ) : null}
        {periodLabel ? (
          <span>
            {meta.icon} {periodLabel}
          </span>
        ) : null}
        {note.topicTitle ? <span>• 📚 {note.topicTitle}</span> : null}
      </div>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const value = getNoteDate(date);
  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
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

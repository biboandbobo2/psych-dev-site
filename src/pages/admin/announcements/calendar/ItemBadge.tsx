import type { GroupEvent } from '../../../../types/groupFeed';

interface ItemBadgeProps {
  event: GroupEvent;
  /** Если задано — добавляется как левая подсветка для color-coding по группе. */
  groupAccentClass?: string;
  onClick: () => void;
}

function shortTime(ms: number | undefined): string {
  if (typeof ms !== 'number') return '';
  const d = new Date(ms);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function ItemBadge({ event, groupAccentClass, onClick }: ItemBadgeProps) {
  const isAssignment = event.kind === 'assignment';
  const baseColor = isAssignment
    ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
    : event.isAllDay
    ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
    : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100';

  const startMs = event.startAt?.toMillis?.();
  const endMs = event.endAt?.toMillis?.();
  const showTime = !isAssignment && !event.isAllDay && typeof startMs === 'number';
  const isMultiDay =
    !isAssignment &&
    typeof startMs === 'number' &&
    typeof endMs === 'number' &&
    endMs - startMs > 24 * 60 * 60 * 1000;

  return (
    <button
      type="button"
      onClick={onClick}
      title={event.text}
      className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight ${baseColor} ${
        groupAccentClass ?? ''
      }`}
    >
      <span aria-hidden className="shrink-0">
        {isAssignment ? '📋' : event.isAllDay ? '📅' : '🕒'}
      </span>
      {showTime && (
        <span className="shrink-0 font-mono text-[10px] opacity-70">
          {shortTime(startMs)}
        </span>
      )}
      <span className="truncate">{event.text}</span>
      {isMultiDay && (
        <span className="ml-auto shrink-0 text-[9px] opacity-60">+дн</span>
      )}
    </button>
  );
}

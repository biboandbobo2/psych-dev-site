import { useState } from 'react';
import { debugError } from '../../../lib/debug';
import {
  deleteGroupAnnouncement,
  deleteGroupEvent,
} from '../../../hooks/useGroupFeed';
import type { GroupAnnouncement, GroupEvent } from '../../../types/groupFeed';
import type { EditTarget } from './EditModal';

function formatDueDateRu(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AdminFeedListProps {
  announcements: GroupAnnouncement[];
  events: GroupEvent[];
  groupNameById: Map<string, string>;
  onEdit: (target: EditTarget) => void;
}

export function AdminFeedList({
  announcements,
  events,
  groupNameById,
  onEdit,
}: AdminFeedListProps) {
  const total = announcements.length + events.length;
  if (total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
        В выбранном фильтре пока нет записей.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {announcements.map((ann) => (
        <FeedRow
          key={`ann-${ann.id}`}
          accent="bg-purple-50 text-purple-900"
          icon="📢"
          headline={`Объявление · ${groupNameById.get(ann.groupId) ?? ann.groupId}`}
          text={ann.text}
          subtitle={formatDate(ann.createdAt?.toDate?.() ?? null)}
          onEdit={() =>
            onEdit({ kind: 'announcement', groupId: ann.groupId, item: ann })
          }
          onDelete={async () => deleteGroupAnnouncement(ann.groupId, ann.id)}
        />
      ))}
      {events.map((ev) => {
        const isAssignment = ev.kind === 'assignment';
        const headline = isAssignment
          ? `Задание · ${groupNameById.get(ev.groupId) ?? ev.groupId} · ${
              formatDueDateRu(ev.dueDate)
            }`
          : `Событие · ${groupNameById.get(ev.groupId) ?? ev.groupId} · ${
              ev.dateLabel
            }`;
        return (
          <FeedRow
            key={`ev-${ev.id}`}
            accent={
              isAssignment
                ? 'bg-amber-50 text-amber-900'
                : 'bg-indigo-50 text-indigo-900'
            }
            icon={isAssignment ? '📋' : '📅'}
            headline={headline}
            text={ev.text}
            subtitle={formatDate(ev.createdAt?.toDate?.() ?? null)}
            onEdit={() =>
              onEdit({
                kind: isAssignment ? 'assignment' : 'event',
                groupId: ev.groupId,
                item: ev,
              })
            }
            onDelete={async () => deleteGroupEvent(ev.groupId, ev.id)}
          />
        );
      })}
    </ul>
  );
}

function FeedRow({
  accent,
  icon,
  headline,
  text,
  subtitle,
  onEdit,
  onDelete,
}: {
  accent: string;
  icon: string;
  headline: string;
  text: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${accent}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#556476]">
          {headline}
        </p>
        <p className="mt-0.5 truncate text-sm text-[#2C3E50]" title={text}>
          {text}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="rounded-md bg-[#EEF2F7] px-2 py-1 text-xs text-[#2C3E50] hover:bg-[#DDE5EE] disabled:opacity-50"
        >
          ✏ Редактировать
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm('Удалить эту запись?')) return;
            setBusy(true);
            try {
              await onDelete();
            } catch (err) {
              debugError('AdminFeedList delete failed', err);
              window.alert(err instanceof Error ? err.message : 'Ошибка удаления');
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        >
          {busy ? '…' : '🗑 Удалить'}
        </button>
      </div>
    </li>
  );
}

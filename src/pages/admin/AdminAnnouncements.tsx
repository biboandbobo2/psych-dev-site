import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useAuth } from '../../auth/AuthProvider';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAllGroups } from '../../hooks/useAllGroups';
import { useMyAnnouncementGroups } from '../../hooks/useMyAnnouncementGroups';
import {
  createGroupAnnouncement,
  createGroupEvent,
  deleteGroupAnnouncement,
  deleteGroupEvent,
  useGroupFeed,
} from '../../hooks/useGroupFeed';
import { debugError } from '../../lib/debug';
import type { Group } from '../../types/groups';

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

export default function AdminAnnouncements() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const displayName = user?.displayName ?? user?.email ?? undefined;
  const userRole = useAuthStore((s) => s.userRole);

  const { groups: allGroups } = useAllGroups();
  const { groups: myAnnouncementGroups } = useMyAnnouncementGroups();

  const availableGroups: Group[] = useMemo(() => {
    if (isSuperAdmin) return allGroups;
    if (userRole === 'admin') return myAnnouncementGroups;
    return [];
  }, [isSuperAdmin, userRole, allGroups, myAnnouncementGroups]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (availableGroups.length === 0) {
      setSelectedGroupId(null);
      return;
    }
    if (!selectedGroupId || !availableGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(availableGroups[0].id);
    }
  }, [availableGroups, selectedGroupId]);

  const { announcements, events, loading: feedLoading } = useGroupFeed(selectedGroupId);
  const selectedGroup = availableGroups.find((g) => g.id === selectedGroupId) ?? null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>Этот раздел доступен только администраторам.</p>
        <Link to="/home" className="text-blue-600 underline">← На главную</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <Helmet>
        <title>Кабинет объявлений — {SITE_NAME}</title>
      </Helmet>

      <div>
        <Link to="/admin/content" className="text-sm text-[#2F6DB5] hover:underline">
          ← К управлению контентом
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-[#2C3E50] sm:text-3xl">
          📢 Кабинет объявлений
        </h1>
        <p className="mt-1 text-sm text-[#556476]">
          Объявления и события, которые увидят студенты выбранной группы на главной.
        </p>
      </div>

      {availableGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DDE5EE] bg-[#F9FBFF] p-5 text-sm text-[#556476]">
          {isSuperAdmin
            ? 'Групп пока нет. Создайте группу в разделе «👥 Группы» на админ-панели.'
            : 'Вас пока не назначили администратором объявлений ни в одной группе. Попросите супер-админа.'}
        </div>
      ) : (
        <>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
              Группа
            </span>
            <select
              value={selectedGroupId ?? ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.memberIds.length} уч.)
                </option>
              ))}
            </select>
          </label>

          {selectedGroup && user && (
            <>
              <NewAnnouncementForm
                groupId={selectedGroup.id}
                userId={user.uid}
                createdByName={displayName}
              />
              <NewEventForm
                groupId={selectedGroup.id}
                userId={user.uid}
                createdByName={displayName}
              />

              <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                  Объявления ({announcements.length})
                </h2>
                {feedLoading ? (
                  <div className="text-sm text-gray-500">Загрузка…</div>
                ) : announcements.length === 0 ? (
                  <div className="text-sm text-gray-500">Пока нет объявлений.</div>
                ) : (
                  <ul className="space-y-2">
                    {announcements.map((ann) => (
                      <li
                        key={ann.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-[#2C3E50]">{ann.text}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(ann.createdAt?.toDate?.() ?? null)}
                            {ann.createdByName ? ` · ${ann.createdByName}` : ''}
                          </p>
                        </div>
                        <DeleteButton
                          onDelete={async () => {
                            await deleteGroupAnnouncement(selectedGroup.id, ann.id);
                          }}
                          confirm="Удалить это объявление?"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold">События ({events.length})</h2>
                {feedLoading ? (
                  <div className="text-sm text-gray-500">Загрузка…</div>
                ) : events.length === 0 ? (
                  <div className="text-sm text-gray-500">Пока нет событий.</div>
                ) : (
                  <ul className="space-y-2">
                    {events.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                            {ev.dateLabel}
                          </p>
                          <p className="mt-1 text-sm text-[#2C3E50]">{ev.text}</p>
                          {ev.zoomLink && (
                            <a
                              href={ev.zoomLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block text-xs text-blue-600 underline"
                            >
                              Zoom-ссылка
                            </a>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Добавлено: {formatDate(ev.createdAt?.toDate?.() ?? null)}
                            {ev.createdByName ? ` · ${ev.createdByName}` : ''}
                          </p>
                        </div>
                        <DeleteButton
                          onDelete={async () => {
                            await deleteGroupEvent(selectedGroup.id, ev.id);
                          }}
                          confirm="Удалить это событие?"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function NewAnnouncementForm({
  groupId,
  userId,
  createdByName,
}: {
  groupId: string;
  userId: string;
  createdByName?: string;
}) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createGroupAnnouncement(groupId, { text, createdByName }, userId);
      setText('');
    } catch (err) {
      debugError('createGroupAnnouncement failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-[#2C3E50]">Новое объявление</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Например: «В субботу пробный экзамен по клинической психологии»"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={saving || text.trim().length < 3}
        className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняем…' : 'Опубликовать'}
      </button>
    </form>
  );
}

function NewEventForm({
  groupId,
  userId,
  createdByName,
}: {
  groupId: string;
  userId: string;
  createdByName?: string;
}) {
  const [dateLabel, setDateLabel] = useState('');
  const [text, setText] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createGroupEvent(
        groupId,
        { text, dateLabel, zoomLink: zoomLink || undefined, createdByName },
        userId
      );
      setDateLabel('');
      setText('');
      setZoomLink('');
    } catch (err) {
      debugError('createGroupEvent failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-[#2C3E50]">Новое событие</h3>
      <input
        type="text"
        value={dateLabel}
        onChange={(e) => setDateLabel(e.target.value)}
        placeholder="Дата или период (например: «15 мая, 18:00»)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Описание события"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <input
        type="url"
        value={zoomLink}
        onChange={(e) => setZoomLink(e.target.value)}
        placeholder="Zoom-ссылка (опционально)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={saving || text.trim().length < 3 || dateLabel.trim().length < 2}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняем…' : 'Опубликовать событие'}
      </button>
    </form>
  );
}

function DeleteButton({ onDelete, confirm }: { onDelete: () => Promise<void>; confirm: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm(confirm)) return;
        setBusy(true);
        try {
          await onDelete();
        } catch (err) {
          debugError('delete failed', err);
          window.alert(err instanceof Error ? err.message : 'Ошибка удаления');
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
    >
      {busy ? '…' : 'Удалить'}
    </button>
  );
}

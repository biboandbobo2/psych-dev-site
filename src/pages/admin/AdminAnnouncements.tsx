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
import type { GroupEvent } from '../../types/groupFeed';

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
              <NewAssignmentForm
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

              <EventsList
                title="События"
                emptyLabel="Пока нет событий."
                confirmDelete="Удалить это событие?"
                loading={feedLoading}
                items={events.filter((e) => e.kind !== 'assignment')}
                onDelete={(id) => deleteGroupEvent(selectedGroup.id, id)}
                formatDate={formatDate}
              />

              <EventsList
                title="Задания"
                emptyLabel="Пока нет заданий."
                confirmDelete="Удалить это задание?"
                loading={feedLoading}
                items={events.filter((e) => e.kind === 'assignment')}
                onDelete={(id) => deleteGroupEvent(selectedGroup.id, id)}
                formatDate={formatDate}
              />
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
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [text, setText] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    text.trim().length >= 3 && startLocal.length > 0 && endLocal.length > 0;

  const handleStartChange = (value: string) => {
    setStartLocal(value);
    if (value && !endLocal) {
      const startMs = Date.parse(value);
      if (!Number.isNaN(startMs)) {
        const defaultEnd = new Date(startMs + 90 * 60 * 1000);
        setEndLocal(localInputValue(defaultEnd, isAllDay));
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const startMs = Date.parse(startLocal);
      const endMs = Date.parse(endLocal);
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
        throw new Error('Укажите корректные дату и время');
      }
      if (endMs <= startMs) {
        throw new Error('Время окончания должно быть позже начала');
      }
      await createGroupEvent(
        groupId,
        {
          text,
          startAtMs: startMs,
          endAtMs: endMs,
          isAllDay,
          zoomLink: zoomLink || undefined,
          createdByName,
        },
        userId
      );
      setStartLocal('');
      setEndLocal('');
      setIsAllDay(false);
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
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-1 min-w-[180px] flex-col gap-1 text-xs text-gray-600">
          Начало
          <input
            type={isAllDay ? 'date' : 'datetime-local'}
            value={startLocal}
            onChange={(e) => handleStartChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={saving}
            required
          />
        </label>
        <label className="flex flex-1 min-w-[180px] flex-col gap-1 text-xs text-gray-600">
          Окончание
          <input
            type={isAllDay ? 'date' : 'datetime-local'}
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={saving}
            required
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
          disabled={saving}
        />
        Весь день
      </label>
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
        disabled={saving || !canSubmit}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняем…' : 'Опубликовать событие'}
      </button>
    </form>
  );
}

function localInputValue(date: Date, allDay: boolean): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  if (allDay) return `${yyyy}-${mm}-${dd}`;
  return `${yyyy}-${mm}-${dd}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function NewAssignmentForm({
  groupId,
  userId,
  createdByName,
}: {
  groupId: string;
  userId: string;
  createdByName?: string;
}) {
  const [dueDate, setDueDate] = useState('');
  const [text, setText] = useState('');
  const [longText, setLongText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createGroupEvent(
        groupId,
        {
          kind: 'assignment',
          text,
          dueDate,
          longText: longText.trim() || undefined,
          createdByName,
        },
        userId
      );
      setDueDate('');
      setText('');
      setLongText('');
    } catch (err) {
      debugError('createGroupAssignment failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-[#2C3E50]">Новое задание</h3>
      <label className="block">
        <span className="text-xs text-gray-500">Дедлайн</span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          disabled={saving}
        />
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Короткое описание (1–2 строки, будет видно на главной)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <textarea
        value={longText}
        onChange={(e) => setLongText(e.target.value)}
        rows={6}
        placeholder="Полный текст задания (опционально) — откроется по кнопке «Читать полностью» на главной"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={saving || text.trim().length < 3 || !dueDate}
        className="rounded-md bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняем…' : 'Опубликовать задание'}
      </button>
    </form>
  );
}

function EventsList({
  title,
  emptyLabel,
  confirmDelete,
  loading,
  items,
  onDelete,
  formatDate,
}: {
  title: string;
  emptyLabel: string;
  confirmDelete: string;
  loading: boolean;
  items: GroupEvent[];
  onDelete: (id: string) => Promise<void>;
  formatDate: (date: Date | null) => string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {title} ({items.length})
      </h2>
      {loading ? (
        <div className="text-sm text-gray-500">Загрузка…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">{emptyLabel}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((ev) => (
            <li
              key={ev.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  {ev.kind === 'assignment'
                    ? `Дедлайн: ${formatDueDateRu(ev.dueDate)}`
                    : ev.dateLabel}
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
              <DeleteButton onDelete={() => onDelete(ev.id)} confirm={confirmDelete} />
            </li>
          ))}
        </ul>
      )}
    </section>
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

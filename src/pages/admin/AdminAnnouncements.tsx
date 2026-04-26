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
import type { GroupEvent, PlatformNewsType } from '../../types/groupFeed';
import { isEveryoneGroup } from '../../../shared/groups/everyoneGroup';
import {
  publishToGroups,
  formatPublishStatus,
  type GroupRef,
} from './announcementsMultiPublish';
import { EditModal, type EditTarget } from './announcements/EditModal';

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

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (availableGroups.length === 0) {
      setSelectedGroupIds([]);
      return;
    }
    setSelectedGroupIds((prev) => {
      const filtered = prev.filter((id) =>
        availableGroups.some((g) => g.id === id)
      );
      if (filtered.length > 0) return filtered;
      return [availableGroups[0].id];
    });
  }, [availableGroups]);

  const toggleGroupId = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedGroups: GroupRef[] = useMemo(
    () =>
      selectedGroupIds
        .map((id) => availableGroups.find((g) => g.id === id))
        .filter((g): g is Group => Boolean(g))
        .map((g) => ({ id: g.id, name: g.name })),
    [selectedGroupIds, availableGroups]
  );

  const previewGroupId = selectedGroupIds[0] ?? null;
  const { announcements, events, loading: feedLoading } = useGroupFeed(previewGroupId);
  const previewGroup = availableGroups.find((g) => g.id === previewGroupId) ?? null;
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

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
          <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
              Получатели (одна или несколько групп)
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {availableGroups.map((g) => {
                const checked = selectedGroupIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      checked
                        ? 'border-purple-300 bg-purple-50 text-[#2C3E50]'
                        : 'border-gray-200 text-[#2C3E50] hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroupId(g.id)}
                    />
                    <span className="flex-1">{g.name}</span>
                    <span className="text-xs text-gray-500">
                      {g.memberIds.length} уч.
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedGroupIds.length === 0 && (
              <p className="mt-2 text-xs text-rose-700">
                Выберите хотя бы одну группу.
              </p>
            )}
          </fieldset>

          {user && (
            <>
              <NewAnnouncementForm
                groups={selectedGroups}
                userId={user.uid}
                createdByName={displayName}
                isEveryone={selectedGroups.some((g) => isEveryoneGroup(g.id))}
              />
              <NewEventForm
                groups={selectedGroups}
                userId={user.uid}
                createdByName={displayName}
              />
              <NewAssignmentForm
                groups={selectedGroups}
                userId={user.uid}
                createdByName={displayName}
              />

              {previewGroup && (
                <>
                  <p className="text-xs text-[#8A97AB]">
                    Существующие записи показаны для группы «{previewGroup.name}»
                    {selectedGroupIds.length > 1
                      ? ' (первая из выбранных).'
                      : '.'}
                  </p>

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
                            <ItemActions
                              onEdit={() =>
                                setEditTarget({
                                  kind: 'announcement',
                                  groupId: previewGroup.id,
                                  item: ann,
                                })
                              }
                              onDelete={async () => {
                                await deleteGroupAnnouncement(previewGroup.id, ann.id);
                              }}
                              confirmDelete="Удалить это объявление?"
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
                    onDelete={(id) => deleteGroupEvent(previewGroup.id, id)}
                    onEdit={(item) =>
                      setEditTarget({ kind: 'event', groupId: previewGroup.id, item })
                    }
                    formatDate={formatDate}
                  />

                  <EventsList
                    title="Задания"
                    emptyLabel="Пока нет заданий."
                    confirmDelete="Удалить это задание?"
                    loading={feedLoading}
                    items={events.filter((e) => e.kind === 'assignment')}
                    onDelete={(id) => deleteGroupEvent(previewGroup.id, id)}
                    onEdit={(item) =>
                      setEditTarget({ kind: 'assignment', groupId: previewGroup.id, item })
                    }
                    formatDate={formatDate}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      <EditModal target={editTarget} onClose={() => setEditTarget(null)} />
    </div>
  );
}

type StatusBanner =
  | { kind: 'success' | 'partial' | 'error'; message: string }
  | null;

function StatusLine({ status }: { status: StatusBanner }) {
  if (!status) return null;
  const cls =
    status.kind === 'success'
      ? 'text-emerald-700'
      : status.kind === 'partial'
      ? 'text-amber-700'
      : 'text-rose-700';
  return <p className={`text-xs ${cls}`}>{status.message}</p>;
}

function NewAnnouncementForm({
  groups,
  userId,
  createdByName,
  isEveryone,
}: {
  groups: GroupRef[];
  userId: string;
  createdByName?: string;
  isEveryone: boolean;
}) {
  const [text, setText] = useState('');
  const [newsType, setNewsType] = useState<PlatformNewsType>('tech');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusBanner>(null);

  const noGroupsSelected = groups.length === 0;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (noGroupsSelected) return;
    setSaving(true);
    setStatus(null);
    const result = await publishToGroups(groups, (groupId) =>
      createGroupAnnouncement(
        groupId,
        {
          text,
          createdByName,
          ...(isEveryoneGroup(groupId) ? { newsType } : {}),
        },
        userId,
      )
    );
    if (result.failures.length > 0) {
      debugError('createGroupAnnouncement partial failure', result.failures);
    }
    const formatted = formatPublishStatus(result);
    setStatus(formatted);
    if (formatted.kind === 'success') setText('');
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-[#2C3E50]">
        {isEveryone ? 'Новая новость платформы' : 'Новое объявление'}
      </h3>
      {isEveryone && (
        <fieldset className="space-y-1 rounded-md border border-dashed border-gray-300 bg-[#F9FBFF] p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
            Тип новости
          </legend>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[#2C3E50]">
            <input
              type="radio"
              name="newsType"
              value="tech"
              checked={newsType === 'tech'}
              onChange={() => setNewsType('tech')}
              disabled={saving}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Техническая</span>
              <span className="ml-1 text-xs text-[#6B7A8D]">
                (новая кнопка, фича, улучшение платформы)
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[#2C3E50]">
            <input
              type="radio"
              name="newsType"
              value="content"
              checked={newsType === 'content'}
              onChange={() => setNewsType('content')}
              disabled={saving}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Контентная</span>
              <span className="ml-1 text-xs text-[#6B7A8D]">
                (новая лекция, курс, книга в RAG)
              </span>
            </span>
          </label>
        </fieldset>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={
          isEveryone
            ? 'Например: «Добавили книгу Выготского в RAG — теперь можно задавать вопросы по ней»'
            : 'Например: «В субботу пробный экзамен по клинической психологии»'
        }
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <StatusLine status={status} />
      <button
        type="submit"
        disabled={saving || text.trim().length < 3 || noGroupsSelected}
        title={noGroupsSelected ? 'Выберите хотя бы одну группу' : undefined}
        className="rounded-md bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {saving
          ? 'Сохраняем…'
          : groups.length > 1
          ? `Опубликовать в ${groups.length} группах`
          : 'Опубликовать'}
      </button>
    </form>
  );
}

function NewEventForm({
  groups,
  userId,
  createdByName,
}: {
  groups: GroupRef[];
  userId: string;
  createdByName?: string;
}) {
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [text, setText] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [siteLink, setSiteLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusBanner>(null);

  const noGroupsSelected = groups.length === 0;
  const canSubmit =
    !noGroupsSelected &&
    text.trim().length >= 3 &&
    startLocal.length > 0 &&
    endLocal.length > 0;

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
    if (noGroupsSelected) return;
    setSaving(true);
    setStatus(null);
    const startMs = Date.parse(startLocal);
    const endMs = Date.parse(endLocal);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setStatus({ kind: 'error', message: 'Укажите корректные дату и время' });
      setSaving(false);
      return;
    }
    if (endMs <= startMs) {
      setStatus({
        kind: 'error',
        message: 'Время окончания должно быть позже начала',
      });
      setSaving(false);
      return;
    }
    const result = await publishToGroups(groups, (groupId) =>
      createGroupEvent(
        groupId,
        {
          text,
          startAtMs: startMs,
          endAtMs: endMs,
          isAllDay,
          zoomLink: zoomLink || undefined,
          siteLink: siteLink || undefined,
          createdByName,
        },
        userId
      )
    );
    if (result.failures.length > 0) {
      debugError('createGroupEvent partial failure', result.failures);
    }
    const formatted = formatPublishStatus(result);
    setStatus(formatted);
    if (formatted.kind === 'success') {
      setStartLocal('');
      setEndLocal('');
      setIsAllDay(false);
      setText('');
      setZoomLink('');
      setSiteLink('');
    }
    setSaving(false);
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
      <input
        type="url"
        value={siteLink}
        onChange={(e) => setSiteLink(e.target.value)}
        placeholder="Ссылка на страницу сайта (опционально)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        disabled={saving}
      />
      <StatusLine status={status} />
      <button
        type="submit"
        disabled={saving || !canSubmit}
        title={noGroupsSelected ? 'Выберите хотя бы одну группу' : undefined}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving
          ? 'Сохраняем…'
          : groups.length > 1
          ? `Опубликовать событие в ${groups.length} группах`
          : 'Опубликовать событие'}
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
  groups,
  userId,
  createdByName,
}: {
  groups: GroupRef[];
  userId: string;
  createdByName?: string;
}) {
  const [dueDate, setDueDate] = useState('');
  const [text, setText] = useState('');
  const [longText, setLongText] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<StatusBanner>(null);

  const noGroupsSelected = groups.length === 0;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (noGroupsSelected) return;
    setSaving(true);
    setStatus(null);
    const result = await publishToGroups(groups, (groupId) =>
      createGroupEvent(
        groupId,
        {
          kind: 'assignment',
          text,
          dueDate,
          longText: longText.trim() || undefined,
          createdByName,
        },
        userId
      )
    );
    if (result.failures.length > 0) {
      debugError('createGroupAssignment partial failure', result.failures);
    }
    const formatted = formatPublishStatus(result);
    setStatus(formatted);
    if (formatted.kind === 'success') {
      setDueDate('');
      setText('');
      setLongText('');
    }
    setSaving(false);
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
      <StatusLine status={status} />
      <button
        type="submit"
        disabled={
          saving || text.trim().length < 3 || !dueDate || noGroupsSelected
        }
        title={noGroupsSelected ? 'Выберите хотя бы одну группу' : undefined}
        className="rounded-md bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {saving
          ? 'Сохраняем…'
          : groups.length > 1
          ? `Опубликовать задание в ${groups.length} группах`
          : 'Опубликовать задание'}
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
  onEdit,
  formatDate,
}: {
  title: string;
  emptyLabel: string;
  confirmDelete: string;
  loading: boolean;
  items: GroupEvent[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (item: GroupEvent) => void;
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
              <ItemActions
                onEdit={() => onEdit(ev)}
                onDelete={() => onDelete(ev.id)}
                confirmDelete={confirmDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemActions({
  onEdit,
  onDelete,
  confirmDelete,
}: {
  onEdit: () => void;
  onDelete: () => Promise<void>;
  confirmDelete: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
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
          if (!window.confirm(confirmDelete)) return;
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
        {busy ? '…' : '🗑 Удалить'}
      </button>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../routes';
import { useAuth } from '../../auth/AuthProvider';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAllGroups } from '../../hooks/useAllGroups';
import { useMyAnnouncementGroups } from '../../hooks/useMyAnnouncementGroups';
import { useAdminCalendarFeed } from '../../hooks/useAdminCalendarFeed';
import type { Group } from '../../types/groups';
import { EditModal, type EditTarget } from './announcements/EditModal';
import { CreateModal, type CreateKind } from './announcements/CreateModal';
import {
  CalendarToolbar,
  ALL_GROUPS_VALUE,
} from './announcements/calendar/CalendarToolbar';
import { MonthGrid } from './announcements/calendar/MonthGrid';
import {
  AdminFeedFilters,
  type FeedFilterKind,
} from './announcements/AdminFeedFilters';
import { AdminFeedList } from './announcements/AdminFeedList';

const GROUP_ACCENTS = [
  'border-l-2 border-indigo-400',
  'border-l-2 border-emerald-400',
  'border-l-2 border-rose-400',
  'border-l-2 border-amber-400',
  'border-l-2 border-cyan-400',
  'border-l-2 border-violet-400',
];

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

  // Toolbar selector: ALL_GROUPS_VALUE или одна группа.
  const [selectedGroupId, setSelectedGroupId] = useState<string>(ALL_GROUPS_VALUE);
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [createPrefillDate, setCreatePrefillDate] = useState<Date | null>(null);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [feedFilterKind, setFeedFilterKind] = useState<FeedFilterKind>('all');

  // Сброс selectedGroupId если группы загрузились/изменились и текущая больше недоступна.
  useEffect(() => {
    if (selectedGroupId === ALL_GROUPS_VALUE) return;
    if (!availableGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(ALL_GROUPS_VALUE);
    }
  }, [availableGroups, selectedGroupId]);

  const subscribedGroupIds = useMemo(
    () =>
      selectedGroupId === ALL_GROUPS_VALUE
        ? availableGroups.map((g) => g.id)
        : availableGroups
            .filter((g) => g.id === selectedGroupId)
            .map((g) => g.id),
    [selectedGroupId, availableGroups]
  );

  const { announcements, events } = useAdminCalendarFeed(subscribedGroupIds);

  const groupNameById = useMemo(
    () => new Map(availableGroups.map((g) => [g.id, g.name])),
    [availableGroups]
  );

  const groupAccentByGroupId = useMemo(() => {
    const map = new Map<string, string>();
    availableGroups.forEach((g, idx) => {
      map.set(g.id, GROUP_ACCENTS[idx % GROUP_ACCENTS.length]);
    });
    return map;
  }, [availableGroups]);

  const getGroupAccent = (groupId: string): string | undefined =>
    selectedGroupId === ALL_GROUPS_VALUE
      ? groupAccentByGroupId.get(groupId)
      : undefined;

  // Список под календарём — фильтруем по типу (announcements/event/assignment/all).
  const filteredAnnouncements = useMemo(() => {
    if (feedFilterKind === 'all' || feedFilterKind === 'announcement') {
      return announcements;
    }
    return [];
  }, [announcements, feedFilterKind]);

  const filteredEvents = useMemo(() => {
    if (feedFilterKind === 'all') return events;
    if (feedFilterKind === 'event') return events.filter((e) => e.kind !== 'assignment');
    if (feedFilterKind === 'assignment') return events.filter((e) => e.kind === 'assignment');
    return [];
  }, [events, feedFilterKind]);

  const totalCount = filteredAnnouncements.length + filteredEvents.length;

  // Default groups для CreateModal.
  const defaultGroupIdsForCreate =
    selectedGroupId === ALL_GROUPS_VALUE
      ? availableGroups.length > 0
        ? [availableGroups[0].id]
        : []
      : [selectedGroupId];

  const openCreate = (date: Date | null, kind: CreateKind = 'event') => {
    setCreatePrefillDate(date);
    setCreateKind(kind);
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>Этот раздел доступен только администраторам.</p>
        <Link to="/home" className="text-blue-600 underline">
          ← На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <Helmet>
        <title>Календарь админа — {SITE_NAME}</title>
      </Helmet>

      <div>
        <Link to="/admin/content" className="text-sm text-[#2F6DB5] hover:underline">
          ← К управлению контентом
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-[#2C3E50] sm:text-3xl">
          📢 Кабинет объявлений
        </h1>
        <p className="mt-1 text-sm text-[#556476]">
          Календарь событий и заданий, общая лента объявлений. Клик по дню — создать запись.
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
          <CalendarToolbar
            monthDate={monthDate}
            onMonthChange={setMonthDate}
            groups={availableGroups}
            selectedGroupId={selectedGroupId}
            onGroupChange={setSelectedGroupId}
            onCreateClick={() => openCreate(null, 'event')}
          />

          <MonthGrid
            monthDate={monthDate}
            events={events}
            getGroupAccent={getGroupAccent}
            onCreateClick={(date) => openCreate(date, 'event')}
            onItemClick={(item) =>
              setEditTarget({
                kind: item.kind === 'assignment' ? 'assignment' : 'event',
                groupId: item.groupId,
                item,
              })
            }
          />

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#2C3E50]">Лента записей</h2>
              <AdminFeedFilters
                kind={feedFilterKind}
                onKindChange={setFeedFilterKind}
                totalCount={totalCount}
              />
            </div>
            <AdminFeedList
              announcements={filteredAnnouncements}
              events={filteredEvents}
              groupNameById={groupNameById}
              onEdit={setEditTarget}
            />
          </section>
        </>
      )}

      <EditModal target={editTarget} onClose={() => setEditTarget(null)} />

      {user && createKind && (
        <CreateModal
          open={createKind !== null}
          initialKind={createKind}
          availableGroups={availableGroups}
          defaultGroupIds={defaultGroupIdsForCreate}
          prefillDate={createPrefillDate}
          userId={user.uid}
          createdByName={displayName}
          onClose={() => {
            setCreateKind(null);
            setCreatePrefillDate(null);
          }}
        />
      )}
    </div>
  );
}

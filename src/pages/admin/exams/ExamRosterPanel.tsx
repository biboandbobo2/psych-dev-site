import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import type { Exam, ExamSlot } from '../../../types/exam';
import type { Group } from '../../../types/groups';
import type { UserRecord } from '../../../hooks/useAllUsers';

interface ExamRosterPanelProps {
  exam: Exam;
  slots: ExamSlot[];
  groups: Group[];
  users: UserRecord[];
}

interface BookingRow {
  userId: string;
  slotId: string;
  userName: string;
  userEmail: string;
}

interface RosterRow {
  uid: string;
  name: string;
  email: string | null;
  slotStart: Timestamp | null;
}

interface RosterByCategory {
  passed: RosterRow[];
  upcoming: RosterRow[];
  unbooked: RosterRow[];
}

export function ExamRosterPanel({ exam, slots, groups, users }: ExamRosterPanelProps) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const ref = collection(db, 'exams', exam.id, 'bookingDetails');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const next: BookingRow[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            userId: typeof data.userId === 'string' ? data.userId : '',
            slotId: typeof data.slotId === 'string' ? data.slotId : '',
            userName: typeof data.userName === 'string' ? data.userName : '',
            userEmail: typeof data.userEmail === 'string' ? data.userEmail : '',
          };
        });
        setBookings(next);
        setLoading(false);
      },
      (err) => {
        debugError('ExamRosterPanel: bookingDetails snapshot error', err);
        setError('Не удалось загрузить список броней');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [exam.id]);

  const roster = useMemo<Record<string, RosterByCategory>>(() => {
    const now = Date.now();
    const slotById = new Map(slots.map((s) => [s.id, s] as const));
    const userById = new Map(users.map((u) => [u.uid, u] as const));
    const bookingByUid = new Map(bookings.map((b) => [b.userId, b] as const));

    const result: Record<string, RosterByCategory> = {};
    for (const gid of exam.groupIds) {
      const group = groups.find((g) => g.id === gid);
      const memberIds = group?.memberIds ?? [];
      const cat: RosterByCategory = { passed: [], upcoming: [], unbooked: [] };

      for (const uid of memberIds) {
        const user = userById.get(uid);
        const booking = bookingByUid.get(uid);
        const name =
          booking?.userName?.trim() ||
          user?.displayName?.trim() ||
          user?.email?.trim() ||
          uid;
        const email = booking?.userEmail || user?.email || null;

        if (!booking) {
          cat.unbooked.push({ uid, name, email, slotStart: null });
          continue;
        }
        const slot = slotById.get(booking.slotId);
        const endMs = slot?.endAt?.toMillis?.() ?? 0;
        if (slot && endMs < now) {
          cat.passed.push({ uid, name, email, slotStart: slot.startAt });
        } else {
          cat.upcoming.push({ uid, name, email, slotStart: slot?.startAt ?? null });
        }
      }

      cat.passed.sort(
        (a, b) => (b.slotStart?.toMillis?.() ?? 0) - (a.slotStart?.toMillis?.() ?? 0),
      );
      cat.upcoming.sort(
        (a, b) => (a.slotStart?.toMillis?.() ?? 0) - (b.slotStart?.toMillis?.() ?? 0),
      );
      cat.unbooked.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      result[gid] = cat;
    }
    return result;
  }, [bookings, slots, users, groups, exam.groupIds]);

  if (loading) {
    return <p className="text-sm text-muted">Загружаю список студентов…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {exam.groupIds.map((gid) => {
        const group = groups.find((g) => g.id === gid);
        const groupName = group?.name ?? gid;
        const cat = roster[gid];
        return (
          <div key={gid} className="rounded-2xl border border-border bg-card2 p-4">
            <h3 className="text-base font-semibold text-fg">{groupName}</h3>
            <div className="mt-3 space-y-4">
              <RosterSection
                title="Сдали"
                emptyText="Пока никто"
                tone="success"
                rows={cat?.passed ?? []}
              />
              <RosterSection
                title="Записаны, ждут"
                emptyText="Никто не записан"
                tone="info"
                rows={cat?.upcoming ?? []}
              />
              <RosterSection
                title="Не записаны"
                emptyText="Все записаны"
                tone="muted"
                rows={cat?.unbooked ?? []}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RosterSectionProps {
  title: string;
  emptyText: string;
  rows: RosterRow[];
  tone: 'success' | 'info' | 'muted';
}

function RosterSection({ title, emptyText, rows, tone }: RosterSectionProps) {
  const headerCls =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'info'
        ? 'text-indigo-700'
        : 'text-muted';
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${headerCls}`}>
        {title} ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-muted">{emptyText}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {rows.map((r) => (
            <li
              key={r.uid}
              className="flex items-baseline justify-between gap-2"
              title={r.email ?? undefined}
            >
              <span className="truncate text-fg">{r.name}</span>
              {r.slotStart && (
                <span className="shrink-0 text-xs text-muted">
                  {r.slotStart.toDate().toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

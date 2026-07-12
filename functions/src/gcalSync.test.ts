import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

const {
  FakeTimestamp, state, groupRef, eventsAdd, eventDocRef,
  mockListEvents, mockInsertEvent, mockPatchEvent, mockDeleteEvent,
} = vi.hoisted(() => {
  class FakeTimestamp {
    constructor(public ms: number) {}
    static fromMillis(ms: number) { return new FakeTimestamp(ms); }
    static now() { return new FakeTimestamp(0); }
    toMillis() { return this.ms; }
    isEqual(other: FakeTimestamp) { return other instanceof FakeTimestamp && other.ms === this.ms; }
  }
  const state = {
    // groups/{id} документы
    groups: new Map<string, Record<string, unknown>>(),
    // результат where('gcalEventId','==',id) в groups/{gid}/events
    eventQueryResults: new Map<string, { docs: Array<{ ref: { delete: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> } }>; empty: boolean }>(),
  };
  const groupRefs = new Map<string, { update: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }>();
  const groupRef = (id: string) => {
    if (!groupRefs.has(id)) groupRefs.set(id, { update: vi.fn(async () => {}), set: vi.fn(async () => {}) });
    return groupRefs.get(id)!;
  };
  const eventsAdd = vi.fn(async () => ({ id: 'new-doc' }));
  const eventDocRefs = new Map<string, { update: ReturnType<typeof vi.fn> }>();
  const eventDocRef = (id: string) => {
    if (!eventDocRefs.has(id)) eventDocRefs.set(id, { update: vi.fn(async () => {}) });
    return eventDocRefs.get(id)!;
  };
  return {
    FakeTimestamp,
    state,
    groupRef,
    eventsAdd,
    eventDocRef,
    mockListEvents: vi.fn(),
    mockInsertEvent: vi.fn(async () => ({ id: 'gcal-new-1' })),
    mockPatchEvent: vi.fn(async () => ({ id: 'gcal-old-1' })),
    mockDeleteEvent: vi.fn(async () => {}),
  };
});

vi.mock('firebase-admin/firestore', () => {
  const eventsCollection = (gid: string) => ({
    where: (_f: string, _op: string, gcalEventId: string) => {
      const result = state.eventQueryResults.get(`${gid}:${gcalEventId}`) ?? { docs: [], empty: true };
      return {
        get: async () => result,
        limit: () => ({ get: async () => result }),
      };
    },
    add: eventsAdd,
    doc: (id: string) => eventDocRef(id),
  });
  return {
    getFirestore: () => ({
      collection: (name: string) => {
        if (name !== 'groups') throw new Error(`unexpected collection ${name}`);
        return {
          get: async () => ({
            docs: Array.from(state.groups.entries()).map(([id, data]) => ({ id, data: () => data })),
          }),
          doc: (gid: string) => ({
            get: async () => ({
              exists: state.groups.has(gid),
              data: () => state.groups.get(gid),
            }),
            update: groupRef(gid).update,
            set: groupRef(gid).set,
            collection: (sub: string) => {
              if (sub !== 'events') throw new Error(`unexpected subcollection ${sub}`);
              return eventsCollection(gid);
            },
          }),
        };
      },
    }),
    FieldValue: {
      serverTimestamp: () => '__SERVER_TS__',
      delete: () => '__DELETE__',
    },
    Timestamp: FakeTimestamp,
  };
});

vi.mock('./lib/gcalClient.js', () => ({
  listEvents: mockListEvents,
  insertEvent: mockInsertEvent,
  patchEvent: mockPatchEvent,
  deleteEvent: mockDeleteEvent,
}));

vi.mock('./lib/debug.js', () => ({
  debugLog: vi.fn(),
  debugError: vi.fn(),
}));

vi.mock('firebase-functions/v1', () => {
  const scheduleChain = () => ({
    timeZone: () => ({ onRun: (fn: Function) => fn }),
    onRun: (fn: Function) => fn,
  });
  const api = {
    firestore: { document: () => ({ onWrite: (fn: Function) => fn }) },
    pubsub: { schedule: scheduleChain },
    runWith: () => ({ pubsub: { schedule: scheduleChain } }),
  };
  return { default: api, ...api };
});

// ── Import after mocks ─────────────────────────────────────────

import { syncGroupCalendars, onGroupEventWrite } from './gcalSync';

// ── Helpers ─────────────────────────────────────────────────────

const GID = 'group-1';
const CAL = 'cal-id@group.calendar.google.com';

function snap(data: Record<string, unknown> | null) {
  return { exists: data !== null, data: () => data ?? undefined };
}
function change(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  return { before: snap(before), after: snap(after) };
}
const ctx = { params: { groupId: GID, eventId: 'ev-1' } };

const t1 = FakeTimestamp.fromMillis(1_700_000_000_000);
const t2 = FakeTimestamp.fromMillis(1_700_000_600_000);

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'event',
    text: 'Лекция',
    dateLabel: '25.04 11:00',
    dueDate: null,
    startAt: t1,
    endAt: t2,
    isAllDay: false,
    gcalEventId: 'gcal-old-1',
    lastWriteSource: 'firestore',
    lastSyncedAt: t1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.groups.clear();
  state.eventQueryResults.clear();
  state.groups.set(GID, { gcalId: CAL, name: 'Поток 1' });
  mockInsertEvent.mockResolvedValue({ id: 'gcal-new-1' });
  mockPatchEvent.mockResolvedValue({ id: 'gcal-old-1' });
});

// ── onGroupEventWrite: anti-echo ────────────────────────────

describe('onGroupEventWrite anti-echo', () => {
  it('skips write that came from GCal import (lastWriteSource=gcal)', async () => {
    await (onGroupEventWrite as Function)(
      change(baseEvent(), baseEvent({ text: 'Изменено в GCal', lastWriteSource: 'gcal' })),
      ctx,
    );
    expect(mockPatchEvent).not.toHaveBeenCalled();
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('skips own after-export update touching only gcalEventId/lastSyncedAt', async () => {
    await (onGroupEventWrite as Function)(
      change(
        baseEvent({ gcalEventId: null, lastSyncedAt: null }),
        baseEvent({ gcalEventId: 'gcal-new-1', lastSyncedAt: t2 }),
      ),
      ctx,
    );
    expect(mockPatchEvent).not.toHaveBeenCalled();
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('skips own error-marker update touching only gcalSyncError/lastSyncedAt', async () => {
    await (onGroupEventWrite as Function)(
      change(baseEvent(), baseEvent({ gcalSyncError: 'boom', lastSyncedAt: t2 })),
      ctx,
    );
    expect(mockPatchEvent).not.toHaveBeenCalled();
  });

  it('does NOT skip when a user field changed alongside meta fields', async () => {
    await (onGroupEventWrite as Function)(
      change(baseEvent(), baseEvent({ text: 'Новый текст', lastSyncedAt: t2 })),
      ctx,
    );
    expect(mockPatchEvent).toHaveBeenCalledTimes(1);
  });
});

// ── onGroupEventWrite: export paths ─────────────────────────

describe('onGroupEventWrite export', () => {
  it('deletes GCal event when doc with gcalEventId is removed', async () => {
    await (onGroupEventWrite as Function)(change(baseEvent(), null), ctx);
    expect(mockDeleteEvent).toHaveBeenCalledWith(CAL, 'gcal-old-1');
  });

  it('does nothing on delete when doc had no gcalEventId', async () => {
    await (onGroupEventWrite as Function)(change(baseEvent({ gcalEventId: null }), null), ctx);
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it('skips assignments', async () => {
    await (onGroupEventWrite as Function)(
      change(null, baseEvent({ kind: 'assignment', gcalEventId: null })),
      ctx,
    );
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('skips when group has no gcalId', async () => {
    state.groups.set(GID, { name: 'Без календаря' });
    await (onGroupEventWrite as Function)(change(null, baseEvent({ gcalEventId: null })), ctx);
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('skips when startAt/endAt missing', async () => {
    await (onGroupEventWrite as Function)(
      change(null, baseEvent({ gcalEventId: null, startAt: null, endAt: null })),
      ctx,
    );
    expect(mockInsertEvent).not.toHaveBeenCalled();
  });

  it('inserts new event and writes back gcalEventId + lastSyncedAt', async () => {
    await (onGroupEventWrite as Function)(change(null, baseEvent({ gcalEventId: null })), ctx);

    expect(mockInsertEvent).toHaveBeenCalledTimes(1);
    expect(mockInsertEvent.mock.calls[0][0]).toBe(CAL);
    expect(eventDocRef('ev-1').update).toHaveBeenCalledWith({
      gcalEventId: 'gcal-new-1',
      lastSyncedAt: '__SERVER_TS__',
    });
  });

  it('patches existing event and refreshes lastSyncedAt only', async () => {
    await (onGroupEventWrite as Function)(
      change(baseEvent(), baseEvent({ text: 'Перенос' })),
      ctx,
    );

    expect(mockPatchEvent).toHaveBeenCalledTimes(1);
    expect(mockPatchEvent.mock.calls[0][0]).toBe(CAL);
    expect(mockPatchEvent.mock.calls[0][1]).toBe('gcal-old-1');
    expect(eventDocRef('ev-1').update).toHaveBeenCalledWith({ lastSyncedAt: '__SERVER_TS__' });
  });

  it('records gcalSyncError instead of throwing when export fails', async () => {
    mockPatchEvent.mockRejectedValue(new Error('quota'));
    await (onGroupEventWrite as Function)(
      change(baseEvent(), baseEvent({ text: 'Упадёт' })),
      ctx,
    );
    expect(eventDocRef('ev-1').update).toHaveBeenCalledWith({
      gcalSyncError: 'quota',
      lastSyncedAt: '__SERVER_TS__',
    });
  });
});

// ── syncGroupCalendars: import ──────────────────────────────

describe('syncGroupCalendars import', () => {
  const gcalTimed = (id: string, summary = 'Из GCal') => ({
    id,
    status: 'confirmed',
    summary,
    start: { dateTime: '2026-07-14T11:00:00+04:00' },
    end: { dateTime: '2026-07-14T12:00:00+04:00' },
  });

  it('skips groups without gcalId', async () => {
    state.groups.clear();
    state.groups.set('no-cal', { name: 'X' });
    await (syncGroupCalendars as Function)({});
    expect(mockListEvents).not.toHaveBeenCalled();
  });

  it('creates new Firestore doc with lastWriteSource=gcal', async () => {
    mockListEvents.mockResolvedValue({ events: [gcalTimed('g-1')], nextSyncToken: 'tok-1' });

    await (syncGroupCalendars as Function)({});

    expect(eventsAdd).toHaveBeenCalledTimes(1);
    const payload = eventsAdd.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.lastWriteSource).toBe('gcal');
    expect(payload.gcalEventId).toBe('g-1');
    expect(payload.kind).toBe('event');
    expect(payload.createdBy).toBe('gcal-sync');
    // синк-стейт обновлён новым токеном
    expect(groupRef(GID).set).toHaveBeenCalledWith(
      {
        gcalSyncState: {
          syncToken: 'tok-1',
          lastSyncedAt: '__SERVER_TS__',
          lastError: '__DELETE__',
        },
      },
      { merge: true },
    );
  });

  it('merges into existing doc matched by gcalEventId', async () => {
    const existingRef = { delete: vi.fn(async () => {}), set: vi.fn(async () => {}) };
    state.eventQueryResults.set(`${GID}:g-1`, { docs: [{ ref: existingRef }], empty: false });
    mockListEvents.mockResolvedValue({ events: [gcalTimed('g-1', 'Обновлено')], nextSyncToken: 'tok-2' });

    await (syncGroupCalendars as Function)({});

    expect(eventsAdd).not.toHaveBeenCalled();
    expect(existingRef.set).toHaveBeenCalledTimes(1);
    const [payload, opts] = existingRef.set.mock.calls[0];
    expect(payload.lastWriteSource).toBe('gcal');
    expect(opts).toEqual({ merge: true });
  });

  it('deletes Firestore docs for cancelled GCal events', async () => {
    const doomedRef = { delete: vi.fn(async () => {}), set: vi.fn(async () => {}) };
    state.eventQueryResults.set(`${GID}:g-dead`, { docs: [{ ref: doomedRef }], empty: false });
    mockListEvents.mockResolvedValue({
      events: [{ id: 'g-dead', status: 'cancelled' }],
      nextSyncToken: 'tok-3',
    });

    await (syncGroupCalendars as Function)({});

    expect(doomedRef.delete).toHaveBeenCalledTimes(1);
    expect(eventsAdd).not.toHaveBeenCalled();
  });

  it('falls back to full sync when syncToken is invalid', async () => {
    state.groups.set(GID, { gcalId: CAL, gcalSyncState: { syncToken: 'stale' } });
    mockListEvents
      .mockResolvedValueOnce({ events: [], nextSyncToken: undefined, syncTokenInvalid: true })
      .mockResolvedValueOnce({ events: [gcalTimed('g-2')], nextSyncToken: 'fresh' });

    await (syncGroupCalendars as Function)({});

    expect(mockListEvents).toHaveBeenNthCalledWith(1, CAL, 'stale');
    expect(mockListEvents).toHaveBeenNthCalledWith(2, CAL);
    expect(eventsAdd).toHaveBeenCalledTimes(1);
  });

  it('records lastError on group when sync throws', async () => {
    mockListEvents.mockRejectedValue(new Error('api down'));

    await (syncGroupCalendars as Function)({});

    expect(groupRef(GID).update).toHaveBeenCalledWith({
      'gcalSyncState.lastError': 'api down',
      'gcalSyncState.lastSyncedAt': '__SERVER_TS__',
    });
  });
});

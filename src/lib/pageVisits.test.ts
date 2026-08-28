import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDoc, writeBatch } from 'firebase/firestore';

const authState = vi.hoisted(() => ({ currentUser: null as { uid: string } | null }));

vi.mock('./firebase', () => ({
  auth: authState,
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
  getDoc: vi.fn(),
  increment: vi.fn((n: number) => ({ __inc: n })),
  serverTimestamp: vi.fn(() => 'server-ts'),
  writeBatch: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, next: (user: unknown) => void) => {
    queueMicrotask(() => next(authState.currentUser));
    return vi.fn();
  }),
}));

const getDocMock = vi.mocked(getDoc);
const writeBatchMock = vi.mocked(writeBatch);

function makeBatch() {
  return { set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
}

async function loadPageVisits() {
  return await import('./pageVisits');
}

describe('pageVisits: чистые помощники', () => {
  it('matchTrackedPage распознаёт все три лендинга и игнорирует прочее', async () => {
    const { matchTrackedPage } = await loadPageVisits();
    expect(matchTrackedPage('/vozrast')?.id).toBe('vozrast');
    expect(matchTrackedPage('/academy/retraining-psychologist-consultant-belgrade')?.id).toBe(
      'retraining-belgrade'
    );
    expect(matchTrackedPage('/academy/retraining-psychologist-consultant-tbilisi')?.id).toBe(
      'retraining-tbilisi'
    );
    expect(matchTrackedPage('/booking')?.id).toBe('booking');
    expect(matchTrackedPage('/booking/pricing')?.id).toBe('booking-pricing');
    expect(matchTrackedPage('/booking/unknown')).toBeNull();
    expect(matchTrackedPage('/home')).toBeNull();
  });

  it('scrollBucketFor раскладывает глубину по квартилям', async () => {
    const { scrollBucketFor } = await loadPageVisits();
    expect(scrollBucketFor(0)).toBe('p0');
    expect(scrollBucketFor(24)).toBe('p0');
    expect(scrollBucketFor(30)).toBe('p25');
    expect(scrollBucketFor(60)).toBe('p50');
    expect(scrollBucketFor(80)).toBe('p75');
    expect(scrollBucketFor(96)).toBe('p100');
  });

  it('dateKey/monthKey дают YYYY-MM-DD и YYYY-MM', async () => {
    const { dateKey, monthKey } = await loadPageVisits();
    const d = new Date(2026, 7, 28, 14, 5);
    expect(dateKey(d)).toBe('2026-08-28');
    expect(monthKey(d)).toBe('2026-08');
  });
});

describe('startPageVisit', () => {
  let batch: ReturnType<typeof makeBatch>;
  // startPageVisit вешает слушатели на document — без cleanup они переживают
  // resetModules и утекают в следующие тесты
  let cleanups: Array<() => void> = [];

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '';
    authState.currentUser = null;
    batch = makeBatch();
    writeBatchMock.mockReset();
    writeBatchMock.mockImplementation(() => batch as never);
    getDocMock.mockReset();
    getDocMock.mockResolvedValue({ exists: () => false } as never);
    vi.stubEnv('PROD', true);
  });

  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups = [];
    vi.unstubAllEnvs();
  });

  it('неотслеживаемый путь — ничего не пишет', async () => {
    const { startPageVisit } = await loadPageVisits();
    cleanups.push(startPageVisit('/home'));
    await new Promise((r) => setTimeout(r, 0));
    expect(writeBatchMock).not.toHaveBeenCalled();
  });

  it('вне прода — ничего не пишет', async () => {
    vi.stubEnv('PROD', false);
    const { startPageVisit } = await loadPageVisits();
    cleanups.push(startPageVisit('/vozrast'));
    await new Promise((r) => setTimeout(r, 0));
    expect(writeBatchMock).not.toHaveBeenCalled();
  });

  it('первый визит гостя: просмотр + уникальный гость + новый посетитель, батч из 2 записей', async () => {
    const { startPageVisit, dateKey } = await loadPageVisits();
    cleanups.push(startPageVisit('/vozrast'));
    await vi.waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(1));

    const today = dateKey(new Date());
    const [dailyRef, dailyPayload, dailyOpts] = batch.set.mock.calls[0] as [
      { path: string },
      Record<string, unknown>,
      { merge: boolean },
    ];
    expect(dailyRef.path).toBe(`page_visit_daily/vozrast__${today}`);
    expect(dailyOpts).toEqual({ merge: true });
    expect(dailyPayload.pageId).toBe('vozrast');
    expect(dailyPayload.date).toBe(today);
    expect(dailyPayload.views).toEqual({ __inc: 1 });
    expect(dailyPayload.uniqueGuests).toEqual({ __inc: 1 });
    expect(dailyPayload).not.toHaveProperty('uniqueUsers');
    expect(dailyPayload.newVisitors).toEqual({ __inc: 1 });
    expect(dailyPayload.hours).toEqual({ [String(new Date().getHours())]: { __inc: 1 } });

    const [monthRef, monthPayload] = batch.set.mock.calls[1] as [
      { path: string },
      Record<string, unknown>,
    ];
    expect(monthRef.path).toBe(`page_visit_months/${today.slice(0, 7)}`);
    expect(monthPayload.writes).toEqual({ __inc: 2 });
    expect(monthPayload.views).toEqual({ __inc: 1 });
  });

  it('повторный визит в тот же день — без уникальности и без newVisitors', async () => {
    const { startPageVisit, dateKey } = await loadPageVisits();
    localStorage.setItem('pv_seen_vozrast', dateKey(new Date()));
    cleanups.push(startPageVisit('/vozrast'));
    await vi.waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(1));

    const dailyPayload = batch.set.mock.calls[0][1] as Record<string, unknown>;
    expect(dailyPayload.views).toEqual({ __inc: 1 });
    expect(dailyPayload).not.toHaveProperty('uniqueGuests');
    expect(dailyPayload).not.toHaveProperty('uniqueUsers');
    expect(dailyPayload).not.toHaveProperty('newVisitors');
  });

  it('залогиненный посетитель считается в uniqueUsers', async () => {
    authState.currentUser = { uid: 'user-1' };
    const { startPageVisit } = await loadPageVisits();
    cleanups.push(startPageVisit('/vozrast'));
    await vi.waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(1));

    const dailyPayload = batch.set.mock.calls[0][1] as Record<string, unknown>;
    expect(dailyPayload.uniqueUsers).toEqual({ __inc: 1 });
    expect(dailyPayload).not.toHaveProperty('uniqueGuests');
  });

  it('автостоп: при writes >= MONTHLY_WRITE_CAP ничего не пишет и кэширует вердикт', async () => {
    const { startPageVisit, MONTHLY_WRITE_CAP, monthKey } = await loadPageVisits();
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ writes: MONTHLY_WRITE_CAP }),
    } as never);

    cleanups.push(startPageVisit('/vozrast'));
    await new Promise((r) => setTimeout(r, 10));
    expect(writeBatchMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(`pv_cap_${monthKey(new Date())}`)).toBe('reached');
  });

  it('cleanup шлёт scroll-бакет одной записью и только один раз', async () => {
    const { startPageVisit } = await loadPageVisits();
    const cleanup = startPageVisit('/vozrast');
    cleanups.push(cleanup);
    await vi.waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(1));

    cleanup();
    await vi.waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(2));
    const scrollPayload = batch.set.mock.calls[2][1] as Record<string, unknown>;
    expect(scrollPayload.scroll).toEqual({ p0: { __inc: 1 } });

    cleanup();
    await new Promise((r) => setTimeout(r, 10));
    expect(batch.commit).toHaveBeenCalledTimes(2);
  });

  it('клик по [data-track-click] пишется и дедупится в рамках просмотра', async () => {
    const { startPageVisit } = await loadPageVisits();
    document.body.innerHTML = '<a data-track-click="cta-hero" href="#">CTA</a>';
    cleanups.push(startPageVisit('/vozrast'));
    await vi.waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(1));

    const link = document.querySelector('a')!;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => expect(batch.commit).toHaveBeenCalledTimes(2));
    const clickPayload = batch.set.mock.calls[2][1] as Record<string, unknown>;
    expect(clickPayload.clicks).toEqual({ 'cta-hero': { __inc: 1 } });

    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    expect(batch.commit).toHaveBeenCalledTimes(2);
  });
});

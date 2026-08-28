import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import {
  DAILY_COLLECTION,
  MONTHS_COLLECTION,
  MONTHLY_WRITE_CAP,
  TRACKED_PAGES,
  dateKey,
  monthKey,
} from '../../../lib/pageVisits';

// PV-1: сводка посещений лендингов по агрегатам `page_visit_daily` +
// месячный счётчик `page_visit_months` (автостоп и оценка стоимости).
// Семантика цифр: «уникальные» — сумма дневных уникальных (один посетитель
// в N дней = N), «новые» — впервые на этой странице с этого браузера.

// Прайс Firestore (Blaze, сверх бесплатных квот) — для ячейки
// «гипотетическая стоимость»: сколько бы телеметрия стоила без квот.
const WRITE_PRICE_PER_100K = 0.18;
const READ_PRICE_PER_100K = 0.06;

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const SCROLL_STEPS = [
  { key: 'p25', label: '≥25%' },
  { key: 'p50', label: '≥50%' },
  { key: 'p75', label: '≥75%' },
  { key: 'p100', label: 'До конца' },
] as const;

interface DailyRow {
  pageId: string;
  views: number;
  uniqueGuests: number;
  uniqueUsers: number;
  newVisitors: number;
  weekday: number;
  hours: Record<string, number>;
  scroll: Record<string, number>;
  clicks: Record<string, number>;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function numMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) result[k] = v;
  }
  return result;
}

function pageLabel(pageId: string): string {
  return TRACKED_PAGES.find((page) => page.id === pageId)?.label ?? pageId;
}

export default function AdminPageVisits({ weeks }: { weeks: number }) {
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [monthWrites, setMonthWrites] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (rangeWeeks: number) => {
    setLoading(true);
    setError(null);
    try {
      const since = dateKey(new Date(Date.now() - rangeWeeks * 7 * 24 * 60 * 60 * 1000));
      const [snapshot, monthSnap] = await Promise.all([
        getDocs(query(collection(db, DAILY_COLLECTION), where('date', '>=', since))),
        getDoc(doc(db, MONTHS_COLLECTION, monthKey(new Date()))),
      ]);
      const loaded: DailyRow[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (typeof data.pageId !== 'string' || typeof data.date !== 'string') return;
        const parsed = new Date(`${data.date}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return;
        loaded.push({
          pageId: data.pageId,
          views: num(data.views),
          uniqueGuests: num(data.uniqueGuests),
          uniqueUsers: num(data.uniqueUsers),
          newVisitors: num(data.newVisitors),
          weekday: (parsed.getDay() + 6) % 7,
          hours: numMap(data.hours),
          scroll: numMap(data.scroll),
          clicks: numMap(data.clicks),
        });
      });
      setRows(loaded);
      setMonthWrites(monthSnap.exists() ? num(monthSnap.data().writes) : 0);
    } catch (err) {
      debugError('[AdminPageVisits] load failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить посещения');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(weeks);
  }, [load, weeks]);

  const summary = useMemo(() => {
    const perPage = new Map<
      string,
      {
        views: number;
        uniqueGuests: number;
        uniqueUsers: number;
        newVisitors: number;
        scroll: Record<string, number>;
        clicks: Map<string, number>;
      }
    >();
    const heat: number[][] = Array.from({ length: 7 }, () => Array<number>(24).fill(0));

    for (const row of rows) {
      if (!perPage.has(row.pageId)) {
        perPage.set(row.pageId, {
          views: 0,
          uniqueGuests: 0,
          uniqueUsers: 0,
          newVisitors: 0,
          scroll: {},
          clicks: new Map(),
        });
      }
      const bucket = perPage.get(row.pageId)!;
      bucket.views += row.views;
      bucket.uniqueGuests += row.uniqueGuests;
      bucket.uniqueUsers += row.uniqueUsers;
      bucket.newVisitors += row.newVisitors;
      for (const [k, v] of Object.entries(row.scroll)) {
        bucket.scroll[k] = (bucket.scroll[k] ?? 0) + v;
      }
      for (const [k, v] of Object.entries(row.clicks)) {
        bucket.clicks.set(k, (bucket.clicks.get(k) ?? 0) + v);
      }
      for (const [hour, count] of Object.entries(row.hours)) {
        const h = Number(hour);
        if (h >= 0 && h <= 23) heat[row.weekday][h] += count;
      }
    }

    const pages = Array.from(perPage.entries()).sort((a, b) => b[1].views - a[1].views);
    const heatMax = Math.max(1, ...heat.flat());
    const totals = pages.reduce(
      (acc, [, p]) => ({
        views: acc.views + p.views,
        uniqueGuests: acc.uniqueGuests + p.uniqueGuests,
        uniqueUsers: acc.uniqueUsers + p.uniqueUsers,
        newVisitors: acc.newVisitors + p.newVisitors,
      }),
      { views: 0, uniqueGuests: 0, uniqueUsers: 0, newVisitors: 0 }
    );
    return { pages, heat, heatMax, totals };
  }, [rows]);

  // Оценка «если бы не бесплатные квоты»: записи — точный месячный счётчик,
  // чтения — грубо (проверка автостопа ≈ 1 чтение на сессию ≈ просмотр).
  const hypotheticalCost =
    (monthWrites / 100_000) * WRITE_PRICE_PER_100K +
    (summary.totals.views / 100_000) * READ_PRICE_PER_100K;
  const capReached = monthWrites >= MONTHLY_WRITE_CAP;
  const capPercent = Math.min(100, Math.round((monthWrites / MONTHLY_WRITE_CAP) * 100));

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">👣 Посещения страниц</h2>

      {capReached && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Достигнут месячный максимум записей телеметрии ({MONTHLY_WRITE_CAP.toLocaleString('ru-RU')})
          — подсчёт посещений остановлен до 1 числа следующего месяца.
        </div>
      )}

      {loading && <div className="opacity-70">Загружаем посещения…</div>}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <VisitStatCard label="Просмотров за период" value={String(summary.totals.views)} />
            <VisitStatCard
              label="Уникальных (гости / с аккаунтом)"
              value={`${summary.totals.uniqueGuests} / ${summary.totals.uniqueUsers}`}
              hint="сумма дневных уникальных"
            />
            <VisitStatCard label="Новых посетителей" value={String(summary.totals.newVisitors)} />
            <VisitStatCard
              label="Записей телеметрии за месяц"
              value={`${monthWrites.toLocaleString('ru-RU')} (${capPercent}%)`}
              hint={`автостоп на ${MONTHLY_WRITE_CAP.toLocaleString('ru-RU')}`}
            />
            <VisitStatCard
              label="Гипотетическая стоимость / мес"
              value={`$${hypotheticalCost.toFixed(4)}`}
              hint="фактически $0 — в пределах бесплатных квот"
            />
          </div>

          {summary.pages.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted">
              Посещений за выбранный период нет. Отслеживаемые страницы задаются в
              src/lib/pageVisits.ts (TRACKED_PAGES), пишутся только с прода.
            </div>
          ) : (
            <>
              <VisitTable title="Страницы за период">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Страница</th>
                    <th className="p-2 text-right">Просмотры</th>
                    <th className="p-2 text-right">Уник. гости</th>
                    <th className="p-2 text-right">Уник. с аккаунтом</th>
                    <th className="p-2 text-right">Новые</th>
                    <th className="p-2 text-right">CTA-клики</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.pages.map(([pageId, page]) => (
                    <tr key={pageId} className="border-t border-gray-200">
                      <td className="p-2">{pageLabel(pageId)}</td>
                      <td className="p-2 text-right font-semibold">{page.views}</td>
                      <td className="p-2 text-right">{page.uniqueGuests}</td>
                      <td className="p-2 text-right">{page.uniqueUsers}</td>
                      <td className="p-2 text-right">{page.newVisitors}</td>
                      <td className="p-2 text-right">
                        {Array.from(page.clicks.values()).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </VisitTable>

              <VisitTable title="Тепловая карта: день недели × час (просмотры, локальное время посетителя)">
                <thead>
                  <tr>
                    <th className="p-1 text-left"></th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} className="p-1 text-center text-[10px] font-normal opacity-60">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.heat.map((hourCounts, weekday) => (
                    <tr key={weekday}>
                      <td className="p-1 pr-2 text-xs opacity-70">{WEEKDAY_LABELS[weekday]}</td>
                      {hourCounts.map((count, hour) => (
                        <td
                          key={hour}
                          title={`${WEEKDAY_LABELS[weekday]} ${hour}:00 — ${count}`}
                          className="h-6 w-6 min-w-6 text-center align-middle text-[10px]"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${
                              count > 0 ? 0.15 + 0.85 * (count / summary.heatMax) : 0
                            })`,
                            color: count / summary.heatMax > 0.55 ? '#fff' : undefined,
                          }}
                        >
                          {count > 0 ? count : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </VisitTable>

              <VisitTable title="Глубина скролла (доля просмотров, дочитавших до отметки)">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Страница</th>
                    {SCROLL_STEPS.map((step) => (
                      <th key={step.key} className="p-2 text-right">
                        {step.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.pages.map(([pageId, page]) => {
                    const total = Object.values(page.scroll).reduce((a, b) => a + b, 0);
                    const reached = (fromKey: string) =>
                      SCROLL_STEPS.slice(SCROLL_STEPS.findIndex((s) => s.key === fromKey)).reduce(
                        (acc, s) => acc + (page.scroll[s.key] ?? 0),
                        0
                      );
                    return (
                      <tr key={pageId} className="border-t border-gray-200">
                        <td className="p-2">{pageLabel(pageId)}</td>
                        {SCROLL_STEPS.map((step) => (
                          <td key={step.key} className="p-2 text-right">
                            {total > 0 ? `${Math.round((reached(step.key) / total) * 100)}%` : '·'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </VisitTable>

              <VisitTable title="Клики по CTA">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Страница</th>
                    <th className="p-2 text-left">Элемент</th>
                    <th className="p-2 text-right">Кликов</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.pages.flatMap(([pageId, page]) =>
                    Array.from(page.clicks.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([clickId, count]) => (
                        <tr key={`${pageId}-${clickId}`} className="border-t border-gray-200">
                          <td className="p-2">{pageLabel(pageId)}</td>
                          <td className="p-2 font-mono text-xs">{clickId}</td>
                          <td className="p-2 text-right">{count}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </VisitTable>
            </>
          )}
        </>
      )}
    </section>
  );
}

function VisitStatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-brand">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

function VisitTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-brand">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

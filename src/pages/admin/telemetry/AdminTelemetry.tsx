import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { debugError } from '../../../lib/debug';
import { useEditableCourses } from '../../../hooks/useEditableCourses';
import { useAuthStore } from '../../../stores/useAuthStore';
import AdminPageVisits from './AdminPageVisits';

// Сводка продуктовой телеметрии (PT-1): читает сырые события из
// `feature_events` напрямую и агрегирует на клиенте. Rules пускают
// super-admin ко всей коллекции, админа курса — только к событиям своих
// курсов, поэтому его запрос обязан содержать where('courseId','==',...).
// Как читать цифры — docs/guides/product-telemetry.md.

interface FeatureEventRow {
  event: string;
  hashedUid: string;
  platform: string;
  courseId?: string;
  createdAt: Date;
}

const EVENT_LABELS: Record<string, string> = {
  study_mode_opened: 'Конспект-режим открыт',
  transcript_opened: 'Транскрипт включён',
  selection_explain: 'Выделение → «Объяснить»',
  selection_search: 'Выделение → «Статьи»',
  research_search: 'Research-поиск',
  book_rag_question: 'Вопрос по книгам (RAG)',
  lecture_ai_question: 'Вопрос лекционному AI',
  lecture_question_asked: 'Вопрос лектору задан',
  note_shared: 'Конспект отправлен группе',
  test_started: 'Тест начат',
  test_completed: 'Тест завершён',
};

const RANGE_OPTIONS = [4, 12, 26] as const;

/** Понедельник недели, к которой относится дата, в виде YYYY-MM-DD */
function weekKey(date: Date): string {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  const shift = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - shift);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AdminTelemetry() {
  const [weeks, setWeeks] = useState<number>(12);
  const [rows, setRows] = useState<FeatureEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const { courses: editableCourses, loading: coursesLoading } = useEditableCourses();
  // '' — «все курсы»: доступно только super-admin, у остальных rules отклонят
  // запрос без фильтра.
  const [courseFilter, setCourseFilter] = useState('');
  const [searchParams] = useSearchParams();
  const courseParam = searchParams.get('course');

  // ?course= из кабинета автора — только в рамках прав.
  useEffect(() => {
    if (!courseParam) return;
    if (!isSuperAdmin && !editableCourses.some((course) => course.id === courseParam)) return;
    setCourseFilter(courseParam);
  }, [courseParam, isSuperAdmin, editableCourses]);

  useEffect(() => {
    if (isSuperAdmin || coursesLoading || editableCourses.length === 0) return;
    if (editableCourses.some((course) => course.id === courseFilter)) return;
    setCourseFilter(editableCourses[0].id);
  }, [isSuperAdmin, coursesLoading, editableCourses, courseFilter]);

  const load = useCallback(async (rangeWeeks: number, courseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - rangeWeeks * 7 * 24 * 60 * 60 * 1000);
      const snapshot = await getDocs(
        courseId
          ? query(
              collection(db, 'feature_events'),
              where('courseId', '==', courseId),
              where('createdAt', '>=', Timestamp.fromDate(since)),
              orderBy('createdAt', 'desc')
            )
          : query(
              collection(db, 'feature_events'),
              where('createdAt', '>=', Timestamp.fromDate(since)),
              orderBy('createdAt', 'desc')
            )
      );
      const loaded: FeatureEventRow[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null;
        if (!createdAt || typeof data.event !== 'string') return;
        loaded.push({
          event: data.event,
          hashedUid: typeof data.hashedUid === 'string' ? data.hashedUid : '',
          platform: typeof data.platform === 'string' ? data.platform : 'desktop',
          courseId: typeof data.courseId === 'string' ? data.courseId : undefined,
          createdAt,
        });
      });
      setRows(loaded);
    } catch (err) {
      debugError('[AdminTelemetry] load failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить события');
    } finally {
      setLoading(false);
    }
  }, []);

  const waitingForCourse = !isSuperAdmin && !courseFilter;

  useEffect(() => {
    // Админ без выбранного курса не шлёт запрос: rules отклонят его целиком.
    if (waitingForCourse) {
      setRows([]);
      setLoading(coursesLoading);
      return;
    }
    load(weeks, courseFilter);
  }, [load, weeks, courseFilter, waitingForCourse, coursesLoading]);

  const summary = useMemo(() => {
    const weekKeys = new Set<string>();
    const events = new Map<
      string,
      { total: number; mobile: number; desktop: number; byWeek: Map<string, number> }
    >();
    const uniqueUids = new Set<string>();
    const uidsByWeek = new Map<string, Set<string>>();
    let mobileTotal = 0;

    for (const row of rows) {
      const wk = weekKey(row.createdAt);
      weekKeys.add(wk);
      uniqueUids.add(row.hashedUid);
      if (!uidsByWeek.has(wk)) uidsByWeek.set(wk, new Set());
      uidsByWeek.get(wk)!.add(row.hashedUid);
      if (row.platform === 'mobile') mobileTotal += 1;

      if (!events.has(row.event)) {
        events.set(row.event, { total: 0, mobile: 0, desktop: 0, byWeek: new Map() });
      }
      const bucket = events.get(row.event)!;
      bucket.total += 1;
      if (row.platform === 'mobile') bucket.mobile += 1;
      else bucket.desktop += 1;
      bucket.byWeek.set(wk, (bucket.byWeek.get(wk) ?? 0) + 1);
    }

    const sortedWeeks = Array.from(weekKeys).sort().reverse();
    const sortedEvents = Array.from(events.entries()).sort((a, b) => b[1].total - a[1].total);
    return { sortedWeeks, sortedEvents, uniqueUids, uidsByWeek, mobileTotal };
  }, [rows]);

  const mobileShare =
    rows.length > 0 ? Math.round((summary.mobileTotal / rows.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">📊 Телеметрия</h1>
        <div className="flex items-center gap-3 text-sm">
          <label htmlFor="telemetry-range" className="opacity-70">
            Диапазон:
          </label>
          <select
            id="telemetry-range"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} недель
              </option>
            ))}
          </select>
          {(isSuperAdmin || editableCourses.length > 1) && (
            <>
              <label htmlFor="telemetry-course" className="opacity-70">
                Курс:
              </label>
              <select
                id="telemetry-course"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1"
              >
                {isSuperAdmin && <option value="">Все курсы</option>}
                {editableCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {isSuperAdmin && (
            <Link to="/superadmin" className="text-blue-600 hover:underline">
              ← Админ-панель
            </Link>
          )}
        </div>
      </div>

      {/* Посещения лендингов — данные всей платформы, обычному админу не показываем */}
      {isSuperAdmin && <AdminPageVisits weeks={weeks} />}

      <h2 className="text-2xl font-semibold">🧪 Использование фич</h2>
      {!coursesLoading && !isSuperAdmin && editableCourses.length === 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted">
          У вас пока нет курсов в управлении — телеметрию показывать не по чему.
        </div>
      )}
      {loading && <div className="opacity-70">Загружаем события…</div>}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Событий за период" value={String(rows.length)} />
            <StatCard label="Уникальных пользователей" value={String(summary.uniqueUids.size)} />
            <StatCard label="Доля мобильных событий" value={`${mobileShare}%`} />
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted">
              Событий за выбранный период нет. Телеметрия пишется только с прода
              (авторизованные пользователи), см. docs/guides/product-telemetry.md.
            </div>
          ) : (
            <>
              <SummaryTable title="События × недели (начало недели — понедельник)">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Событие</th>
                    <th className="p-2 text-right">Всего</th>
                    {summary.sortedWeeks.map((wk) => (
                      <th key={wk} className="p-2 text-right whitespace-nowrap">
                        {wk.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.sortedEvents.map(([event, bucket]) => (
                    <tr key={event} className="border-t border-gray-200">
                      <td className="p-2">{EVENT_LABELS[event] ?? event}</td>
                      <td className="p-2 text-right font-semibold">{bucket.total}</td>
                      {summary.sortedWeeks.map((wk) => (
                        <td key={wk} className="p-2 text-right">
                          {bucket.byWeek.get(wk) ?? '·'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-gray-300">
                    <td className="p-2 font-medium">Уникальных пользователей</td>
                    <td className="p-2 text-right font-semibold">{summary.uniqueUids.size}</td>
                    {summary.sortedWeeks.map((wk) => (
                      <td key={wk} className="p-2 text-right">
                        {summary.uidsByWeek.get(wk)?.size ?? '·'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </SummaryTable>

              <SummaryTable title="Split mobile / desktop">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Событие</th>
                    <th className="p-2 text-right">Всего</th>
                    <th className="p-2 text-right">Mobile</th>
                    <th className="p-2 text-right">Desktop</th>
                    <th className="p-2 text-right">Mobile %</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sortedEvents.map(([event, bucket]) => (
                    <tr key={event} className="border-t border-gray-200">
                      <td className="p-2">{EVENT_LABELS[event] ?? event}</td>
                      <td className="p-2 text-right font-semibold">{bucket.total}</td>
                      <td className="p-2 text-right">{bucket.mobile}</td>
                      <td className="p-2 text-right">{bucket.desktop}</td>
                      <td className="p-2 text-right">
                        {Math.round((bucket.mobile / bucket.total) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SummaryTable>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-brand">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SummaryTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-brand">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

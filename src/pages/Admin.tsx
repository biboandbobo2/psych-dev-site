import { useEffect, useState, useCallback } from "react";
import type { User } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { auth } from "../lib/firebase";
import { debugWarn } from "../lib/debug";

type AssistantStats = {
  ok: boolean;
  day: number;
  tokensUsed: number;
  requests: number;
  perUserDailyQuota: number;
  totalDailyQuota: number;
};

export default function Admin() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [assistantStats, setAssistantStats] = useState<AssistantStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchAssistantStats = useCallback(async () => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch('/api/assistant?stats=1', { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Ошибка запроса (${res.status})`);
      }
      const data: AssistantStats = await res.json();
      if (data?.ok) {
        setAssistantStats(data);
      } else {
        setStatsError('Не удалось получить данные ассистента');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      debugWarn('[admin] assistant stats error', error);
      setStatsError(error?.message ?? 'Ошибка запроса');
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAssistantStats();
  }, [isAdmin, fetchAssistantStats]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Админ-панель</h1>
        <div className="space-y-2 text-sm sm:text-right">
          <div className="opacity-70">{user?.email}</div>
          <AdminHeaderStatus user={user} isAdmin={isAdmin} />
        </div>
      </div>

      {isAdmin && (
        <nav className="flex gap-3 mb-6 flex-wrap">
          <Link
            to="/admin/users"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname === '/admin/users'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            👥 Users
          </Link>
          <Link
            to="/admin/archive"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname.startsWith('/admin/archive')
                ? 'bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🗄️ Архив функций
          </Link>
          {isSuperAdmin && (
            <Link
              to="/admin/groups"
              className={`px-4 py-2 rounded font-medium transition-colors ${
                location.pathname.startsWith('/admin/groups')
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
              }`}
            >
              👥 Группы
            </Link>
          )}
          {isSuperAdmin && (
            <Link
              to="/admin/books"
              className={`px-4 py-2 rounded font-medium transition-colors ${
                location.pathname.startsWith('/admin/books')
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              📚 Books
            </Link>
          )}
        </nav>
      )}

      {isAdmin && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h2 className="text-xl font-semibold">ИИ ассистент — суточное потребление</h2>
              <p className="text-sm text-muted">
                Оценка по длине запросов/ответов. Квота на пользователя: {assistantStats?.perUserDailyQuota ?? '—'} из {assistantStats?.totalDailyQuota ?? '—'}.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAssistantStats}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted transition hover:bg-card2 hover:text-fg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={statsLoading}
            >
              {statsLoading ? 'Обновляю…' : 'Обновить'}
            </button>
          </div>

          {statsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {statsError}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card2 px-4 py-3">
                <p className="text-sm text-muted">Запросов сегодня</p>
                <p className="text-2xl font-semibold text-fg">
                  {assistantStats ? assistantStats.requests : statsLoading ? '…' : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card2 px-4 py-3">
                <p className="text-sm text-muted">Токенов (оценка)</p>
                <p className="text-2xl font-semibold text-fg">
                  {assistantStats ? assistantStats.tokensUsed : statsLoading ? '…' : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card2 px-4 py-3">
                <p className="text-sm text-muted">День</p>
                <p className="text-lg font-semibold text-fg">
                  {assistantStats ? assistantStats.day : statsLoading ? '…' : '—'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-5 space-y-3">
          <h2 className="text-xl font-semibold">Доступ администратора</h2>
          <p className="text-sm text-muted">
            Админские права больше не выдаются из клиента. Чтобы получить доступ, обратитесь к
            супер-админу или владельцу проекта — они обновляют `functions.config().admin.seed_code`
            и вызывают Cloud Function `seedAdmin` на сервере.
          </p>
          <p className="text-sm text-muted">
            Подробный процесс описан в <code>docs/architecture/guidelines.md</code>, раздел
            <code>#security-roles--logging</code>.
          </p>
        </div>
      )}
    </div>
  );
}

function AdminHeaderStatus({ user, isAdmin }: { user: User | null; isAdmin: boolean }) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadClaims() {
      if (!user) {
        if (!cancelled) setRole(null);
        return;
      }
      const res = await auth.currentUser?.getIdTokenResult(true);
      if (!cancelled) {
        const tokenRole = (res?.claims as any)?.role ?? null;
        setRole(typeof tokenRole === "string" ? tokenRole : null);
      }
    }

    loadClaims();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="text-sm opacity-70">
      UID: {user?.uid ?? "—"} • Admin: {isAdmin || role === "admin" ? "yes" : "no"}
    </div>
  );
}

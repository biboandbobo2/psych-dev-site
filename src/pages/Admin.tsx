import { useEffect, useState, useCallback } from "react";
import type { User } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { auth } from "../lib/firebase";
import {
  getBillingSummary,
  type BillingSummaryResponse,
} from "../lib/adminFunctions";
import { debugWarn } from "../lib/debug";
import { BillingSummaryPanel } from "./admin/components/BillingSummaryPanel";

export default function Admin() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [billingSummary, setBillingSummary] = useState<BillingSummaryResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const fetchBillingSummary = useCallback(
    async (invoiceMonth?: string) => {
      if (!isAdmin) return;
      setBillingLoading(true);
      setBillingError(null);
      try {
        const data = await getBillingSummary(invoiceMonth ? { invoiceMonth } : {});
        setBillingSummary(data);
      } catch (error: any) {
        debugWarn("[admin] billing summary error", error);
        setBillingError(error?.message ?? "Не удалось получить billing summary");
      } finally {
        setBillingLoading(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!isAdmin) return;
    fetchBillingSummary();
  }, [isAdmin, fetchBillingSummary]);

  const handleSelectMonth = useCallback(
    (month: string) => {
      setSelectedMonth(month);
      fetchBillingSummary(month);
    },
    [fetchBillingSummary]
  );

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
          {isSuperAdmin && (
            <Link
              to="/superadmin/pages"
              className={`px-4 py-2 rounded font-medium transition-colors ${
                location.pathname.startsWith('/superadmin/pages')
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200'
              }`}
            >
              📝 Страницы
            </Link>
          )}
        </nav>
      )}

      {isAdmin && (
        <BillingSummaryPanel
          summary={billingSummary}
          loading={billingLoading}
          error={billingError}
          selectedMonth={selectedMonth}
          onRefresh={() => fetchBillingSummary(selectedMonth ?? undefined)}
          onSelectMonth={handleSelectMonth}
        />
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

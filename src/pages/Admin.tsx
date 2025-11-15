import { httpsCallable, getFunctions } from "firebase/functions";
import { doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { auth } from "../lib/firebase";
import { debugError, debugLog } from "../lib/debug";
import UploadAsset, { diagnoseToken } from "./UploadAsset";

export default function Admin() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Админ-панель</h1>
        <div className="space-y-2 text-sm sm:text-right">
          <div className="opacity-70">{user?.email}</div>
          <AdminHeaderStatus user={user} isAdmin={isAdmin} />
          <button
            onClick={async () => {
              try {
                const res = await diagnoseToken();
                if (res?.claims.role === "admin") {
                  alert("✅ Token OK! Role: admin found");
                } else {
                  alert("❌ No admin role in token. Sign out and sign in again.");
                }
              } catch (error: any) {
                debugError("🔍 Check Token error:", error);
                alert(`Error: ${error?.message ?? error}`);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            🔍 Check Token
          </button>
          <button
            onClick={async () => {
              const code = prompt("Enter admin seed code:");
              if (!code) return;

              try {
                debugLog("🔄 Calling seedAdmin function...", { seedCodeProvided: Boolean(code) });
                const fn = httpsCallable(getFunctions(), "seedAdmin");
                const result = await fn({ seedCode: code });
                debugLog("✅ seedAdmin response ok:", Boolean((result.data as any)?.ok));

                if ((result.data as any)?.ok) {
                  alert("✅ Admin role set successfully!\n\nYou MUST sign out and sign in again for changes to take effect.");
                  await auth.signOut();
                  window.location.href = "/";
                } else {
                  alert("❌ Unexpected response from seedAdmin");
                }
              } catch (error: any) {
                debugError("❌ seedAdmin error:", error);
                debugError("❌ Error code:", error?.code);
                debugError("❌ Error message:", error?.message);
                debugError("❌ Full error:", JSON.stringify(error, null, 2));
                alert(`❌ Error calling seedAdmin:\n${error?.message ?? error}`);
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🔄 Set Admin Role
          </button>
          <button
            onClick={logout}
            className="px-3 py-1 rounded-xl border border-border shadow-sm hover:bg-card2"
          >
            Выйти
          </button>
        </div>
      </div>

      {isAdmin && (
        <nav className="flex gap-3 mb-6 flex-wrap">
          <Link
            to="/admin"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname === '/admin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📊 Dashboard
          </Link>

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
            to="/admin/content"
            className={`px-4 py-2 rounded font-medium transition-colors ${
              location.pathname.startsWith('/admin/content')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📝 Content
          </Link>

        </nav>
      )}

      {!isAdmin ? (
        <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-5 space-y-3">
          <h2 className="text-xl font-semibold">Доступ администратора</h2>
          <p className="text-sm text-muted">
            Админские права больше не выдаются из клиента. Чтобы получить доступ, обратитесь к
            супер-админу или владельцу проекта — они обновляют `functions.config().admin.seed_code`
            и вызывают Cloud Function `seedAdmin` на сервере.
          </p>
          <p className="text-sm text-muted">
            Подробный процесс описан в{" "}
            <a
              href="/docs/ARCHITECTURE_GUIDELINES.md#security-roles--logging"
              className="text-accent no-underline hover:no-underline focus-visible:no-underline"
            >
              Architecture Guidelines → Security, Roles &amp; Logging
            </a>
            .
          </p>
        </div>
      ) : (
        <UploadAsset />
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

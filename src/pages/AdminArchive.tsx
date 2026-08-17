import { httpsCallable, getFunctions } from "firebase/functions";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { auth } from "../lib/firebase";
import { debugError, debugLog } from "../lib/debug";
import UploadAsset from "./UploadAsset";
import { diagnoseToken } from "./uploadAssetHelpers";

const hasAdminRole = (role?: string) => role === "admin" || role === "super-admin";

export default function AdminArchive() {
  const { isSuperAdmin } = useAuth();
  const backLink = isSuperAdmin ? "/superadmin" : "/admin/content";

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Архив функций</h1>
          <p className="text-sm text-muted">Редко используемые инструменты администратора.</p>
        </div>
        <Link to={backLink} className="text-accent text-sm">
          ← Вернуться в админку
        </Link>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              try {
                const res = await diagnoseToken();
                if (hasAdminRole(res?.claims.role as string | undefined)) {
                  alert("✅ Token OK! Admin role found");
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
        </div>
      </div>

      <UploadAsset />
    </div>
  );
}

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../lib/firebase";
import { debugError, debugLog } from "../lib/debug";
import { diagnoseToken } from "./uploadAssetHelpers";

const acceptsAdminRole = (role?: string) => role === "admin" || role === "super-admin";

async function uploadToAssets(file: File): Promise<{ path: string; url: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  debugLog("🚀 Step 1: Checking token (role)");
  await user.getIdToken(true);
  const tokenResult = await user.getIdTokenResult(true);
  debugLog("🔑 Token role:", tokenResult.claims.role);

  if (!acceptsAdminRole(tokenResult.claims.role as string | undefined)) {
    throw new Error("Admin role required. Please sign out and sign in again.");
  }

  const path = `assets/${crypto.randomUUID()}-${file.name}`;
  debugLog("🧱 Step 2: Path created:", path);
  debugLog("❓ Path starts with '/'?", path.startsWith("/"));

  const storageRef = ref(storage, path);
  debugLog("📦 Step 3: Storage ref created");

  try {
    debugLog("⬆️ Step 4: Uploading...");
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });
    debugLog("✅ Upload successful!");
    const url = await getDownloadURL(snapshot.ref);
    debugLog("🔗 Download URL:", url);
    return { path, url };
  } catch (error: any) {
    debugError("❌ Upload failed:", error?.code, error?.message);
    throw error;
  }
}

export default function UploadAsset() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [diagMessage, setDiagMessage] = useState<string | null>(null);

  const onUpload = async () => {
    if (!file) return;
    setMsg(null);
    setDiagMessage(null);
    try {
      setBusy(true);
      const tokenResult = await diagnoseToken();
      if (!tokenResult || !acceptsAdminRole(tokenResult.claims.role as string | undefined)) {
        throw new Error("❌ Admin role not found in token. Please sign out and sign in again.");
      }
      const { path, url } = await uploadToAssets(file);
      setMsg(`✅ OK: uploaded to ${path}\nURL: ${url}`);
    } catch (err: any) {
      const code = err?.code ? ` (${err.code})` : "";
      const message = err?.message ?? String(err);
      setMsg(`❌ Ошибка: ${message}${code}`);
    } finally {
      setBusy(false);
    }
  };

  const testUploadsWrite = async () => {
    try {
      setDiagMessage(null);
      await auth.currentUser?.getIdToken(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        throw new Error("UID отсутствует. Войдите повторно.");
      }
      const blob = new Blob([`diagnostic ${Date.now()}`], { type: "text/plain" });
      const testRef = ref(storage, `uploads/${uid}/diag-${Date.now()}.txt`);
      await uploadBytes(testRef, blob, { contentType: "text/plain" });
      setDiagMessage("uploads/: запись успешна");
    } catch (err: any) {
      const code = err?.code ? ` (${err.code})` : "";
      const message = err?.message ?? String(err);
      setDiagMessage(`Ошибка uploads: ${message}${code}`);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-5 space-y-4">
      <h2 className="text-xl font-semibold">Загрузка файла в <code>assets/</code></h2>
      <input
        type="file"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <button
        onClick={onUpload}
        disabled={!file || busy}
        className="px-4 py-2 rounded-xl border border-border shadow-sm font-medium hover:bg-card2 disabled:opacity-50"
      >
        {busy ? "Загружаю…" : "Загрузить"}
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            const res = await diagnoseToken();
            if (acceptsAdminRole(res?.claims.role as string | undefined)) {
              alert("✅ Token OK! Admin/super-admin role found");
            } else {
              alert("❌ No admin role in token. Sign out and sign in again.");
            }
          } catch (error: any) {
            debugError("🔍 Check Token error", error);
            alert(`Error: ${error?.message ?? error}`);
          }
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        🔍 Check Token
      </button>
      <button
        type="button"
        onClick={testUploadsWrite}
        className="px-3 py-1 rounded-xl border border-border shadow-sm font-medium hover:bg-card2"
      >
        Проверка uploads
      </button>
      {msg && <pre className="text-sm whitespace-pre-wrap leading-6">{msg}</pre>}
      {diagMessage && <p className="text-sm text-muted">{diagMessage}</p>}
    </div>
  );
}

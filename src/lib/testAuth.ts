/**
 * HP-2: dev-only вход для ролевого e2e-стенда (docs/guides/testing-system.md).
 *
 * Модуль подключается ТОЛЬКО динамическим импортом из `firebase.ts` под
 * статическим гейтом `import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true"`,
 * поэтому в прод-сборку не попадает (критерий приёмки: `grep "__testAuth" dist/` пуст).
 * Работает исключительно против Auth-эмулятора: пароли и custom claims
 * пользователям выставляет scripts/seedEmulatorRoles.ts.
 */
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { debugLog } from "./debug";

interface TestAuthApi {
  /** Вход по email/паролю из сида. Возвращает uid. */
  signIn: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  /** email текущего пользователя или null (для ожиданий в Playwright). */
  currentUserEmail: () => string | null;
  /** Резолвится, когда onAuthStateChanged отдал пользователя (или сразу, если он есть). */
  waitForUser: () => Promise<string>;
}

declare global {
  interface Window {
    __testAuth?: TestAuthApi;
  }
}

window.__testAuth = {
  signIn: async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    debugLog("🧪 testAuth: вход выполнен", email);
    return cred.user.uid;
  },
  signOut: async () => {
    await signOut(auth);
    debugLog("🧪 testAuth: выход выполнен");
  },
  currentUserEmail: () => auth.currentUser?.email ?? null,
  waitForUser: () =>
    new Promise<string>((resolve) => {
      const stop = onAuthStateChanged(auth, (user) => {
        if (user) {
          stop();
          resolve(user.uid);
        }
      });
    }),
};

debugLog("🧪 testAuth готов (эмуляторный вход для e2e)");

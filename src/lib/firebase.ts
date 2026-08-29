import type { FirebaseOptions } from "firebase/app";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { debugLog } from "./debug";
import { resolveFirebaseAuthDomain } from "./firebaseAuthDomain";

const env = (typeof import.meta.env === "object" ? import.meta.env : process.env) as Record<string, string | undefined>;
const browserHostname = typeof window === "object" ? window.location.hostname : undefined;

// DEBUG: проверка env переменных (удалить после проверки)
// NOTE: debugLog is now a function, so this is safe
debugLog('🔍 Firebase env check:', {
  hasApiKey: Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
  apiKeyLength: import.meta.env.VITE_FIREBASE_API_KEY?.length,
  hasAuthDomain: Boolean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  resolvedAuthDomain: resolveFirebaseAuthDomain(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN,
    browserHostname
  ),
  hasProjectId: Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

// HP-2: dev-only переопределение projectId (?testProject=… / sessionStorage)
// для изоляции параллельных e2e-песочниц: один dev-сервер обслуживает несколько
// Firestore-проектов эмулятора. Гейт — статический import.meta.env, поэтому
// Vite вырезает блок из прод-сборки (критерий: `grep "testProject" dist/` пуст).
let testProjectId: string | undefined;
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true" && typeof window === "object") {
  const fromQuery = new URLSearchParams(window.location.search).get("testProject");
  if (fromQuery) window.sessionStorage.setItem("testProject", fromQuery);
  testProjectId = fromQuery ?? window.sessionStorage.getItem("testProject") ?? undefined;
  if (testProjectId) debugLog("🧪 testProject override:", testProjectId);
}

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || "test-api-key",
  authDomain: resolveFirebaseAuthDomain(
    env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN,
    browserHostname
  ),
  projectId: testProjectId || env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || "psych-dev-site-test",
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || "psych-dev-site-test.appspot.com",
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || "integration",
  appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || "1:000:web:test",
};

// Initialize Firebase app - these calls are safe as they check if app already exists
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
// NOTE: These top-level calls are intentional and necessary for Firebase to work correctly
// Firebase services need to be initialized before use and support multiple initializations safely
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// HP-2: режим эмуляторов для e2e-прогонов (docs/guides/testing-system.md).
// Флаг вшивается на этапе сборки; в Vercel-окружении его нет, поэтому в прод
// он не попадает. Порты — как в tests/integration/firebase.test.json.
if (env.VITE_USE_FIREBASE_EMULATORS === "true") {
  debugLog("🧪 Connecting to Firebase emulators (VITE_USE_FIREBASE_EMULATORS=true)");
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  // Функции поднимаются только со `smoke:roles --with-functions`; без них вызов
  // callable упадёт на connection refused, а не уйдёт в прод.
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// HP-2: dev-only вход без Google OAuth для ролевого e2e-стенда. Статический
// гейт import.meta.env гарантирует, что чанк testAuth не попадает в прод-сборку.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  void import("./testAuth");
}

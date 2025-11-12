import type { FirebaseOptions } from "firebase/app";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { debugLog } from "./debug";

// DEBUG: проверка env переменных (удалить после проверки)
debugLog('🔍 Firebase env check:', {
  hasApiKey: Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
  apiKeyLength: import.meta.env.VITE_FIREBASE_API_KEY?.length,
  hasAuthDomain: Boolean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  hasProjectId: Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

const env = (typeof import.meta.env === "object" ? import.meta.env : process.env) as Record<string, string | undefined>;

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || "test-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || "psych-dev-site-test",
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || "psych-dev-site-test.appspot.com",
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || "integration",
  appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || "1:000:web:test",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

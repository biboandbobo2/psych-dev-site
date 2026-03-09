import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";

interface FirebaseConfigEnv {
  projectId?: string;
  storageBucket?: string;
}

function parseFirebaseConfigEnv(): FirebaseConfigEnv {
  const raw = process.env.FIREBASE_CONFIG;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as FirebaseConfigEnv;
    return {
      projectId: parsed.projectId,
      storageBucket: parsed.storageBucket,
    };
  } catch {
    return {};
  }
}

export function resolveAdminProjectId() {
  const firebaseConfig = parseFirebaseConfigEnv();

  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    firebaseConfig.projectId
  );
}

export function resolveAdminStorageBucket(projectId = resolveAdminProjectId()) {
  const firebaseConfig = parseFirebaseConfigEnv();

  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseConfig.storageBucket ||
    (projectId ? `${projectId}.firebasestorage.app` : undefined)
  );
}

export function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: resolveAdminProjectId(),
      storageBucket: resolveAdminStorageBucket(),
    });
  }

  return getApp();
}

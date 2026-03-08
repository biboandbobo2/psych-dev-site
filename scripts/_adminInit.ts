import { initializeApp, applicationDefault, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';

function resolveProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );
}

function resolveStorageBucket(projectId?: string): string | undefined {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : undefined)
  );
}

export function initAdmin() {
  let projectId = resolveProjectId();
  let storageBucket = resolveStorageBucket(projectId);
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!getApps().length) {
    if (saPath && fs.existsSync(saPath)) {
      const json = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      if (!projectId && json.project_id) projectId = json.project_id;
      if (!storageBucket && json.storage_bucket) storageBucket = json.storage_bucket;
      initializeApp({ credential: cert(json), projectId, storageBucket });
    } else {
      initializeApp({ credential: applicationDefault(), projectId, storageBucket });
    }
  }

  const app = getApp();
  const db = getFirestore();
  const storage = getStorage(app);
  const bucket = app.options.storageBucket ? storage.bucket(app.options.storageBucket) : null;
  return {
    app,
    bucket,
    db,
    projectId,
    storage,
    storageBucket: app.options.storageBucket ?? null,
  };
}

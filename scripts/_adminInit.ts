import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

function resolveProjectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  );
}

export function initAdmin() {
  let projectId = resolveProjectId();
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!getApps().length) {
    if (saPath && fs.existsSync(saPath)) {
      const json = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      if (!projectId && json.project_id) projectId = json.project_id;
      initializeApp({ credential: cert(json), projectId });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  const db = getFirestore();
  return { db, projectId };
}

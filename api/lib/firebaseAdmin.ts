import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function ensureAdminApp() {
  if (getApps().length) return getApp();

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env var is required');
  }

  return initializeApp({ credential: cert(JSON.parse(json)) });
}

export function getAdminAuth() {
  ensureAdminApp();
  return getAuth();
}

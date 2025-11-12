import admin from 'firebase-admin';
import { clearFirestoreData } from 'firebase-admin/firestore';

const DEFAULT_PROJECT_ID = 'psych-dev-site-test';
const EMULATOR_HOSTS: Record<string, string> = {
  FIRESTORE_EMULATOR_HOST: 'localhost:8080',
  FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
};
const DEFAULT_STORAGE_BUCKET = 'psych-dev-site-test.appspot.com';

export function setupIntegrationEnv(): void {
  ensureEmulatorEnv();
}

function ensureEmulatorEnv(): void {
  Object.entries(EMULATOR_HOSTS).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  process.env.GCLOUD_PROJECT ||= process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID ||= process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
  process.env.FIREBASE_STORAGE_BUCKET ||= DEFAULT_STORAGE_BUCKET;

  // Ensure Firebase Admin uses emulator credentials.
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||= '';
}

function getProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
}

function getAdminApp() {
  ensureEmulatorEnv();
  return admin.apps[0] ?? admin.initializeApp({ projectId: getProjectId() });
}

export function initializeIntegrationApp() {
  return getAdminApp();
}

export async function resetFirestore(): Promise<void> {
  await clearFirestoreData({ projectId: getProjectId() });
}

export async function resetAuth(): Promise<void> {
  const auth = admin.auth(getAdminApp());
  let nextPageToken: string | undefined;

  do {
    const { users, pageToken } = await auth.listUsers(1000, nextPageToken);
    if (!users.length) break;

    await auth.deleteUsers(users.map((user) => user.uid));
    nextPageToken = pageToken ?? undefined;
  } while (nextPageToken);
}

export async function resetStorage(): Promise<void> {
  const storage = admin.storage(getAdminApp());
  const bucket = storage.bucket();

  try {
    await bucket.deleteFiles({ force: true });
  } catch {
    // Эмулятор может быть не настроен — игнорируем ошибки.
  }
}

export async function resetIntegrationData(): Promise<void> {
  await initializeIntegrationApp();
  await Promise.all([resetFirestore(), resetAuth(), resetStorage()]);
}

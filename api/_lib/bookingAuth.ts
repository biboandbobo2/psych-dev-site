// Auth + booking-context для /api/booking. Унифицирует verify Firebase
// token, проверку прав на показ имён клиентов и резолвинг alteg client_id
// для текущего пользователя.

import type { VercelRequest } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '../../src/lib/api-server/sharedApiRuntime.js';
import { altegPost } from './altegClient.js';

export interface BookingAuthFailure {
  valid: false;
  error: string;
  code: 'UNAUTHORIZED';
}

export interface VerifiedBookingAuth {
  valid: true;
  uid: string;
  email: string;
}

export interface ResolvedBookingContext {
  valid: true;
  uid: string;
  email: string;
  altegClientIds: number[];
  phone: string | null;
}

export async function verifyBookingAuth(
  req: VercelRequest,
): Promise<BookingAuthFailure | VerifiedBookingAuth> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Authorization required', code: 'UNAUTHORIZED' };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
    return { valid: true, uid: decodedToken.uid, email: decodedToken.email || '' };
  } catch {
    return { valid: false, error: 'Invalid token', code: 'UNAUTHORIZED' };
  }
}

/**
 * Можно ли показывать имена клиентов в /api/booking?action=busy.
 * Сейчас — любому залогиненному пользователю.
 */
export async function canViewBusyClientNames(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;
  initFirebaseAdmin();
  const authResult = await verifyBookingAuth(req);
  return authResult.valid === true;
}

function parseClientIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
}

/**
 * Возвращает список alteg client_id для текущего пользователя.
 * - сначала проверяет users/{uid}.altegClientIds (кэш)
 * - иначе ищет клиента в alteg по email/phone
 * - иначе создаёт нового клиента в alteg и кэширует id в users/{uid}
 */
async function resolveMyClientIds(
  companyId: string,
  uid: string,
  fallbackEmail: string,
  partnerToken: string,
  userToken: string,
): Promise<{ altegClientIds: number[]; phone: string | null }> {
  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  const phone = typeof userData.phone === 'string' ? userData.phone : null;
  const email =
    typeof userData.email === 'string' && userData.email.trim()
      ? userData.email.trim()
      : fallbackEmail;
  const cachedIds = parseClientIds(userData.altegClientIds);

  if (cachedIds.length > 0) {
    return { altegClientIds: cachedIds, phone };
  }
  if (!email && !phone) {
    return { altegClientIds: [], phone };
  }

  // Lazy-import find/create handlers to avoid circular dep with bookingHandlers
  const { handleFindClients, handleCreateClient } = await import('./bookingHandlers.js');

  const foundClients = await handleFindClients(
    companyId,
    email,
    phone || undefined,
    partnerToken,
    userToken,
  );
  if (foundClients.length > 0) {
    const ids = foundClients.map((client) => client.id);
    await userRef.set({ altegClientIds: ids }, { merge: true });
    return { altegClientIds: ids, phone };
  }

  if (!email || !phone) {
    return { altegClientIds: [], phone };
  }

  const createdClients = (await handleCreateClient(
    companyId,
    {
      name:
        typeof userData.displayName === 'string' && userData.displayName.trim()
          ? userData.displayName
          : email.split('@')[0],
      phone,
      email,
    },
    partnerToken,
    userToken,
  )) as { id?: number }[] | null;

  const newId = createdClients?.[0]?.id;
  if (!newId) {
    throw new Error('Failed to resolve booking client');
  }

  await userRef.set({ altegClientIds: [newId] }, { merge: true });
  return { altegClientIds: [newId], phone };
}

export async function resolveAuthorizedBookingContext(
  req: VercelRequest,
  companyId: string,
  partnerToken: string,
  userToken: string,
): Promise<BookingAuthFailure | ResolvedBookingContext> {
  initFirebaseAdmin();
  const authResult = await verifyBookingAuth(req);
  if (authResult.valid === false) return authResult;

  const clientContext = await resolveMyClientIds(
    companyId,
    authResult.uid,
    authResult.email,
    partnerToken,
    userToken,
  );

  return {
    valid: true,
    uid: authResult.uid,
    email: authResult.email,
    altegClientIds: clientContext.altegClientIds,
    phone: clientContext.phone,
  };
}

/**
 * Читает users/{uid}.prefs.emailBookingConfirmations.
 * По умолчанию (поле отсутствует или не boolean) → true (рассылаем).
 */
export async function shouldSendBookingEmail(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return true;

  try {
    initFirebaseAdmin();
    const auth = await verifyBookingAuth(req);
    if (auth.valid === false) return true;

    const userSnap = await getFirestore().collection('users').doc(auth.uid).get();
    const data = userSnap.data() || {};
    const prefs =
      data.prefs && typeof data.prefs === 'object' ? (data.prefs as Record<string, unknown>) : {};
    const flag = prefs.emailBookingConfirmations;
    if (flag === false) return false;
    return true;
  } catch {
    return true;
  }
}

// pure, expose для тестов
export { parseClientIds };

// Передаётся из bookingHandlers вместо resolveMyClientIds для round-trip
// между ними (handleResolveMyClientIds уже не нужен в bookingHandlers — он
// перенесён сюда как resolveMyClientIds).
export { resolveMyClientIds };

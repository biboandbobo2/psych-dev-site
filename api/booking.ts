/**
 * GET/POST /api/booking
 * Proxy for alteg.io (YCLIENTS) booking API.
 * Actions: rooms, slots, book, services
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { canCancelBooking } from '../src/lib/bookingCancellation.js';
import { getAllowedAppOrigin } from '../src/lib/appOrigins.js';

const ALTEG_BASE = 'https://api.alteg.io/api/v1';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
  initializeApp({ credential: cert(JSON.parse(json)) });
}

function getConfig() {
  const partnerToken = process.env.ALTEG_PARTNER_TOKEN;
  const userToken = process.env.ALTEG_USER_TOKEN;
  const companyId = process.env.ALTEG_COMPANY_ID;
  if (!partnerToken || !userToken || !companyId) {
    throw new Error('ALTEG_PARTNER_TOKEN, ALTEG_USER_TOKEN, and ALTEG_COMPANY_ID must be configured');
  }
  return { partnerToken, userToken, companyId };
}

function authHeaders(partnerToken: string, userToken?: string): Record<string, string> {
  const auth = userToken
    ? `Bearer ${partnerToken}, User ${userToken}`
    : `Bearer ${partnerToken}`;
  return {
    'Accept': 'application/vnd.api.v2+json',
    'Content-Type': 'application/json',
    'Authorization': auth,
  };
}

interface BookingAuthFailure {
  valid: false;
  error: string;
  code: 'UNAUTHORIZED';
}

interface VerifiedBookingAuth {
  valid: true;
  uid: string;
  email: string;
}

interface ResolvedBookingContext {
  valid: true;
  uid: string;
  email: string;
  altegClientIds: number[];
  phone: string | null;
}

async function verifyBookingAuth(req: VercelRequest): Promise<BookingAuthFailure | VerifiedBookingAuth> {
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

async function altegFetch(path: string, partnerToken: string, userToken?: string) {
  const url = `${ALTEG_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders(partnerToken, userToken) });
  const text = await res.text();
  if (!text) return [];
  const json = JSON.parse(text);
  if (!json.success) {
    throw new Error(json.meta?.message || 'Alteg.io API error');
  }
  return json.data;
}

async function altegPost(path: string, body: unknown, partnerToken: string, userToken?: string) {
  const url = `${ALTEG_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(partnerToken, userToken),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!text) return null;
  const json = JSON.parse(text);
  if (!json.success) {
    throw new Error(json.meta?.message || 'Alteg.io API error');
  }
  return json.data;
}

async function handleRooms(companyId: string, partnerToken: string, userToken: string) {
  const staff = await altegFetch(`/company/${companyId}/staff`, partnerToken, userToken);
  // Filter to only visible (non-hidden) staff = rooms
  return staff.filter((s: { hidden: number }) => !s.hidden).map((s: {
    id: number; name: string; avatar: string; specialization: string;
  }) => ({
    id: s.id,
    name: s.name,
    avatar: s.avatar,
    specialization: s.specialization,
  }));
}

async function handleServices(companyId: string, partnerToken: string, userToken: string) {
  return altegFetch(`/company/${companyId}/services`, partnerToken, userToken);
}

async function handleSlots(
  companyId: string,
  staffId: string,
  date: string,
  serviceId: string,
  partnerToken: string,
) {
  // Public booking API — only partner token needed
  const path = `/book_times/${companyId}/${staffId}/${date}?service_id=${serviceId}`;
  return altegFetch(path, partnerToken);
}

async function handleBusy(
  companyId: string,
  staffId: string,
  date: string,
  partnerToken: string,
  userToken: string,
  includeClientName: boolean,
) {
  const records = await altegFetch(
    `/records/${companyId}?staff_id=${staffId}&start_date=${date}&end_date=${date}`,
    partnerToken,
    userToken,
  ) as { datetime: string; length: number; deleted: boolean; client?: { name?: string } }[];
  return records
    .filter((r) => !r.deleted)
    .map((r) => {
      const fullName = r.client?.name || '';
      const parts = fullName.trim().split(/\s+/);
      const shortName = parts.length >= 2
        ? `${parts[0]} ${parts[1][0]}.`
        : parts[0] || '';
      return includeClientName
        ? { start: r.datetime, lengthSeconds: r.length, clientName: shortName }
        : { start: r.datetime, lengthSeconds: r.length };
    });
}

async function canViewBusyClientNames(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  initFirebaseAdmin();
  const authResult = await verifyBookingAuth(req);
  return authResult.valid === true;
}

async function handleFindClients(
  companyId: string,
  email: string,
  phone: string | undefined,
  partnerToken: string,
  userToken: string,
) {
  type Client = { id: number; name: string; phone: string; email: string };
  const ids = new Set<number>();
  const results: Client[] = [];

  // Search by email
  if (email) {
    const byEmail = await altegPost(`/company/${companyId}/clients/search`, {
      fields: ['id', 'name', 'phone', 'email'],
      filters: [{ type: 'quick_search', state: { value: email } }],
      count: 20,
    }, partnerToken, userToken) as Client[];
    for (const c of (byEmail || [])) {
      if (c.email?.toLowerCase() === email.toLowerCase() && !ids.has(c.id)) {
        ids.add(c.id);
        results.push(c);
      }
    }
  }

  // Search by phone
  if (phone) {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const byPhone = await altegPost(`/company/${companyId}/clients/search`, {
      fields: ['id', 'name', 'phone', 'email'],
      filters: [{ type: 'quick_search', state: { value: cleanPhone } }],
      count: 20,
    }, partnerToken, userToken) as Client[];
    for (const c of (byPhone || [])) {
      const cPhone = c.phone?.replace(/[\s\-()]/g, '') || '';
      if (cPhone === cleanPhone && !ids.has(c.id)) {
        ids.add(c.id);
        results.push(c);
      }
    }
  }

  return results;
}

async function handleCreateClient(
  companyId: string,
  body: { name: string; phone: string; email: string },
  partnerToken: string,
  userToken: string,
) {
  return altegPost(`/clients/${companyId}/bulk`, [{
    name: body.name,
    phone: body.phone,
    email: body.email,
  }], partnerToken, userToken);
}

function parseClientIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
}

async function handleResolveMyClientIds(
  companyId: string,
  uid: string,
  fallbackEmail: string,
  partnerToken: string,
  userToken: string,
) {
  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  const phone = typeof userData.phone === 'string' ? userData.phone : null;
  const email = typeof userData.email === 'string' && userData.email.trim()
    ? userData.email.trim()
    : fallbackEmail;
  const cachedIds = parseClientIds(userData.altegClientIds);

  if (cachedIds.length > 0) {
    return { altegClientIds: cachedIds, phone };
  }

  if (!email && !phone) {
    return { altegClientIds: [], phone };
  }

  const foundClients = await handleFindClients(companyId, email, phone || undefined, partnerToken, userToken);
  if (foundClients.length > 0) {
    const ids = foundClients.map((client) => client.id);
    await userRef.set({ altegClientIds: ids }, { merge: true });
    return { altegClientIds: ids, phone };
  }

  if (!email || !phone) {
    return { altegClientIds: [], phone };
  }

  const createdClients = await handleCreateClient(
    companyId,
    {
      name: typeof userData.displayName === 'string' && userData.displayName.trim()
        ? userData.displayName
        : email.split('@')[0],
      phone,
      email,
    },
    partnerToken,
    userToken,
  ) as { id?: number }[] | null;

  const newId = createdClients?.[0]?.id;
  if (!newId) {
    throw new Error('Failed to resolve booking client');
  }

  await userRef.set({ altegClientIds: [newId] }, { merge: true });
  return { altegClientIds: [newId], phone };
}

async function resolveAuthorizedBookingContext(
  req: VercelRequest,
  companyId: string,
  partnerToken: string,
  userToken: string,
): Promise<BookingAuthFailure | ResolvedBookingContext> {
  initFirebaseAdmin();
  const authResult = await verifyBookingAuth(req);
  if (authResult.valid === false) {
    return authResult;
  }

  const clientContext = await handleResolveMyClientIds(
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

interface BookingRecord {
  id: number;
  datetime: string;
  length: number;
  deleted: boolean;
  services?: { id: number; title: string }[];
  staff?: { id: number; name: string };
  visit_attendance?: number;
}

async function handleClientRecords(
  companyId: string,
  clientIds: string[],
  partnerToken: string,
  userToken: string,
) {
  const allRecords: BookingRecord[] = [];
  const seenIds = new Set<number>();
  for (const cid of clientIds) {
    const records = await altegFetch(
      `/records/${companyId}?client_id=${cid}&count=50`,
      partnerToken,
      userToken,
    ) as BookingRecord[];
    for (const r of (records || [])) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allRecords.push(r);
      }
    }
  }
  return allRecords;
}

async function handleCancelRecord(
  companyId: string,
  recordId: string,
  partnerToken: string,
  userToken: string,
) {
  const url = `${ALTEG_BASE}/record/${companyId}/${recordId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(partnerToken, userToken),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = 'Cancel failed';
    try { message = JSON.parse(text)?.meta?.message || message; } catch { /* empty */ }
    throw new Error(message);
  }
  return { deleted: true };
}

async function handleDates(
  companyId: string,
  staffId: string,
  serviceId: string,
  partnerToken: string,
) {
  const path = `/book_dates/${companyId}?staff_id=${staffId}&service_id=${serviceId}`;
  return altegFetch(path, partnerToken);
}

async function handleCheck(
  companyId: string,
  appointments: { id: number; staffId: number; serviceId: number; datetime: string }[],
  partnerToken: string,
) {
  const mapped = appointments.map((a) => ({
    id: a.id,
    staff_id: a.staffId,
    services: [a.serviceId],
    datetime: a.datetime,
  }));
  return altegPost(`/book_check/${companyId}`, { appointments: mapped }, partnerToken);
}

async function handleBook(
  companyId: string,
  body: {
    appointments: { staffId: number; serviceId: number; datetime: string }[];
    name: string;
    phone: string;
    email?: string;
    comment?: string;
  },
  partnerToken: string,
) {
  const appointments = body.appointments.map((appt, i) => ({
    id: i + 1,
    staff_id: appt.staffId,
    services: [appt.serviceId],
    datetime: appt.datetime,
  }));
  return altegPost(`/book_record/${companyId}`, {
    fullname: body.name,
    phone: body.phone,
    email: body.email || '',
    comment: body.comment || '',
    notify_by_email: 24,
    appointments,
  }, partnerToken);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const allowedOrigin = getAllowedAppOrigin(req.headers.origin);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { partnerToken, userToken, companyId } = getConfig();
    const action = (req.query.action || req.body?.action) as string;

    switch (action) {
      case 'rooms': {
        const rooms = await handleRooms(companyId, partnerToken, userToken);
        return res.status(200).json({ success: true, data: rooms });
      }
      case 'busy': {
        const bStaffId = (req.query.staffId || req.body?.staffId) as string;
        const bDate = (req.query.date || req.body?.date) as string;
        if (!bStaffId || !bDate) {
          return res.status(400).json({ success: false, error: 'staffId and date required' });
        }
        const includeClientName = await canViewBusyClientNames(req);
        const busy = await handleBusy(companyId, bStaffId, bDate, partnerToken, userToken, includeClientName);
        return res.status(200).json({ success: true, data: busy });
      }
      case 'batchBusy': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'POST required' });
        }
        const pairs = req.body?.pairs as { staffId: string; date: string }[];
        if (!Array.isArray(pairs) || pairs.length === 0) {
          return res.status(400).json({ success: false, error: 'pairs[] required' });
        }
        if (pairs.length > 30) {
          return res.status(400).json({ success: false, error: 'Max 30 pairs per request' });
        }
        const includeNames = await canViewBusyClientNames(req);
        const batchResults = await Promise.all(
          pairs.map(async (p) => {
            const blocks = await handleBusy(companyId, p.staffId, p.date, partnerToken, userToken, includeNames);
            return { key: `${p.staffId}:${p.date}`, blocks };
          })
        );
        const batchMap: Record<string, unknown[]> = {};
        for (const r of batchResults) batchMap[r.key] = r.blocks;
        return res.status(200).json({ success: true, data: batchMap });
      }
      case 'services': {
        const services = await handleServices(companyId, partnerToken, userToken);
        return res.status(200).json({ success: true, data: services });
      }
      case 'dates': {
        const staffId = (req.query.staffId || req.body?.staffId) as string;
        const serviceId = (req.query.serviceId || req.body?.serviceId) as string;
        if (!staffId || !serviceId) {
          return res.status(400).json({ success: false, error: 'staffId and serviceId required' });
        }
        const dates = await handleDates(companyId, staffId, serviceId, partnerToken);
        return res.status(200).json({ success: true, data: dates });
      }
      case 'slots': {
        const staffId = (req.query.staffId || req.body?.staffId) as string;
        const date = (req.query.date || req.body?.date) as string;
        const serviceId = (req.query.serviceId || req.body?.serviceId) as string;
        if (!staffId || !date || !serviceId) {
          return res.status(400).json({ success: false, error: 'staffId, date, and serviceId required' });
        }
        const slots = await handleSlots(companyId, staffId, date, serviceId, partnerToken);
        return res.status(200).json({ success: true, data: slots });
      }
      case 'check': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'POST required' });
        }
        await handleCheck(companyId, req.body.appointments, partnerToken);
        return res.status(200).json({ success: true, data: null });
      }
      case 'book': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'POST required' });
        }
        const result = await handleBook(companyId, req.body, partnerToken);
        return res.status(200).json({ success: true, data: result });
      }
      case 'resolveMyClientIds': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'POST required' });
        }
        const context = await resolveAuthorizedBookingContext(req, companyId, partnerToken, userToken);
        if (context.valid === false) {
          return res.status(401).json({ success: false, error: context.error });
        }
        return res.status(200).json({
          success: true,
          data: {
            altegClientIds: context.altegClientIds,
            phone: context.phone,
          },
        });
      }
      case 'clientRecords': {
        const context = await resolveAuthorizedBookingContext(req, companyId, partnerToken, userToken);
        if (context.valid === false) {
          return res.status(401).json({ success: false, error: context.error });
        }
        if (context.altegClientIds.length === 0) {
          return res.status(200).json({ success: true, data: [] });
        }
        const records = await handleClientRecords(
          companyId,
          context.altegClientIds.map(String),
          partnerToken,
          userToken,
        );
        return res.status(200).json({ success: true, data: records });
      }
      case 'cancelRecord': {
        if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });
        const crRecordId = req.body?.recordId as string;
        if (!crRecordId) return res.status(400).json({ success: false, error: 'recordId required' });
        const context = await resolveAuthorizedBookingContext(req, companyId, partnerToken, userToken);
        if (context.valid === false) {
          return res.status(401).json({ success: false, error: context.error });
        }
        if (context.altegClientIds.length === 0) {
          return res.status(404).json({ success: false, error: 'Record not found' });
        }
        const records = await handleClientRecords(
          companyId,
          context.altegClientIds.map(String),
          partnerToken,
          userToken,
        );
        const record = records.find((item) => String(item.id) === String(crRecordId));
        if (!record) {
          return res.status(404).json({ success: false, error: 'Record not found' });
        }
        if (record.deleted) {
          return res.status(409).json({ success: false, error: 'Record already cancelled' });
        }
        if (!canCancelBooking(record.datetime)) {
          return res.status(403).json({ success: false, error: 'Cancellation deadline has passed' });
        }
        const cancelResult = await handleCancelRecord(companyId, crRecordId, partnerToken, userToken);
        return res.status(200).json({ success: true, data: cancelResult });
      }
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return res.status(500).json({ success: false, error: message });
  }
}

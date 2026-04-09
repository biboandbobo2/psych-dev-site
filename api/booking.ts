/**
 * GET/POST /api/booking
 * Proxy for alteg.io (YCLIENTS) booking API.
 * Actions: rooms, slots, book, services
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALTEG_BASE = 'https://api.alteg.io/api/v1';

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

async function altegFetch(path: string, partnerToken: string, userToken?: string) {
  const url = `${ALTEG_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders(partnerToken, userToken) });
  const json = await res.json();
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
  const json = await res.json();
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
) {
  const records = await altegFetch<{ datetime: string; length: number; deleted: boolean }[]>(
    `/records/${companyId}?staff_id=${staffId}&start_date=${date}&end_date=${date}`,
    partnerToken,
    userToken,
  );
  return records
    .filter((r) => !r.deleted)
    .map((r) => ({ start: r.datetime, lengthSeconds: r.length }));
}

async function handleFindClient(
  companyId: string,
  email: string,
  partnerToken: string,
  userToken: string,
) {
  const data = await altegPost(`/company/${companyId}/clients/search`, {
    fields: ['id', 'name', 'phone', 'email'],
    filters: [{ type: 'quick_search', state: { value: email } }],
    count: 10,
  }, partnerToken, userToken);
  const clients = (data as { id: number; name: string; phone: string; email: string }[]) || [];
  // Exact email match
  return clients.find((c) => c.email?.toLowerCase() === email.toLowerCase()) || null;
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

async function handleClientRecords(
  companyId: string,
  clientId: string,
  partnerToken: string,
  userToken: string,
) {
  return altegFetch(
    `/records/${companyId}?client_id=${clientId}&count=50`,
    partnerToken,
    userToken,
  );
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
        const busy = await handleBusy(companyId, bStaffId, bDate, partnerToken, userToken);
        return res.status(200).json({ success: true, data: busy });
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
      case 'findClient': {
        const fcEmail = (req.query.email || req.body?.email) as string;
        if (!fcEmail) return res.status(400).json({ success: false, error: 'email required' });
        const client = await handleFindClient(companyId, fcEmail, partnerToken, userToken);
        return res.status(200).json({ success: true, data: client });
      }
      case 'createClient': {
        if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST required' });
        const result = await handleCreateClient(companyId, req.body, partnerToken, userToken);
        return res.status(200).json({ success: true, data: result });
      }
      case 'clientRecords': {
        const crClientId = (req.query.clientId || req.body?.clientId) as string;
        if (!crClientId) return res.status(400).json({ success: false, error: 'clientId required' });
        const records = await handleClientRecords(companyId, crClientId, partnerToken, userToken);
        return res.status(200).json({ success: true, data: records });
      }
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return res.status(500).json({ success: false, error: message });
  }
}

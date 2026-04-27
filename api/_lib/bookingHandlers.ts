// Доменные handlers для /api/booking actions: rooms, services, slots,
// busy, dates, check, book, find/create clients, client records, cancel.

import { altegDelete, altegFetch, altegPost } from './altegClient.js';

export async function handleRooms(
  companyId: string,
  partnerToken: string,
  userToken: string,
): Promise<Array<{ id: number; name: string; avatar: string; specialization: string }>> {
  const staff = await altegFetch(`/company/${companyId}/staff`, partnerToken, userToken);
  // Filter to only visible (non-hidden) staff = rooms
  return staff
    .filter((s: { hidden: number }) => !s.hidden)
    .map((s: { id: number; name: string; avatar: string; specialization: string }) => ({
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      specialization: s.specialization,
    }));
}

export async function handleServices(
  companyId: string,
  partnerToken: string,
  userToken: string,
) {
  return altegFetch(`/company/${companyId}/services`, partnerToken, userToken);
}

export async function handleSlots(
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

export async function handleBusy(
  companyId: string,
  staffId: string,
  date: string,
  partnerToken: string,
  userToken: string,
  includeClientName: boolean,
) {
  const records = (await altegFetch(
    `/records/${companyId}?staff_id=${staffId}&start_date=${date}&end_date=${date}`,
    partnerToken,
    userToken,
  )) as { datetime: string; length: number; deleted: boolean; client?: { name?: string } }[];

  return records
    .filter((r) => !r.deleted)
    .map((r) => {
      const fullName = r.client?.name || '';
      const parts = fullName.trim().split(/\s+/);
      const shortName = parts.length >= 2 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || '';
      return includeClientName
        ? { start: r.datetime, lengthSeconds: r.length, clientName: shortName }
        : { start: r.datetime, lengthSeconds: r.length };
    });
}

type AltegClient = { id: number; name: string; phone: string; email: string };

/**
 * Поиск клиента в alteg по email и/или phone. Дедуплицирует по id.
 * Возвращает клиентов чьи нормализованные email/phone совпадают с запросом.
 */
export async function handleFindClients(
  companyId: string,
  email: string,
  phone: string | undefined,
  partnerToken: string,
  userToken: string,
): Promise<AltegClient[]> {
  const ids = new Set<number>();
  const results: AltegClient[] = [];

  if (email) {
    const byEmail = (await altegPost(
      `/company/${companyId}/clients/search`,
      {
        fields: ['id', 'name', 'phone', 'email'],
        filters: [{ type: 'quick_search', state: { value: email } }],
        count: 20,
      },
      partnerToken,
      userToken,
    )) as AltegClient[];
    for (const c of byEmail || []) {
      if (c.email?.toLowerCase() === email.toLowerCase() && !ids.has(c.id)) {
        ids.add(c.id);
        results.push(c);
      }
    }
  }

  if (phone) {
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const byPhone = (await altegPost(
      `/company/${companyId}/clients/search`,
      {
        fields: ['id', 'name', 'phone', 'email'],
        filters: [{ type: 'quick_search', state: { value: cleanPhone } }],
        count: 20,
      },
      partnerToken,
      userToken,
    )) as AltegClient[];
    for (const c of byPhone || []) {
      const cPhone = c.phone?.replace(/[\s\-()]/g, '') || '';
      if (cPhone === cleanPhone && !ids.has(c.id)) {
        ids.add(c.id);
        results.push(c);
      }
    }
  }

  return results;
}

export async function handleCreateClient(
  companyId: string,
  body: { name: string; phone: string; email: string },
  partnerToken: string,
  userToken: string,
) {
  return altegPost(
    `/clients/${companyId}/bulk`,
    [{ name: body.name, phone: body.phone, email: body.email }],
    partnerToken,
    userToken,
  );
}

export interface BookingRecord {
  id: number;
  datetime: string;
  length: number;
  deleted: boolean;
  services?: { id: number; title: string }[];
  staff?: { id: number; name: string };
  visit_attendance?: number;
}

export async function handleClientRecords(
  companyId: string,
  clientIds: string[],
  partnerToken: string,
  userToken: string,
): Promise<BookingRecord[]> {
  const allRecords: BookingRecord[] = [];
  const seenIds = new Set<number>();
  for (const cid of clientIds) {
    const records = (await altegFetch(
      `/records/${companyId}?client_id=${cid}&count=50`,
      partnerToken,
      userToken,
    )) as BookingRecord[];
    for (const r of records || []) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        allRecords.push(r);
      }
    }
  }
  return allRecords;
}

export async function handleCancelRecord(
  companyId: string,
  recordId: string,
  partnerToken: string,
  userToken: string,
) {
  return altegDelete(`/record/${companyId}/${recordId}`, partnerToken, userToken);
}

export async function handleDates(
  companyId: string,
  staffId: string,
  serviceId: string,
  partnerToken: string,
) {
  const path = `/book_dates/${companyId}?staff_id=${staffId}&service_id=${serviceId}`;
  return altegFetch(path, partnerToken);
}

export async function handleCheck(
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

export async function handleBook(
  companyId: string,
  body: {
    appointments: { staffId: number; serviceId: number; datetime: string }[];
    name: string;
    phone: string;
    email?: string;
    comment?: string;
  },
  partnerToken: string,
  notifyByEmail: boolean,
) {
  const appointments = body.appointments.map((appt, i) => ({
    id: i + 1,
    staff_id: appt.staffId,
    services: [appt.serviceId],
    datetime: appt.datetime,
  }));
  const payload: Record<string, unknown> = {
    fullname: body.name,
    phone: body.phone,
    email: body.email || '',
    comment: body.comment || '',
    appointments,
  };
  // alteg.io: notify_by_email = часы до начала, за которые отправлять подтверждение.
  // Пропускаем поле полностью если пользователь отписался — alteg.io не пришлёт email.
  if (notifyByEmail) {
    payload.notify_by_email = 24;
  }
  return altegPost(`/book_record/${companyId}`, payload, partnerToken);
}

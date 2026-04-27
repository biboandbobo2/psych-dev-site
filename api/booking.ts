/**
 * GET/POST /api/booking
 * Proxy для alteg.io (YCLIENTS) booking API.
 * Actions: rooms, services, slots, busy, batchBusy, dates, check, book,
 *          resolveMyClientIds, clientRecords, cancelRecord
 *
 * Helpers вынесены в api/lib/altegClient.ts, api/lib/bookingHandlers.ts,
 * api/lib/bookingAuth.ts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { canCancelBooking } from '../src/lib/bookingCancellation.js';
import { getAllowedAppOrigin } from '../src/lib/appOrigins.js';
import { getAltegConfig } from './lib/altegClient.js';
import {
  canViewBusyClientNames,
  resolveAuthorizedBookingContext,
  shouldSendBookingEmail,
} from './lib/bookingAuth.js';
import {
  handleBook,
  handleBusy,
  handleCancelRecord,
  handleCheck,
  handleClientRecords,
  handleDates,
  handleRooms,
  handleServices,
  handleSlots,
} from './lib/bookingHandlers.js';

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
    const { partnerToken, userToken, companyId } = getAltegConfig();
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
        const busy = await handleBusy(
          companyId,
          bStaffId,
          bDate,
          partnerToken,
          userToken,
          includeClientName,
        );
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
            const blocks = await handleBusy(
              companyId,
              p.staffId,
              p.date,
              partnerToken,
              userToken,
              includeNames,
            );
            return { key: `${p.staffId}:${p.date}`, blocks };
          }),
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
          return res
            .status(400)
            .json({ success: false, error: 'staffId and serviceId required' });
        }
        const dates = await handleDates(companyId, staffId, serviceId, partnerToken);
        return res.status(200).json({ success: true, data: dates });
      }
      case 'slots': {
        const staffId = (req.query.staffId || req.body?.staffId) as string;
        const date = (req.query.date || req.body?.date) as string;
        const serviceId = (req.query.serviceId || req.body?.serviceId) as string;
        if (!staffId || !date || !serviceId) {
          return res.status(400).json({
            success: false,
            error: 'staffId, date, and serviceId required',
          });
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
        const notifyByEmail = await shouldSendBookingEmail(req);
        const result = await handleBook(companyId, req.body, partnerToken, notifyByEmail);
        return res.status(200).json({ success: true, data: result });
      }
      case 'resolveMyClientIds': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'POST required' });
        }
        const context = await resolveAuthorizedBookingContext(
          req,
          companyId,
          partnerToken,
          userToken,
        );
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
        const context = await resolveAuthorizedBookingContext(
          req,
          companyId,
          partnerToken,
          userToken,
        );
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
        if (req.method !== 'POST')
          return res.status(405).json({ success: false, error: 'POST required' });
        const crRecordId = req.body?.recordId as string;
        if (!crRecordId)
          return res.status(400).json({ success: false, error: 'recordId required' });
        const context = await resolveAuthorizedBookingContext(
          req,
          companyId,
          partnerToken,
          userToken,
        );
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
          return res
            .status(403)
            .json({ success: false, error: 'Cancellation deadline has passed' });
        }
        const cancelResult = await handleCancelRecord(
          companyId,
          crRecordId,
          partnerToken,
          userToken,
        );
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

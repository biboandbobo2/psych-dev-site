import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface BookExamSlotPayload {
  examId: string;
  slotId: string;
  essay: string;
}

interface BookExamSlotResponse {
  ok: true;
  slotId: string;
  groupId: string;
}

interface CancelExamBookingPayload {
  examId: string;
}

interface CancelExamBookingResponse {
  ok: true;
}

export async function bookExamSlot(
  payload: BookExamSlotPayload
): Promise<BookExamSlotResponse> {
  const call = httpsCallable<BookExamSlotPayload, BookExamSlotResponse>(
    functions,
    'bookExamSlot'
  );
  const res = await call(payload);
  return res.data;
}

export async function cancelExamBooking(
  payload: CancelExamBookingPayload
): Promise<CancelExamBookingResponse> {
  const call = httpsCallable<CancelExamBookingPayload, CancelExamBookingResponse>(
    functions,
    'cancelExamBooking'
  );
  const res = await call(payload);
  return res.data;
}

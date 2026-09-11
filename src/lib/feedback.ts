import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
export interface FeedbackPayload {
  type: 'bug' | 'idea' | 'thanks';
  message: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  pageUrl?: string;
  iconId?: string;
  website?: string;
}
/** The existing callable and bot are shared by every feedback entry point. */
export async function submitFeedback(payload: FeedbackPayload) {
  const send = httpsCallable<FeedbackPayload, { success: boolean }>(functions, 'sendFeedback');
  const result = await send(payload);
  if (!result.data.success) throw new Error('Не удалось отправить сообщение. Попробуйте ещё раз.');
}

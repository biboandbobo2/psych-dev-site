import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

interface UpdateMyEmailPreferencesParams {
  emailBookingConfirmations: boolean;
}

interface UpdateMyEmailPreferencesResponse {
  success: true;
  prefs: { emailBookingConfirmations: boolean };
}

/**
 * Обновить email-настройки текущего пользователя.
 * Сейчас — только toggle для подтверждений броней кабинетов (alteg.io).
 */
export async function updateMyEmailPreferences(params: UpdateMyEmailPreferencesParams) {
  const call = httpsCallable<UpdateMyEmailPreferencesParams, UpdateMyEmailPreferencesResponse>(
    functions,
    'updateMyEmailPreferences',
  );
  const result = await call(params);
  return result.data;
}

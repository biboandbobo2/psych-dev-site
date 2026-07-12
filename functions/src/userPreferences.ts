/**
 * Cloud Functions для управления пользовательскими настройками.
 * Пользователь может менять только свои собственные prefs.
 */

import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { debugLog, debugError } from "./lib/debug.js";

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты, не выкручиваем ресурсы.
const CALLABLE_OPTS = { region: "us-central1", cpu: 1, memory: "256MiB" } as const;

interface UpdateMyEmailPreferencesData {
  emailBookingConfirmations?: boolean;
}

interface UpdateMyEmailPreferencesResponse {
  success: true;
  prefs: {
    emailBookingConfirmations: boolean;
  };
}

/**
 * updateMyEmailPreferences — обновляет email-настройки текущего пользователя.
 * Сейчас поддерживает только emailBookingConfirmations (toggle для alteg.io броней).
 *
 * Auth: любой залогиненный пользователь может менять свои собственные prefs.
 */
export const updateMyEmailPreferences = onCall(
  CALLABLE_OPTS,
  async (request: CallableRequest<UpdateMyEmailPreferencesData>): Promise<UpdateMyEmailPreferencesResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const uid = request.auth.uid;
    const value = request.data?.emailBookingConfirmations;

    if (typeof value !== "boolean") {
      throw new HttpsError(
        "invalid-argument",
        "emailBookingConfirmations must be boolean",
      );
    }

    try {
      const firestore = getFirestore();
      const userRef = firestore.collection("users").doc(uid);

      await userRef.set(
        {
          prefs: {
            emailBookingConfirmations: value,
          },
          prefsUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      debugLog("✅ updateMyEmailPreferences", { uid, emailBookingConfirmations: value });

      return {
        success: true,
        prefs: { emailBookingConfirmations: value },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      debugError("❌ updateMyEmailPreferences error", { uid, message });
      throw new HttpsError(
        "internal",
        `Failed to update preferences: ${message}`,
      );
    }
  },
);

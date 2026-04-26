/**
 * Cloud Functions для управления пользовательскими настройками.
 * Пользователь может менять только свои собственные prefs.
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { debugLog, debugError } from "./lib/debug.js";

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
export const updateMyEmailPreferences = functions.https.onCall(
  async (data: UpdateMyEmailPreferencesData, context): Promise<UpdateMyEmailPreferencesResponse> => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const uid = context.auth.uid;
    const value = data?.emailBookingConfirmations;

    if (typeof value !== "boolean") {
      throw new functions.https.HttpsError(
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
      throw new functions.https.HttpsError(
        "internal",
        `Failed to update preferences: ${message}`,
      );
    }
  },
);

/**
 * Cloud Function для отправки обратной связи в Telegram
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";
import { sendTelegramMessage } from "./lib/telegram.js";
import { FUNCTIONS_SERVICE_ACCOUNT, CALLABLE_OPTS as SHARED_CALLABLE_OPTS } from "./lib/shared.js";

type FeedbackType = "bug" | "idea" | "thanks";

interface FeedbackData {
  type: FeedbackType;
  message: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  pageUrl?: string;
}

// serviceAccount: telegram-секреты в Secret Manager доступны только appspot SA.
const CALLABLE_OPTS = { ...SHARED_CALLABLE_OPTS, serviceAccount: FUNCTIONS_SERVICE_ACCOUNT } as const;

const FEEDBACK_EMOJI: Record<FeedbackType, string> = {
  bug: "🐛",
  idea: "💡",
  thanks: "🙏",
};

const FEEDBACK_LABELS: Record<FeedbackType, string> = {
  bug: "Баг",
  idea: "Идея",
  thanks: "Благодарность",
};

/**
 * sendFeedback - отправка обратной связи от пользователя в Telegram
 *
 * @param data.type - тип сообщения: 'bug' | 'idea' | 'thanks'
 * @param data.message - текст сообщения
 * @param data.userEmail - email пользователя (опционально)
 * @param data.userName - имя пользователя (опционально)
 * @param data.userRole - роль пользователя (опционально)
 * @param data.pageUrl - URL страницы откуда отправлено (опционально)
 */
export const sendFeedback = onCall(CALLABLE_OPTS, async (request) => {
  const data = request.data;
  fnLogger.info("🔵 sendFeedback called", {
    caller: request.auth?.uid,
    type: data?.type,
    hasMessage: Boolean(data?.message),
  });

  // Валидация данных
  const feedbackData = data as FeedbackData;

  if (!feedbackData.type || !["bug", "idea", "thanks"].includes(feedbackData.type)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid feedback type. Must be 'bug', 'idea', or 'thanks'"
    );
  }

  if (!feedbackData.message || feedbackData.message.trim().length < 3) {
    throw new HttpsError(
      "invalid-argument",
      "Message is required and must be at least 3 characters"
    );
  }

  if (feedbackData.message.length > 2000) {
    throw new HttpsError(
      "invalid-argument",
      "Message is too long. Maximum 2000 characters"
    );
  }

  // Формируем сообщение для Telegram
  const emoji = FEEDBACK_EMOJI[feedbackData.type];
  const label = FEEDBACK_LABELS[feedbackData.type];

  let telegramMessage = `${emoji} *${label}*\n\n`;
  telegramMessage += `${feedbackData.message}\n\n`;
  telegramMessage += `━━━━━━━━━━━━━━━\n`;

  if (feedbackData.userName) {
    telegramMessage += `👤 ${feedbackData.userName}\n`;
  }
  if (feedbackData.userEmail) {
    telegramMessage += `✉️ ${feedbackData.userEmail}\n`;
  }
  if (feedbackData.userRole) {
    telegramMessage += `🎭 ${feedbackData.userRole}\n`;
  }
  if (feedbackData.pageUrl) {
    telegramMessage += `🔗 ${feedbackData.pageUrl}\n`;
  }

  // Добавляем время
  const now = new Date();
  const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  telegramMessage += `🕐 ${timeStr}`;

  try {
    await sendTelegramMessage(telegramMessage);

    fnLogger.info("✅ Feedback sent successfully", {
      hasMessage: true,
    });

    return {
      success: true,
      message: "Спасибо за обратную связь!",
    };
  } catch (error: any) {
    fnLogger.error("❌ Error sending feedback", {
      error: error?.message,
    });

    throw new HttpsError("internal", "Failed to send feedback: " + error?.message);
  }
});

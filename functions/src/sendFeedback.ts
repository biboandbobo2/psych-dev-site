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
  iconId?: string;
  website?: string;
}

// serviceAccount: telegram-секреты в Secret Manager доступны только appspot SA.
const CALLABLE_OPTS = { ...SHARED_CALLABLE_OPTS, serviceAccount: FUNCTIONS_SERVICE_ACCOUNT } as const;

// Анонимный callable без гейта — простейший rate-limit против спама в TG.
// Лимитер per-instance (in-memory): один инстанс держит до 80 конкурентных
// запросов, так что окно режет основную массу абьюза; распределённый лимит
// (Firestore) — только если появится реальный спам.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map<string, number[]>();

/** Для тестов — сбрасывает окна лимитера (ср. resetPersonalCalendarIdCache). */
export function resetFeedbackRateLimiter(): void {
  rateBuckets.clear();
}

export function isFeedbackRateLimited(key: string, nowMs: number): boolean {
  if (rateBuckets.size > 1000) {
    const cutoffAll = nowMs - RATE_LIMIT_WINDOW_MS;
    for (const [k, times] of rateBuckets) {
      if (!times.some((t) => t > cutoffAll)) rateBuckets.delete(k);
    }
  }
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const bucket = (rateBuckets.get(key) ?? []).filter((t) => t > cutoff);
  if (bucket.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(key, bucket);
    return true;
  }
  bucket.push(nowMs);
  rateBuckets.set(key, bucket);
  return false;
}

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

  const rateKey = request.auth?.uid ?? request.rawRequest?.ip ?? "anon";
  if (isFeedbackRateLimited(rateKey, Date.now())) {
    throw new HttpsError(
      "resource-exhausted",
      "Слишком много сообщений подряд — попробуйте через несколько минут"
    );
  }

  // Валидация данных
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Invalid feedback payload");
  }
  const feedbackData = data as FeedbackData;

  if (!feedbackData.type || !["bug", "idea", "thanks"].includes(feedbackData.type)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid feedback type. Must be 'bug', 'idea', or 'thanks'"
    );
  }

  if (typeof feedbackData.message !== "string" || feedbackData.message.trim().length < 3) {
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

  const limits = { userName: 120, userEmail: 254, userRole: 80, pageUrl: 600, iconId: 100, website: 200 } as const;
  for (const [field, limit] of Object.entries(limits)) {
    const value = data[field];
    if (value !== undefined && (typeof value !== "string" || value.length > limit || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) {
      throw new HttpsError("invalid-argument", `Invalid ${field}`);
    }
  }
  if (feedbackData.website) throw new HttpsError("invalid-argument", "Invalid submission");
  if (feedbackData.iconId && !/^[a-z0-9-]+$/.test(feedbackData.iconId)) {
    throw new HttpsError("invalid-argument", "Invalid iconId");
  }
  if (feedbackData.pageUrl) {
    try {
      const url = new URL(feedbackData.pageUrl);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch { throw new HttpsError("invalid-argument", "Invalid pageUrl"); }
  }

  // Формируем сообщение для Telegram
  const emoji = FEEDBACK_EMOJI[feedbackData.type];
  const label = FEEDBACK_LABELS[feedbackData.type];

  let telegramMessage = `${emoji} ${label}\n\n`;
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

  if (feedbackData.iconId) telegramMessage += `Икона: ${feedbackData.iconId}\n`;

  // Добавляем время
  const now = new Date();
  const timeStr = now.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  telegramMessage += `🕐 ${timeStr}`;

  try {
    await sendTelegramMessage(telegramMessage, { plainText: true });

    fnLogger.info("✅ Feedback sent successfully", {
      hasMessage: true,
    });

    return {
      success: true,
      message: "Спасибо за обратную связь!",
    };
  } catch {
    fnLogger.error("Feedback delivery failed");
    throw new HttpsError("internal", "Не удалось отправить сообщение. Попробуйте позже.");
  }
});

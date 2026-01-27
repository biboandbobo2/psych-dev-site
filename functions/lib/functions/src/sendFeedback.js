/**
 * Cloud Function для отправки обратной связи в Telegram
 */
import * as functions from "firebase-functions";
// Telegram Bot конфигурация
const TELEGRAM_BOT_TOKEN = "8358033723:AAEbjL108SbE35R-2C551VkNEV6iUS5McxU";
const TELEGRAM_CHAT_ID = "262080441";
const FEEDBACK_EMOJI = {
    bug: "🐛",
    idea: "💡",
    thanks: "🙏",
};
const FEEDBACK_LABELS = {
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
export const sendFeedback = functions.https.onCall(async (data, context) => {
    functions.logger.info("🔵 sendFeedback called", {
        caller: context.auth?.uid,
        type: data?.type,
        hasMessage: Boolean(data?.message),
    });
    // Валидация данных
    const feedbackData = data;
    if (!feedbackData.type || !["bug", "idea", "thanks"].includes(feedbackData.type)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid feedback type. Must be 'bug', 'idea', or 'thanks'");
    }
    if (!feedbackData.message || feedbackData.message.trim().length < 3) {
        throw new functions.https.HttpsError("invalid-argument", "Message is required and must be at least 3 characters");
    }
    if (feedbackData.message.length > 2000) {
        throw new functions.https.HttpsError("invalid-argument", "Message is too long. Maximum 2000 characters");
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
        // Отправляем в Telegram
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: "Markdown",
            }),
        });
        const result = await response.json();
        if (!result.ok) {
            functions.logger.error("❌ Telegram API error", result);
            throw new functions.https.HttpsError("internal", "Failed to send message to Telegram");
        }
        functions.logger.info("✅ Feedback sent successfully", {
            messageId: result.result?.message_id,
        });
        return {
            success: true,
            message: "Спасибо за обратную связь!",
        };
    }
    catch (error) {
        functions.logger.error("❌ Error sending feedback", {
            error: error?.message,
        });
        throw new functions.https.HttpsError("internal", "Failed to send feedback: " + error?.message);
    }
});

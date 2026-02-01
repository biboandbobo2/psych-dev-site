import * as functions from "firebase-functions";
function getTelegramConfig() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        throw new Error("Telegram config missing: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID");
    }
    return { token, chatId };
}
export async function sendTelegramMessage(text) {
    const { token, chatId } = getTelegramConfig();
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(telegramUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown",
        }),
    });
    const result = await response.json();
    if (!result.ok) {
        functions.logger.error("❌ Telegram API error", result);
        throw new Error("Failed to send message to Telegram");
    }
    return result;
}

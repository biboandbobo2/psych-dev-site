import * as functions from "firebase-functions";
import { resolveAdminProjectId } from "./adminApp.js";
import { readLatestSecretValue } from "./secrets.js";
const TELEGRAM_BOT_TOKEN_SECRET = process.env.TELEGRAM_BOT_TOKEN_SECRET_NAME || "telegram-bot-token";
const TELEGRAM_CHAT_ID_SECRET = process.env.TELEGRAM_CHAT_ID_SECRET_NAME || "telegram-chat-id";
let telegramConfigPromise = null;
function getTelegramEnvConfig() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        return null;
    }
    return { token, chatId };
}
async function getTelegramSecretConfig() {
    const projectId = resolveAdminProjectId();
    if (!projectId) {
        return null;
    }
    try {
        const [token, chatId] = await Promise.all([
            readLatestSecretValue(TELEGRAM_BOT_TOKEN_SECRET, projectId),
            readLatestSecretValue(TELEGRAM_CHAT_ID_SECRET, projectId),
        ]);
        return { token, chatId };
    }
    catch (error) {
        functions.logger.warn("Telegram secrets are unavailable, falling back to env", {
            error: error?.message || String(error),
            projectId,
        });
        return null;
    }
}
async function getTelegramConfig() {
    if (!telegramConfigPromise) {
        telegramConfigPromise = (async () => {
            const secretConfig = await getTelegramSecretConfig();
            if (secretConfig) {
                return secretConfig;
            }
            const envConfig = getTelegramEnvConfig();
            if (envConfig) {
                return envConfig;
            }
            throw new Error("Telegram config missing: Secret Manager (telegram-bot-token / telegram-chat-id) or TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID");
        })();
    }
    return telegramConfigPromise;
}
export function resetTelegramConfigCache() {
    telegramConfigPromise = null;
}
export async function sendTelegramMessage(text) {
    const { token, chatId } = await getTelegramConfig();
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

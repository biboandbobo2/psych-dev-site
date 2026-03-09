import * as functions from "firebase-functions";
import { GoogleAuth } from "google-auth-library";
import { resolveAdminProjectId } from "./adminApp.js";

const TELEGRAM_BOT_TOKEN_SECRET =
  process.env.TELEGRAM_BOT_TOKEN_SECRET_NAME || "telegram-bot-token";
const TELEGRAM_CHAT_ID_SECRET =
  process.env.TELEGRAM_CHAT_ID_SECRET_NAME || "telegram-chat-id";

interface TelegramConfig {
  token: string;
  chatId: string;
}

let telegramConfigPromise: Promise<TelegramConfig> | null = null;

function getTelegramEnvConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return null;
  }

  return { token, chatId };
}

async function readSecretValue(projectId: string, secretName: string) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/latest:access`;
  const response = await client.request<{ payload?: { data?: string } }>({ url });
  const encoded = response.data.payload?.data;

  if (!encoded) {
    throw new Error(`Secret ${secretName} payload is empty`);
  }

  return Buffer.from(encoded, "base64").toString("utf8");
}

async function getTelegramSecretConfig(): Promise<TelegramConfig | null> {
  const projectId = resolveAdminProjectId();
  if (!projectId) {
    return null;
  }

  try {
    const [token, chatId] = await Promise.all([
      readSecretValue(projectId, TELEGRAM_BOT_TOKEN_SECRET),
      readSecretValue(projectId, TELEGRAM_CHAT_ID_SECRET),
    ]);

    return { token, chatId };
  } catch (error: any) {
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

      throw new Error(
        "Telegram config missing: Secret Manager (telegram-bot-token / telegram-chat-id) or TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID"
      );
    })();
  }

  return telegramConfigPromise;
}

export function resetTelegramConfigCache() {
  telegramConfigPromise = null;
}

export async function sendTelegramMessage(text: string) {
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

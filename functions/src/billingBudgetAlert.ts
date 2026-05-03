import * as functions from "firebase-functions";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";

import {
  evaluateBillingAlertDelivery,
  getBillingPeriodKey,
  getBillingThresholdKey,
  type BillingAlertDeliveryState,
} from "./billingAlertState.js";
import { sendTelegramMessage } from "./lib/telegram.js";
import { ensureAdminApp } from "./lib/adminApp.js";

type Logger = Pick<typeof functions.logger, "info" | "warn" | "error">;

export type BudgetPayload = Record<string, unknown>;

export type BillingConfig = {
  projectId: string;
  billingAccountId: string;
  alertUsd: number;
  hardStopUsd: number;
  alertThreshold: number;
  hardStopThreshold: number;
  alertMaxMessagesPerThreshold: number;
};

function parseNumberEnv(value: string | undefined, fallback: number, label: string) {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${label}: ${value}`);
  }
  return parsed;
}

function getBillingConfigFromEnv(): BillingConfig {
  const projectId = process.env.BILLING_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const billingAccountId = process.env.BILLING_ACCOUNT_ID;

  if (!projectId) {
    throw new Error("Billing config missing: BILLING_PROJECT_ID or GCLOUD_PROJECT");
  }
  if (!billingAccountId) {
    throw new Error("Billing config missing: BILLING_ACCOUNT_ID");
  }

  return {
    projectId,
    billingAccountId,
    alertUsd: parseNumberEnv(process.env.BILLING_ALERT_USD, 1, "BILLING_ALERT_USD"),
    hardStopUsd: parseNumberEnv(process.env.BILLING_HARD_STOP_USD, 5, "BILLING_HARD_STOP_USD"),
    alertThreshold: parseNumberEnv(
      process.env.BILLING_ALERT_THRESHOLD,
      0.2,
      "BILLING_ALERT_THRESHOLD"
    ),
    hardStopThreshold: parseNumberEnv(
      process.env.BILLING_HARD_STOP_THRESHOLD,
      1,
      "BILLING_HARD_STOP_THRESHOLD"
    ),
    alertMaxMessagesPerThreshold: parseNumberEnv(
      process.env.BILLING_ALERT_MAX_MESSAGES_PER_THRESHOLD,
      2,
      "BILLING_ALERT_MAX_MESSAGES_PER_THRESHOLD"
    ),
  };
}

export function parseBudgetMessage(message: { json?: unknown; data?: string | Buffer }) {
  if (message.json && typeof message.json === "object") {
    return message.json as BudgetPayload;
  }

  if (!message.data) {
    return {};
  }

  try {
    const encoded = Buffer.isBuffer(message.data)
      ? message.data.toString("utf8")
      : message.data;
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    return JSON.parse(decoded) as BudgetPayload;
  } catch (error) {
    return {};
  }
}

export function normalizeBudgetPayload(payload: BudgetPayload) {
  return {
    costAmount: Number(payload.costAmount || 0),
    budgetAmount: Number(payload.budgetAmount || 0),
    currency: String(payload.currencyCode || "USD"),
    threshold: Number(payload.alertThresholdExceeded || 0),
    budgetName: String(payload.budgetDisplayName || "Budget"),
  };
}

async function disableBilling(projectId: string) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-billing"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (!token || !token.token) {
    throw new Error("Failed to obtain access token for Cloud Billing API");
  }

  const url = `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`;
  const headers = {
    Authorization: `Bearer ${token.token}`,
    "Content-Type": "application/json",
  };

  const current = await fetch(url, { headers });
  if (!current.ok) {
    const text = await current.text();
    throw new Error(`Billing lookup failed: ${current.status} ${text}`);
  }

  const info = await current.json();
  if (!info?.billingAccountName) {
    return { alreadyDisabled: true };
  }

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      billingAccountName: "",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Billing disable failed: ${response.status} ${text}`);
  }

  return { alreadyDisabled: false };
}

function getBillingAlertStateDocId(projectId: string, budgetName: string) {
  const normalizedBudgetName = budgetName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `billingBudgetAlert_${projectId}_${normalizedBudgetName || "budget"}`;
}

async function loadBillingAlertState(projectId: string, budgetName: string) {
  ensureAdminApp();
  const db = getFirestore();
  const snapshot = await db
    .collection("opsRuntime")
    .doc(getBillingAlertStateDocId(projectId, budgetName))
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Partial<BillingAlertDeliveryState> | undefined;
  if (!data?.periodKey || !data.thresholdKey) {
    return null;
  }

  return {
    periodKey: data.periodKey,
    thresholdKey: data.thresholdKey,
    lastCostCents: Number(data.lastCostCents || 0),
    sentCount: Number(data.sentCount || 0),
  } satisfies BillingAlertDeliveryState;
}

async function storeBillingAlertState(
  projectId: string,
  budgetName: string,
  state: BillingAlertDeliveryState
) {
  ensureAdminApp();
  const db = getFirestore();
  await db
    .collection("opsRuntime")
    .doc(getBillingAlertStateDocId(projectId, budgetName))
    .set(
      {
        ...state,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

async function shouldSendBudgetAlertMessage(
  payload: {
    projectId: string;
    budgetName: string;
    threshold: number;
    costAmount: number;
  },
  config: BillingConfig,
  logger: Logger
) {
  try {
    const previousState = await loadBillingAlertState(payload.projectId, payload.budgetName);
    const decision = evaluateBillingAlertDelivery({
      previousState,
      periodKey: getBillingPeriodKey(),
      thresholdKey: getBillingThresholdKey(payload.threshold),
      costCents: Math.round(payload.costAmount * 100),
      maxMessagesPerThreshold: config.alertMaxMessagesPerThreshold,
    });

    return {
      shouldSend: decision.shouldSend,
      persist: () =>
        storeBillingAlertState(payload.projectId, payload.budgetName, decision.nextState),
    };
  } catch (error) {
    logger.warn("⚠️ Billing alert dedupe failed, continuing without dedupe", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      shouldSend: true,
      persist: async () => undefined,
    };
  }
}

export async function handleBudgetAlert(
  payload: BudgetPayload,
  deps: {
    logger: Logger;
    sendMessage: (text: string) => Promise<unknown>;
    disableBilling: (projectId: string) => Promise<{ alreadyDisabled: boolean }>;
    config?: BillingConfig;
    shouldSendBudgetAlertMessage?: typeof shouldSendBudgetAlertMessage;
  }
) {
  const { logger, sendMessage, disableBilling: disableBillingFn } = deps;
  const config = deps.config ?? getBillingConfigFromEnv();
  const shouldSendBudgetAlertMessageFn =
    deps.shouldSendBudgetAlertMessage ?? shouldSendBudgetAlertMessage;

  const { costAmount, budgetAmount, currency, threshold, budgetName } =
    normalizeBudgetPayload(payload);

  const hasUsdCost = Number.isFinite(costAmount) && currency === "USD";
  const isHardStop = hasUsdCost
    ? costAmount >= config.hardStopUsd
    : threshold >= config.hardStopThreshold;
  const isAlert = hasUsdCost
    ? costAmount >= config.alertUsd
    : threshold >= config.alertThreshold;

  if (!isAlert && !isHardStop) {
    logger.info("ℹ️ Budget alert below thresholds", { payload });
    return;
  }

  if (isHardStop) {
    const delivery = await shouldSendBudgetAlertMessageFn(
      {
        projectId: config.projectId,
        budgetName,
        threshold,
        costAmount,
      },
      config,
      logger
    );

    const stopMessage =
      `⛔ *Hard Stop Triggered*\n\n` +
      `Budget: *${budgetName}*\n` +
      `Project: \`${config.projectId}\`\n` +
      `Billing: \`${config.billingAccountId}\`\n` +
      `Spend: *${costAmount.toFixed(2)} ${currency}* of ${budgetAmount.toFixed(2)} ${currency}\n` +
      `Threshold: ${(threshold * 100).toFixed(0)}%`;

    if (delivery.shouldSend) {
      await sendMessage(stopMessage);
      await delivery.persist();
    } else {
      logger.info("ℹ️ Skipping duplicate hard-stop Telegram alert", {
        budgetName,
        costAmount,
        threshold,
      });
    }

    try {
      const result = await disableBillingFn(config.projectId);
      if (!delivery.shouldSend) {
        return;
      }
      if (result.alreadyDisabled) {
        await sendMessage(
          `ℹ️ Billing already disabled for project \`${config.projectId}\`.`
        );
        return;
      }

      await sendMessage(
        `✅ Billing disabled for project \`${config.projectId}\`. Manual re-enable required.`
      );
    } catch (error: any) {
      await sendMessage(
        `❌ Failed to disable billing for \`${config.projectId}\`: ${error?.message || error}`
      );
      throw error;
    }
    return;
  }

  if (isAlert) {
    const delivery = await shouldSendBudgetAlertMessageFn(
      {
        projectId: config.projectId,
        budgetName,
        threshold,
        costAmount,
      },
      config,
      logger
    );
    if (!delivery.shouldSend) {
      logger.info("ℹ️ Skipping duplicate budget Telegram alert", {
        budgetName,
        costAmount,
        threshold,
      });
      return;
    }

    const alertMessage =
      `💸 *GCP Budget Alert*\n\n` +
      `Budget: *${budgetName}*\n` +
      `Project: \`${config.projectId}\`\n` +
      `Billing: \`${config.billingAccountId}\`\n` +
      `Spend: *${costAmount.toFixed(2)} ${currency}* of ${budgetAmount.toFixed(2)} ${currency}\n` +
      `Threshold: ${(threshold * 100).toFixed(0)}%`;

    await sendMessage(alertMessage);
    await delivery.persist();
  }
}

export const billingBudgetAlert = functions.pubsub
  .topic("billing-budget-alerts")
  .onPublish(async (message) => {
    const payload = parseBudgetMessage(message);
    return handleBudgetAlert(payload, {
      logger: functions.logger,
      sendMessage: sendTelegramMessage,
      disableBilling,
    });
  });

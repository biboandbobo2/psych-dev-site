import * as functions from "firebase-functions";
import { GoogleAuth } from "google-auth-library";
import { sendTelegramMessage } from "./lib/telegram.js";
function parseNumberEnv(value, fallback, label) {
    if (value === undefined || value === "") {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid number for ${label}: ${value}`);
    }
    return parsed;
}
function getBillingConfigFromEnv() {
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
        alertThreshold: parseNumberEnv(process.env.BILLING_ALERT_THRESHOLD, 0.2, "BILLING_ALERT_THRESHOLD"),
        hardStopThreshold: parseNumberEnv(process.env.BILLING_HARD_STOP_THRESHOLD, 1, "BILLING_HARD_STOP_THRESHOLD"),
    };
}
export function parseBudgetMessage(message) {
    if (message.json && typeof message.json === "object") {
        return message.json;
    }
    if (!message.data) {
        return {};
    }
    try {
        const encoded = Buffer.isBuffer(message.data)
            ? message.data.toString("utf8")
            : message.data;
        const decoded = Buffer.from(encoded, "base64").toString("utf8");
        return JSON.parse(decoded);
    }
    catch (error) {
        return {};
    }
}
export function normalizeBudgetPayload(payload) {
    return {
        costAmount: Number(payload.costAmount || 0),
        budgetAmount: Number(payload.budgetAmount || 0),
        currency: String(payload.currencyCode || "USD"),
        threshold: Number(payload.alertThresholdExceeded || 0),
        budgetName: String(payload.budgetDisplayName || "Budget"),
    };
}
async function disableBilling(projectId) {
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
        method: "PATCH",
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
export async function handleBudgetAlert(payload, deps) {
    const { logger, sendMessage, disableBilling: disableBillingFn } = deps;
    const config = deps.config ?? getBillingConfigFromEnv();
    const { costAmount, budgetAmount, currency, threshold, budgetName } = normalizeBudgetPayload(payload);
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
        const stopMessage = `⛔ *Hard Stop Triggered*\n\n` +
            `Budget: *${budgetName}*\n` +
            `Project: \`${config.projectId}\`\n` +
            `Billing: \`${config.billingAccountId}\`\n` +
            `Spend: *${costAmount.toFixed(2)} ${currency}* of ${budgetAmount.toFixed(2)} ${currency}\n` +
            `Threshold: ${(threshold * 100).toFixed(0)}%`;
        await sendMessage(stopMessage);
        try {
            const result = await disableBillingFn(config.projectId);
            if (result.alreadyDisabled) {
                await sendMessage(`ℹ️ Billing already disabled for project \`${config.projectId}\`.`);
                return;
            }
            await sendMessage(`✅ Billing disabled for project \`${config.projectId}\`. Manual re-enable required.`);
        }
        catch (error) {
            await sendMessage(`❌ Failed to disable billing for \`${config.projectId}\`: ${error?.message || error}`);
            throw error;
        }
        return;
    }
    if (isAlert) {
        const alertMessage = `💸 *GCP Budget Alert*\n\n` +
            `Budget: *${budgetName}*\n` +
            `Project: \`${config.projectId}\`\n` +
            `Billing: \`${config.billingAccountId}\`\n` +
            `Spend: *${costAmount.toFixed(2)} ${currency}* of ${budgetAmount.toFixed(2)} ${currency}\n` +
            `Threshold: ${(threshold * 100).toFixed(0)}%`;
        await sendMessage(alertMessage);
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

import { onCall } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";

import { getBillingSummaryData } from "./billingExport.js";
import { ensureSuperAdmin, FUNCTIONS_SERVICE_ACCOUNT, CALLABLE_OPTS as SHARED_CALLABLE_OPTS } from "./lib/shared.js";

// serviceAccount: BigQuery billing export читается через ADC — доступ у appspot SA.
const CALLABLE_OPTS = { ...SHARED_CALLABLE_OPTS, serviceAccount: FUNCTIONS_SERVICE_ACCOUNT } as const;

export const getBillingSummary = onCall(CALLABLE_OPTS, async (request) => {
  ensureSuperAdmin(request);
  try {
    const data = request.data;
    const invoiceMonth =
      data && typeof data === "object" && typeof (data as { invoiceMonth?: unknown }).invoiceMonth === "string"
        ? ((data as { invoiceMonth: string }).invoiceMonth)
        : undefined;
    return await getBillingSummaryData({ invoiceMonth });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack.split("\n").slice(0, 4) : [];
    fnLogger.error("[getBillingSummary] failed", { message, stack });
    // configured=false только для реально ненастроенного экспорта; рантайм-падение
    // (BigQuery/token/сеть) — это configured=true + error, клиент не должен путать.
    const isConfigIssue = message.includes("config missing");
    return {
      ok: false as const,
      configured: !isConfigIssue,
      error: `Billing summary unavailable: ${message}`,
      diagnostics: [
        "Cloud Function getBillingSummary упала с исключением — детали в Cloud Logging.",
        ...stack,
      ],
    };
  }
});

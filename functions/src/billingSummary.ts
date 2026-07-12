import { onCall } from "firebase-functions/v2/https";
import * as fnLogger from "firebase-functions/logger";

import { getBillingSummaryData } from "./billingExport.js";
import { ensureSuperAdmin, FUNCTIONS_SERVICE_ACCOUNT } from "./lib/shared.js";

// Клиент вызывает getFunctions(app) без региона → us-central1 обязателен.
// cpu/memory явно: у gen2 другие дефолты (cpu до 1 vCPU и т.п.), не выкручиваем ресурсы.
// serviceAccount: BigQuery billing export читается через ADC — доступ у appspot SA.
const CALLABLE_OPTS = {
  region: "us-central1",
  cpu: 1,
  memory: "256MiB",
  serviceAccount: FUNCTIONS_SERVICE_ACCOUNT,
} as const;

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
    return {
      ok: false as const,
      configured: false as const,
      error: `Billing summary unavailable: ${message}`,
      diagnostics: [
        "Cloud Function getBillingSummary упала с исключением — детали в Cloud Logging.",
        ...stack,
      ],
    };
  }
});

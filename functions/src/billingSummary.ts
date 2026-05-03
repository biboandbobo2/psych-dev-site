import * as functions from "firebase-functions";

import { getBillingSummaryData } from "./billingExport.js";
import { ensureSuperAdmin } from "./lib/shared.js";

export const getBillingSummary = functions.https.onCall(async (_data, context) => {
  ensureSuperAdmin(context);
  try {
    return await getBillingSummaryData();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? error.stack.split("\n").slice(0, 4) : [];
    functions.logger.error("[getBillingSummary] failed", { message, stack });
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

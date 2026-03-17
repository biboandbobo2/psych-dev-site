import * as functions from "firebase-functions";
import { getBillingSummaryData } from "./billingExport.js";
import { ensureSuperAdmin } from "./lib/shared.js";
export const getBillingSummary = functions.https.onCall(async (_data, context) => {
    ensureSuperAdmin(context);
    return getBillingSummaryData();
});

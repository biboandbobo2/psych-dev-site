import { resolveAdminProjectId } from "../adminApp.js";

const DEFAULT_LOOKBACK_DAYS = 14;
export const DEFAULT_MAX_SERVICES = 8;
export const DEFAULT_MAX_SKUS_PER_SERVICE = 6;

export interface BillingExportConfig {
  billingProjectId: string;
  exportProjectId: string;
  datasetId?: string;
  tableId?: string;
  location?: string;
  billingAccountId?: string;
  lookbackDays: number;
  maxServices: number;
  maxSkusPerService: number;
}

export interface BillingExportTableRef {
  projectId: string;
  datasetId: string;
  tableId: string;
  location?: string;
  tablePath: string;
}

function parseNumberEnv(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getBillingExportConfig(): BillingExportConfig {
  const billingProjectId = process.env.BILLING_PROJECT_ID || resolveAdminProjectId();
  const exportProjectId = process.env.BILLING_EXPORT_BQ_PROJECT_ID || billingProjectId;

  if (!billingProjectId || !exportProjectId) {
    throw new Error("Billing export config missing: BILLING_PROJECT_ID/GCLOUD_PROJECT");
  }

  return {
    billingProjectId,
    exportProjectId,
    datasetId: process.env.BILLING_EXPORT_BQ_DATASET,
    tableId: process.env.BILLING_EXPORT_BQ_TABLE,
    location: process.env.BILLING_EXPORT_BQ_LOCATION,
    billingAccountId: process.env.BILLING_ACCOUNT_ID,
    lookbackDays: parseNumberEnv(
      process.env.BILLING_SUMMARY_LOOKBACK_DAYS,
      DEFAULT_LOOKBACK_DAYS
    ),
    maxServices: parseNumberEnv(process.env.BILLING_SUMMARY_MAX_SERVICES, DEFAULT_MAX_SERVICES),
    maxSkusPerService: parseNumberEnv(
      process.env.BILLING_SUMMARY_MAX_SKUS_PER_SERVICE,
      DEFAULT_MAX_SKUS_PER_SERVICE
    ),
  };
}

export function getCurrentInvoiceMonth(now = new Date()) {
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(invoiceMonth: string) {
  if (!/^\d{6}$/.test(invoiceMonth)) {
    return invoiceMonth;
  }

  const year = Number(invoiceMonth.slice(0, 4));
  const monthIndex = Number(invoiceMonth.slice(4, 6)) - 1;
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, monthIndex, 1))
  );
}

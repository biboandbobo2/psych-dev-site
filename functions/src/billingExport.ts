import {
  decodeBigQueryRows,
  getAccessToken,
  runBigQueryQuery,
  safeRunQuery,
  type BigQueryQueryResponse,
} from "./lib/billingExport/bigquery.js";
import {
  DEFAULT_MAX_SERVICES,
  DEFAULT_MAX_SKUS_PER_SERVICE,
  getBillingExportConfig,
  getCurrentInvoiceMonth,
  getMonthLabel,
  type BillingExportConfig,
  type BillingExportTableRef,
} from "./lib/billingExport/config.js";
import {
  discoverBillingExportTable,
  getArchiveTablePath,
} from "./lib/billingExport/discovery.js";
import {
  buildArchiveAvailableMonthsQuery,
  buildArchiveDailyTrendQuery,
  buildArchiveMetadataQuery,
  buildArchiveServiceSkuQuery,
  buildBillingDailyTrendQuery,
  buildBillingMetadataQuery,
  buildBillingServiceSkuQuery,
  buildLiveAvailableMonthsQuery,
} from "./lib/billingExport/queries.js";

export { pickBillingExportTable } from "./lib/billingExport/discovery.js";

interface BillingServiceSkuRow {
  service: string;
  sku: string;
  costUsd: number;
}

interface BillingDailyCostRow {
  usageDate: string;
  costUsd: number;
}

interface BillingMetadataRow {
  totalCostUsd: number;
  lastUsageEnd: string | null;
}

export interface BillingSummarySku {
  sku: string;
  costUsd: number;
}

export interface BillingSummaryService {
  service: string;
  costUsd: number;
  skus: BillingSummarySku[];
}

export interface BillingSummaryData {
  projectId: string;
  month: string;
  monthLabel: string;
  totalCostUsd: number;
  lastUsageEnd: string | null;
  recentDays: Array<{ date: string; costUsd: number }>;
  services: BillingSummaryService[];
  tableRef: string;
  dataSource: "bigquery" | "bigquery_archive";
}

export type BillingSummaryResult =
  | {
      ok: true;
      configured: true;
      summary: BillingSummaryData;
      availableMonths: string[];
    }
  | { ok: false; configured: false; error: string; diagnostics?: string[] };

export interface BillingSummaryRequest {
  invoiceMonth?: string;
}

export function groupBillingServiceRows(
  rows: BillingServiceSkuRow[],
  maxServices = DEFAULT_MAX_SERVICES,
  maxSkusPerService = DEFAULT_MAX_SKUS_PER_SERVICE
): BillingSummaryService[] {
  const services = new Map<string, BillingSummaryService>();

  for (const row of rows) {
    if (!services.has(row.service)) {
      services.set(row.service, {
        service: row.service,
        costUsd: 0,
        skus: [],
      });
    }

    const service = services.get(row.service)!;
    service.costUsd += row.costUsd;
    service.skus.push({ sku: row.sku, costUsd: row.costUsd });
  }

  return Array.from(services.values())
    .map((service) => ({
      ...service,
      costUsd: Number(service.costUsd.toFixed(2)),
      skus: service.skus
        .sort((left, right) => right.costUsd - left.costUsd)
        .slice(0, maxSkusPerService),
    }))
    .sort((left, right) => right.costUsd - left.costUsd)
    .slice(0, maxServices);
}

async function fetchArchiveSummary(
  token: string,
  archivePath: string,
  archiveLocation: string | undefined,
  projectId: string,
  invoiceMonth: string,
  config: BillingExportConfig
): Promise<{
  totalCostUsd: number;
  lastUsageEnd: string | null;
  services: BillingSummaryService[];
  recentDays: Array<{ date: string; costUsd: number }>;
} | null> {
  const tableRef = { projectId: config.exportProjectId, location: archiveLocation };
  const rowLimit = Math.max(50, config.maxServices * config.maxSkusPerService * 3);

  const [serviceSkuPayload, dailyPayload, metadataPayload] = await Promise.all([
    safeRunQuery(token, tableRef, buildArchiveServiceSkuQuery(archivePath, rowLimit), [
      { name: "projectId", type: "STRING", value: projectId },
      { name: "invoiceMonth", type: "STRING", value: invoiceMonth },
    ]),
    safeRunQuery(token, tableRef, buildArchiveDailyTrendQuery(archivePath), [
      { name: "projectId", type: "STRING", value: projectId },
      { name: "invoiceMonth", type: "STRING", value: invoiceMonth },
    ]),
    safeRunQuery(token, tableRef, buildArchiveMetadataQuery(archivePath), [
      { name: "projectId", type: "STRING", value: projectId },
      { name: "invoiceMonth", type: "STRING", value: invoiceMonth },
    ]),
  ]);

  if (!metadataPayload) {
    // Архивной таблицы нет вообще.
    return null;
  }

  const serviceRows = serviceSkuPayload
    ? decodeBigQueryRows(serviceSkuPayload, (record): BillingServiceSkuRow => ({
        service: record.service || "Unknown service",
        sku: record.sku || "Unknown SKU",
        costUsd: Number(record.costUsd || 0),
      }))
    : [];
  const dailyRows = dailyPayload
    ? decodeBigQueryRows(dailyPayload, (record): BillingDailyCostRow => ({
        usageDate: record.usageDate || "",
        costUsd: Number(record.costUsd || 0),
      }))
    : [];
  const metadata =
    decodeBigQueryRows(metadataPayload, (record): BillingMetadataRow => ({
      totalCostUsd: Number(record.totalCostUsd || 0),
      lastUsageEnd: record.lastUsageEnd || null,
    }))[0] || { totalCostUsd: 0, lastUsageEnd: null };

  return {
    totalCostUsd: metadata.totalCostUsd,
    lastUsageEnd: metadata.lastUsageEnd,
    services: groupBillingServiceRows(serviceRows, config.maxServices, config.maxSkusPerService),
    recentDays: dailyRows.map((row) => ({ date: row.usageDate, costUsd: row.costUsd })),
  };
}

async function fetchAvailableMonths(
  token: string,
  liveTableRef: BillingExportTableRef | null,
  archivePath: string,
  archiveLocation: string | undefined,
  projectId: string,
  config: BillingExportConfig
): Promise<string[]> {
  const requests: Array<Promise<BigQueryQueryResponse | null>> = [];

  if (liveTableRef) {
    requests.push(
      safeRunQuery(token, liveTableRef, buildLiveAvailableMonthsQuery(liveTableRef.tablePath), [
        { name: "projectId", type: "STRING", value: projectId },
      ])
    );
  } else {
    requests.push(Promise.resolve(null));
  }

  requests.push(
    safeRunQuery(
      token,
      { projectId: config.exportProjectId, location: archiveLocation },
      buildArchiveAvailableMonthsQuery(archivePath),
      [{ name: "projectId", type: "STRING", value: projectId }]
    )
  );

  const [livePayload, archivePayload] = await Promise.all(requests);
  const months = new Set<string>();
  for (const payload of [livePayload, archivePayload]) {
    if (!payload) continue;
    decodeBigQueryRows(payload, (record): { invoice_month: string } => ({
      invoice_month: record.invoice_month || "",
    })).forEach((row) => {
      if (row.invoice_month) months.add(row.invoice_month);
    });
  }
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export async function getBillingSummaryData(
  request: BillingSummaryRequest = {}
): Promise<BillingSummaryResult> {
  const config = getBillingExportConfig();
  const token = await getAccessToken();
  const liveTableRef = await discoverBillingExportTable(token, config);
  const archivePath = getArchiveTablePath(config, liveTableRef);
  const archiveLocation = liveTableRef?.location || config.location;

  const requestedMonth = request.invoiceMonth?.trim() || getCurrentInvoiceMonth();
  if (!/^\d{6}$/.test(requestedMonth)) {
    return {
      ok: false,
      configured: false,
      error: `Invalid invoiceMonth: "${requestedMonth}". Expected YYYYMM.`,
    };
  }

  const availableMonths = await fetchAvailableMonths(
    token,
    liveTableRef,
    archivePath,
    archiveLocation,
    config.billingProjectId,
    config
  );

  // 1) Live export (если есть таблица).
  let liveSummary: {
    totalCostUsd: number;
    lastUsageEnd: string | null;
    services: BillingSummaryService[];
    recentDays: Array<{ date: string; costUsd: number }>;
  } | null = null;
  if (liveTableRef) {
    const rowLimit = Math.max(50, config.maxServices * config.maxSkusPerService * 3);
    const [serviceSkuPayload, dailyPayload, metadataPayload] = await Promise.all([
      runBigQueryQuery(
        token,
        liveTableRef,
        buildBillingServiceSkuQuery(liveTableRef.tablePath, rowLimit),
        [
          { name: "projectId", type: "STRING", value: config.billingProjectId },
          { name: "invoiceMonth", type: "STRING", value: requestedMonth },
        ]
      ),
      runBigQueryQuery(
        token,
        liveTableRef,
        buildBillingDailyTrendQuery(liveTableRef.tablePath, config.lookbackDays),
        [{ name: "projectId", type: "STRING", value: config.billingProjectId }]
      ),
      runBigQueryQuery(
        token,
        liveTableRef,
        buildBillingMetadataQuery(liveTableRef.tablePath),
        [
          { name: "projectId", type: "STRING", value: config.billingProjectId },
          { name: "invoiceMonth", type: "STRING", value: requestedMonth },
        ]
      ),
    ]);

    const serviceRows = decodeBigQueryRows(serviceSkuPayload, (record): BillingServiceSkuRow => ({
      service: record.service || "Unknown service",
      sku: record.sku || "Unknown SKU",
      costUsd: Number(record.costUsd || 0),
    }));
    const dailyRows = decodeBigQueryRows(dailyPayload, (record): BillingDailyCostRow => ({
      usageDate: record.usageDate || "",
      costUsd: Number(record.costUsd || 0),
    }));
    const metadata =
      decodeBigQueryRows(metadataPayload, (record): BillingMetadataRow => ({
        totalCostUsd: Number(record.totalCostUsd || 0),
        lastUsageEnd: record.lastUsageEnd || null,
      }))[0] || { totalCostUsd: 0, lastUsageEnd: null };

    liveSummary = {
      totalCostUsd: metadata.totalCostUsd,
      lastUsageEnd: metadata.lastUsageEnd,
      services: groupBillingServiceRows(serviceRows, config.maxServices, config.maxSkusPerService),
      recentDays: dailyRows.map((row) => ({ date: row.usageDate, costUsd: row.costUsd })),
    };

    if (liveSummary.totalCostUsd > 0 || liveSummary.services.length > 0) {
      return {
        ok: true,
        configured: true,
        availableMonths,
        summary: {
          projectId: config.billingProjectId,
          month: requestedMonth,
          monthLabel: getMonthLabel(requestedMonth),
          totalCostUsd: Number(liveSummary.totalCostUsd.toFixed(2)),
          lastUsageEnd: liveSummary.lastUsageEnd,
          recentDays: liveSummary.recentDays,
          services: liveSummary.services,
          tableRef: liveTableRef.tablePath,
          dataSource: "bigquery",
        },
      };
    }
  }

  // 2) Fallback на архив (загруженный из CSV).
  const archiveSummary = await fetchArchiveSummary(
    token,
    archivePath,
    archiveLocation,
    config.billingProjectId,
    requestedMonth,
    config
  );

  if (archiveSummary && (archiveSummary.totalCostUsd > 0 || archiveSummary.services.length > 0)) {
    return {
      ok: true,
      configured: true,
      availableMonths,
      summary: {
        projectId: config.billingProjectId,
        month: requestedMonth,
        monthLabel: getMonthLabel(requestedMonth),
        totalCostUsd: Number(archiveSummary.totalCostUsd.toFixed(2)),
        lastUsageEnd: archiveSummary.lastUsageEnd,
        recentDays: archiveSummary.recentDays,
        services: archiveSummary.services,
        tableRef: archivePath,
        dataSource: "bigquery_archive",
      },
    };
  }

  // 3) Ничего нет.
  if (!liveTableRef && !archiveSummary) {
    return {
      ok: false,
      configured: false,
      error: "Billing export table not found",
      diagnostics: [
        "В проекте не найден BigQuery billing export и архивная таблица billing_archive.",
        "Включи Cloud Billing export в BigQuery или задай BILLING_EXPORT_BQ_DATASET / BILLING_EXPORT_BQ_TABLE.",
      ],
    };
  }

  // Live и/или archive существуют, но за этот месяц пусто — возвращаем валидный пустой summary.
  return {
    ok: true,
    configured: true,
    availableMonths,
    summary: {
      projectId: config.billingProjectId,
      month: requestedMonth,
      monthLabel: getMonthLabel(requestedMonth),
      totalCostUsd: 0,
      lastUsageEnd: null,
      recentDays: [],
      services: [],
      tableRef: liveTableRef?.tablePath ?? archivePath,
      dataSource: liveTableRef ? "bigquery" : "bigquery_archive",
    },
  };
}

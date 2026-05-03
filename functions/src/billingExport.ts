import { GoogleAuth } from "google-auth-library";

import { resolveAdminProjectId } from "./lib/adminApp.js";

const BIGQUERY_SCOPE = "https://www.googleapis.com/auth/bigquery.readonly";
const DEFAULT_LOOKBACK_DAYS = 14;
const DEFAULT_MAX_SERVICES = 8;
const DEFAULT_MAX_SKUS_PER_SERVICE = 6;

interface BigQuerySchemaField {
  name: string;
}

interface BigQueryRowCell {
  v: string | null;
}

interface BigQueryRow {
  f: BigQueryRowCell[];
}

interface BigQueryQueryResponse {
  schema?: { fields?: BigQuerySchemaField[] };
  rows?: BigQueryRow[];
}

interface BigQueryDatasetItem {
  datasetReference?: { datasetId?: string; projectId?: string };
  location?: string;
}

interface BigQueryDatasetsResponse {
  datasets?: BigQueryDatasetItem[];
  nextPageToken?: string;
}

interface BigQueryTableItem {
  tableReference?: { tableId?: string };
}

interface BigQueryTablesResponse {
  tables?: BigQueryTableItem[];
  nextPageToken?: string;
}

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

interface BillingExportConfig {
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

interface BillingExportTableRef {
  projectId: string;
  datasetId: string;
  tableId: string;
  location?: string;
  tablePath: string;
}

interface DiscoveredBillingExportTable {
  datasetId: string;
  tableId: string;
  location?: string;
}

function parseNumberEnv(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBillingExportConfig(): BillingExportConfig {
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

function normalizeBillingAccountIdForTable(billingAccountId: string | undefined) {
  return (billingAccountId || "").replace(/[^A-Za-z0-9]/g, "_");
}

function getCurrentInvoiceMonth(now = new Date()) {
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(invoiceMonth: string) {
  if (!/^\d{6}$/.test(invoiceMonth)) {
    return invoiceMonth;
  }

  const year = Number(invoiceMonth.slice(0, 4));
  const monthIndex = Number(invoiceMonth.slice(4, 6)) - 1;
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, monthIndex, 1))
  );
}

async function getAccessToken() {
  const auth = new GoogleAuth({ scopes: [BIGQUERY_SCOPE] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  if (!token?.token) {
    throw new Error("Failed to obtain access token for BigQuery API");
  }

  return token.token;
}

async function fetchBigQueryJson<T>(
  token: string,
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`BigQuery request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

async function listDatasets(token: string, projectId: string) {
  const datasets: BigQueryDatasetItem[] = [];
  let pageToken = "";

  do {
    const search = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    const payload = await fetchBigQueryJson<BigQueryDatasetsResponse>(
      token,
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets${search}`
    );
    datasets.push(...(payload.datasets || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return datasets;
}

async function listTables(token: string, projectId: string, datasetId: string) {
  const tables: BigQueryTableItem[] = [];
  let pageToken = "";

  do {
    const search = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    const payload = await fetchBigQueryJson<BigQueryTablesResponse>(
      token,
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables${search}`
    );
    tables.push(...(payload.tables || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return tables;
}

export function pickBillingExportTable(
  tables: Array<{ datasetId: string; tableId: string; location?: string }>,
  billingAccountId?: string
): DiscoveredBillingExportTable | null {
  const normalizedAccountId = normalizeBillingAccountIdForTable(billingAccountId);
  const preferredPrefixes = ["gcp_billing_export_v1_", "gcp_billing_export_resource_v1_"];

  const ranked = tables
    .filter((table) => preferredPrefixes.some((prefix) => table.tableId.startsWith(prefix)))
    .map((table) => {
      let score = 0;
      if (table.tableId.startsWith("gcp_billing_export_v1_")) score += 10;
      if (normalizedAccountId && table.tableId.includes(normalizedAccountId)) score += 5;
      return { table, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.table.tableId.localeCompare(right.table.tableId)
    );

  const winner = ranked[0]?.table;
  return winner ?? null;
}

async function discoverBillingExportTable(
  token: string,
  config: BillingExportConfig
): Promise<BillingExportTableRef | null> {
  if (config.datasetId && config.tableId) {
    return {
      projectId: config.exportProjectId,
      datasetId: config.datasetId,
      tableId: config.tableId,
      location: config.location,
      tablePath: `${config.exportProjectId}.${config.datasetId}.${config.tableId}`,
    };
  }

  const datasets = config.datasetId
    ? [{ datasetReference: { datasetId: config.datasetId }, location: config.location }]
    : await listDatasets(token, config.exportProjectId);

  const discovered: Array<{ datasetId: string; tableId: string; location?: string }> = [];
  for (const dataset of datasets) {
    const datasetId = dataset.datasetReference?.datasetId;
    if (!datasetId) {
      continue;
    }

    const tables = config.tableId
      ? [{ tableReference: { tableId: config.tableId } }]
      : await listTables(token, config.exportProjectId, datasetId);

    for (const table of tables) {
      const tableId = table.tableReference?.tableId;
      if (!tableId) {
        continue;
      }

      discovered.push({
        datasetId,
        tableId,
        location: dataset.location || config.location,
      });
    }
  }

  const winner = pickBillingExportTable(discovered, config.billingAccountId);
  if (!winner) {
    return null;
  }

  return {
    projectId: config.exportProjectId,
    datasetId: winner.datasetId,
    tableId: winner.tableId,
    location: winner.location,
    tablePath: `${config.exportProjectId}.${winner.datasetId}.${winner.tableId}`,
  };
}

function decodeBigQueryRows<T>(
  payload: BigQueryQueryResponse,
  mapper: (record: Record<string, string | null>) => T
) {
  const fields = payload.schema?.fields || [];
  const rows = payload.rows || [];

  return rows.map((row) => {
    const record = fields.reduce<Record<string, string | null>>((acc, field, index) => {
      acc[field.name] = row.f[index]?.v ?? null;
      return acc;
    }, {});
    return mapper(record);
  });
}

async function runBigQueryQuery<T>(
  token: string,
  tableRef: BillingExportTableRef,
  query: string,
  queryParameters: Array<{ name: string; type: string; value: string | number }>
) {
  const payload = await fetchBigQueryJson<BigQueryQueryResponse>(
    token,
    `https://bigquery.googleapis.com/bigquery/v2/projects/${tableRef.projectId}/queries`,
    {
      method: "POST",
      body: JSON.stringify({
        query,
        useLegacySql: false,
        location: tableRef.location,
        parameterMode: "NAMED",
        queryParameters: queryParameters.map((param) => ({
          name: param.name,
          parameterType: { type: param.type },
          parameterValue: { value: String(param.value) },
        })),
      }),
    }
  );

  return payload;
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

function buildBillingServiceSkuQuery(tablePath: string, rowLimit: number) {
  return `
    WITH monthly AS (
      SELECT
        service.description AS service,
        sku.description AS sku,
        SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS costUsd
      FROM \`${tablePath}\`
      WHERE project.id = @projectId
        AND invoice.month = @invoiceMonth
      GROUP BY 1, 2
    )
    SELECT
      service,
      sku,
      ROUND(costUsd, 2) AS costUsd
    FROM monthly
    WHERE costUsd > 0.009
    ORDER BY costUsd DESC
    LIMIT ${Math.max(1, Math.floor(rowLimit))}
  `;
}

function buildBillingDailyTrendQuery(tablePath: string, lookbackDays: number) {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(usage_start_time)) AS usageDate,
      ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS costUsd
    FROM \`${tablePath}\`
    WHERE project.id = @projectId
      AND DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${Math.max(1, Math.floor(lookbackDays))} DAY)
    GROUP BY 1
    ORDER BY usageDate DESC
  `;
}

function buildBillingMetadataQuery(tablePath: string) {
  return `
    SELECT
      ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS totalCostUsd,
      CAST(MAX(usage_end_time) AS STRING) AS lastUsageEnd
    FROM \`${tablePath}\`
    WHERE project.id = @projectId
      AND invoice.month = @invoiceMonth
  `;
}

function buildArchiveServiceSkuQuery(archivePath: string, rowLimit: number) {
  return `
    SELECT
      service AS service,
      sku AS sku,
      ROUND(SUM(cost_usd), 2) AS costUsd
    FROM \`${archivePath}\`
    WHERE project_id = @projectId
      AND invoice_month = @invoiceMonth
      AND cost_type = 'Usage'
      AND service IS NOT NULL
      AND sku IS NOT NULL
    GROUP BY 1, 2
    HAVING costUsd > 0.009
    ORDER BY costUsd DESC
    LIMIT ${Math.max(1, Math.floor(rowLimit))}
  `;
}

function buildArchiveDailyTrendQuery(archivePath: string) {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', usage_start_date) AS usageDate,
      ROUND(SUM(cost_usd), 2) AS costUsd
    FROM \`${archivePath}\`
    WHERE project_id = @projectId
      AND invoice_month = @invoiceMonth
      AND cost_type = 'Usage'
      AND usage_start_date IS NOT NULL
    GROUP BY 1
    ORDER BY usageDate DESC
  `;
}

function buildArchiveMetadataQuery(archivePath: string) {
  return `
    SELECT
      ROUND(SUM(cost_usd), 2) AS totalCostUsd,
      CAST(MAX(usage_end_date) AS STRING) AS lastUsageEnd
    FROM \`${archivePath}\`
    WHERE project_id = @projectId
      AND invoice_month = @invoiceMonth
      AND cost_type = 'Usage'
  `;
}

function buildArchiveAvailableMonthsQuery(archivePath: string) {
  return `
    SELECT DISTINCT invoice_month
    FROM \`${archivePath}\`
    WHERE project_id = @projectId
      AND cost_type = 'Usage'
    ORDER BY invoice_month DESC
  `;
}

function buildLiveAvailableMonthsQuery(tablePath: string) {
  return `
    SELECT DISTINCT invoice.month AS invoice_month
    FROM \`${tablePath}\`
    WHERE project.id = @projectId
    ORDER BY invoice_month DESC
    LIMIT 24
  `;
}

function getArchiveTablePath(
  config: BillingExportConfig,
  liveTableRef: BillingExportTableRef | null
): string {
  const datasetId = liveTableRef?.datasetId || config.datasetId || "billing_export";
  return `${config.exportProjectId}.${datasetId}.billing_archive`;
}

async function safeRunQuery<T>(
  token: string,
  tableRef: { projectId: string; location?: string },
  query: string,
  queryParameters: Array<{ name: string; type: string; value: string | number }>
): Promise<BigQueryQueryResponse | null> {
  try {
    return await runBigQueryQuery<T>(token, tableRef as BillingExportTableRef, query, queryParameters);
  } catch {
    // Таблицы может не быть (404) — возвращаем null, дальше работаем без неё.
    return null;
  }
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

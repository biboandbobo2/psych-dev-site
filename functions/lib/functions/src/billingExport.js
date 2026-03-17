import { GoogleAuth } from "google-auth-library";
import { resolveAdminProjectId } from "./lib/adminApp.js";
const BIGQUERY_SCOPE = "https://www.googleapis.com/auth/bigquery.readonly";
const DEFAULT_LOOKBACK_DAYS = 14;
const DEFAULT_MAX_SERVICES = 8;
const DEFAULT_MAX_SKUS_PER_SERVICE = 6;
function parseNumberEnv(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function getBillingExportConfig() {
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
        lookbackDays: parseNumberEnv(process.env.BILLING_SUMMARY_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS),
        maxServices: parseNumberEnv(process.env.BILLING_SUMMARY_MAX_SERVICES, DEFAULT_MAX_SERVICES),
        maxSkusPerService: parseNumberEnv(process.env.BILLING_SUMMARY_MAX_SKUS_PER_SERVICE, DEFAULT_MAX_SKUS_PER_SERVICE),
    };
}
function normalizeBillingAccountIdForTable(billingAccountId) {
    return (billingAccountId || "").replace(/[^A-Za-z0-9]/g, "_");
}
function getCurrentInvoiceMonth(now = new Date()) {
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
function getMonthLabel(invoiceMonth) {
    if (!/^\d{6}$/.test(invoiceMonth)) {
        return invoiceMonth;
    }
    const year = Number(invoiceMonth.slice(0, 4));
    const monthIndex = Number(invoiceMonth.slice(4, 6)) - 1;
    return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, monthIndex, 1)));
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
async function fetchBigQueryJson(token, url, init = {}) {
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
    return (await response.json());
}
async function listDatasets(token, projectId) {
    const datasets = [];
    let pageToken = "";
    do {
        const search = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
        const payload = await fetchBigQueryJson(token, `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets${search}`);
        datasets.push(...(payload.datasets || []));
        pageToken = payload.nextPageToken || "";
    } while (pageToken);
    return datasets;
}
async function listTables(token, projectId, datasetId) {
    const tables = [];
    let pageToken = "";
    do {
        const search = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
        const payload = await fetchBigQueryJson(token, `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/datasets/${datasetId}/tables${search}`);
        tables.push(...(payload.tables || []));
        pageToken = payload.nextPageToken || "";
    } while (pageToken);
    return tables;
}
export function pickBillingExportTable(tables, billingAccountId) {
    const normalizedAccountId = normalizeBillingAccountIdForTable(billingAccountId);
    const preferredPrefixes = ["gcp_billing_export_v1_", "gcp_billing_export_resource_v1_"];
    const ranked = tables
        .filter((table) => preferredPrefixes.some((prefix) => table.tableId.startsWith(prefix)))
        .map((table) => {
        let score = 0;
        if (table.tableId.startsWith("gcp_billing_export_v1_"))
            score += 10;
        if (normalizedAccountId && table.tableId.includes(normalizedAccountId))
            score += 5;
        return { table, score };
    })
        .sort((left, right) => right.score - left.score || left.table.tableId.localeCompare(right.table.tableId));
    const winner = ranked[0]?.table;
    return winner ?? null;
}
async function discoverBillingExportTable(token, config) {
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
    const discovered = [];
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
function decodeBigQueryRows(payload, mapper) {
    const fields = payload.schema?.fields || [];
    const rows = payload.rows || [];
    return rows.map((row) => {
        const record = fields.reduce((acc, field, index) => {
            acc[field.name] = row.f[index]?.v ?? null;
            return acc;
        }, {});
        return mapper(record);
    });
}
async function runBigQueryQuery(token, tableRef, query, queryParameters) {
    const payload = await fetchBigQueryJson(token, `https://bigquery.googleapis.com/bigquery/v2/projects/${tableRef.projectId}/queries`, {
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
    });
    return payload;
}
export function groupBillingServiceRows(rows, maxServices = DEFAULT_MAX_SERVICES, maxSkusPerService = DEFAULT_MAX_SKUS_PER_SERVICE) {
    const services = new Map();
    for (const row of rows) {
        if (!services.has(row.service)) {
            services.set(row.service, {
                service: row.service,
                costUsd: 0,
                skus: [],
            });
        }
        const service = services.get(row.service);
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
function buildBillingServiceSkuQuery(tablePath, rowLimit) {
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
function buildBillingDailyTrendQuery(tablePath, lookbackDays) {
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
function buildBillingMetadataQuery(tablePath) {
    return `
    SELECT
      ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS totalCostUsd,
      CAST(MAX(usage_end_time) AS STRING) AS lastUsageEnd
    FROM \`${tablePath}\`
    WHERE project.id = @projectId
      AND invoice.month = @invoiceMonth
  `;
}
export async function getBillingSummaryData() {
    const config = getBillingExportConfig();
    const token = await getAccessToken();
    const tableRef = await discoverBillingExportTable(token, config);
    if (!tableRef) {
        return {
            ok: false,
            configured: false,
            error: "Billing export table not found",
            diagnostics: [
                "В проекте не найден BigQuery billing export.",
                "Включи Cloud Billing export в BigQuery или задай BILLING_EXPORT_BQ_DATASET / BILLING_EXPORT_BQ_TABLE.",
            ],
        };
    }
    const invoiceMonth = getCurrentInvoiceMonth();
    const rowLimit = Math.max(50, config.maxServices * config.maxSkusPerService * 3);
    const [serviceSkuPayload, dailyPayload, metadataPayload] = await Promise.all([
        runBigQueryQuery(token, tableRef, buildBillingServiceSkuQuery(tableRef.tablePath, rowLimit), [
            { name: "projectId", type: "STRING", value: config.billingProjectId },
            { name: "invoiceMonth", type: "STRING", value: invoiceMonth },
        ]),
        runBigQueryQuery(token, tableRef, buildBillingDailyTrendQuery(tableRef.tablePath, config.lookbackDays), [{ name: "projectId", type: "STRING", value: config.billingProjectId }]),
        runBigQueryQuery(token, tableRef, buildBillingMetadataQuery(tableRef.tablePath), [
            { name: "projectId", type: "STRING", value: config.billingProjectId },
            { name: "invoiceMonth", type: "STRING", value: invoiceMonth },
        ]),
    ]);
    const serviceRows = decodeBigQueryRows(serviceSkuPayload, (record) => ({
        service: record.service || "Unknown service",
        sku: record.sku || "Unknown SKU",
        costUsd: Number(record.costUsd || 0),
    }));
    const dailyRows = decodeBigQueryRows(dailyPayload, (record) => ({
        usageDate: record.usageDate || "",
        costUsd: Number(record.costUsd || 0),
    }));
    const metadata = decodeBigQueryRows(metadataPayload, (record) => ({
        totalCostUsd: Number(record.totalCostUsd || 0),
        lastUsageEnd: record.lastUsageEnd || null,
    }))[0] || { totalCostUsd: 0, lastUsageEnd: null };
    return {
        ok: true,
        configured: true,
        summary: {
            projectId: config.billingProjectId,
            month: invoiceMonth,
            monthLabel: getMonthLabel(invoiceMonth),
            totalCostUsd: Number(metadata.totalCostUsd.toFixed(2)),
            lastUsageEnd: metadata.lastUsageEnd,
            recentDays: dailyRows.map((row) => ({ date: row.usageDate, costUsd: row.costUsd })),
            services: groupBillingServiceRows(serviceRows, config.maxServices, config.maxSkusPerService),
            tableRef: tableRef.tablePath,
            dataSource: "bigquery",
        },
    };
}

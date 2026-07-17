import { listDatasets, listTables } from "./bigquery.js";
import type { BillingExportConfig, BillingExportTableRef } from "./config.js";

interface DiscoveredBillingExportTable {
  datasetId: string;
  tableId: string;
  location?: string;
}

function normalizeBillingAccountIdForTable(billingAccountId: string | undefined) {
  return (billingAccountId || "").replace(/[^A-Za-z0-9]/g, "_");
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

export async function discoverBillingExportTable(
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

export function getArchiveTablePath(
  config: BillingExportConfig,
  liveTableRef: BillingExportTableRef | null
): string {
  const datasetId = liveTableRef?.datasetId || config.datasetId || "billing_export";
  return `${config.exportProjectId}.${datasetId}.billing_archive`;
}

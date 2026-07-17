export function buildBillingServiceSkuQuery(tablePath: string, rowLimit: number) {
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

export function buildBillingDailyTrendQuery(tablePath: string, lookbackDays: number) {
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

export function buildBillingMetadataQuery(tablePath: string) {
  return `
    SELECT
      ROUND(SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS totalCostUsd,
      CAST(MAX(usage_end_time) AS STRING) AS lastUsageEnd
    FROM \`${tablePath}\`
    WHERE project.id = @projectId
      AND invoice.month = @invoiceMonth
  `;
}

export function buildArchiveServiceSkuQuery(archivePath: string, rowLimit: number) {
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

export function buildArchiveDailyTrendQuery(archivePath: string) {
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

export function buildArchiveMetadataQuery(archivePath: string) {
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

export function buildArchiveAvailableMonthsQuery(archivePath: string) {
  return `
    SELECT DISTINCT invoice_month
    FROM \`${archivePath}\`
    WHERE project_id = @projectId
      AND cost_type = 'Usage'
    ORDER BY invoice_month DESC
  `;
}

export function buildLiveAvailableMonthsQuery(tablePath: string) {
  return `
    SELECT DISTINCT invoice.month AS invoice_month
    FROM \`${tablePath}\`
    WHERE project.id = @projectId
    ORDER BY invoice_month DESC
    LIMIT 24
  `;
}

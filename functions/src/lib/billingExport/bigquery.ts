import { GoogleAuth } from "google-auth-library";

import type { BillingExportTableRef } from "./config.js";

const BIGQUERY_SCOPE = "https://www.googleapis.com/auth/bigquery.readonly";

interface BigQuerySchemaField {
  name: string;
}

interface BigQueryRowCell {
  v: string | null;
}

interface BigQueryRow {
  f: BigQueryRowCell[];
}

export interface BigQueryQueryResponse {
  schema?: { fields?: BigQuerySchemaField[] };
  rows?: BigQueryRow[];
}

export interface BigQueryDatasetItem {
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

export async function getAccessToken() {
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

export async function listDatasets(token: string, projectId: string) {
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

export async function listTables(token: string, projectId: string, datasetId: string) {
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

export function decodeBigQueryRows<T>(
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

export async function runBigQueryQuery<T>(
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

export async function safeRunQuery<T>(
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

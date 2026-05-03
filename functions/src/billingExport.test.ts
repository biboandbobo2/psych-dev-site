import { describe, expect, it } from "vitest";

import { groupBillingServiceRows, pickBillingExportTable } from "./billingExport.js";

describe("billingExport helpers", () => {
  it("prefers standard billing export table matching billing account", () => {
    const table = pickBillingExportTable(
      [
        {
          datasetId: "ops",
          tableId: "gcp_billing_export_resource_v1_010C05_CE6FD2_DF4CA1",
          location: "EU",
        },
        {
          datasetId: "ops",
          tableId: "gcp_billing_export_v1_010C05_CE6FD2_DF4CA1",
          location: "EU",
        },
      ],
      "010C05-CE6FD2-DF4CA1"
    );

    expect(table?.tableId).toBe("gcp_billing_export_v1_010C05_CE6FD2_DF4CA1");
  });

  it("groups rows by service and keeps top skus", () => {
    const grouped = groupBillingServiceRows(
      [
        { service: "Cloud Run", sku: "CPU", costUsd: 2.1 },
        { service: "Cloud Run", sku: "Memory", costUsd: 1.2 },
        { service: "Cloud Run", sku: "Requests", costUsd: 0.3 },
        { service: "Artifact Registry", sku: "Storage", costUsd: 3.5 },
      ],
      5,
      2
    );

    expect(grouped[0]).toMatchObject({
      service: "Cloud Run",
      costUsd: 3.6,
    });
    expect(grouped[1]).toMatchObject({
      service: "Artifact Registry",
      costUsd: 3.5,
    });
    expect(grouped[0].skus).toHaveLength(2);
    expect(grouped[0].skus[0].sku).toBe("CPU");
  });
});

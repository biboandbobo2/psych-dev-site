import { describe, expect, it } from "vitest";

import { getArchiveTablePath } from "./discovery.js";
import type { BillingExportConfig, BillingExportTableRef } from "./config.js";

const baseConfig: BillingExportConfig = {
  billingProjectId: "proj",
  exportProjectId: "export-proj",
  lookbackDays: 14,
  maxServices: 8,
  maxSkusPerService: 6,
};

describe("getArchiveTablePath", () => {
  it("prefers dataset from the live table ref", () => {
    const liveTableRef: BillingExportTableRef = {
      projectId: "export-proj",
      datasetId: "ops",
      tableId: "gcp_billing_export_v1_ABC",
      tablePath: "export-proj.ops.gcp_billing_export_v1_ABC",
    };

    expect(getArchiveTablePath(baseConfig, liveTableRef)).toBe(
      "export-proj.ops.billing_archive"
    );
  });

  it("falls back to configured dataset when live table is missing", () => {
    expect(getArchiveTablePath({ ...baseConfig, datasetId: "custom" }, null)).toBe(
      "export-proj.custom.billing_archive"
    );
  });

  it("defaults to billing_export dataset when nothing is configured", () => {
    expect(getArchiveTablePath(baseConfig, null)).toBe(
      "export-proj.billing_export.billing_archive"
    );
  });
});

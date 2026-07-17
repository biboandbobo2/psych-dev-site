import { describe, expect, it } from "vitest";

import { getCurrentInvoiceMonth, getMonthLabel } from "./config.js";

describe("billingExport config helpers", () => {
  it("formats invoice month as YYYYMM with zero padding", () => {
    expect(getCurrentInvoiceMonth(new Date(Date.UTC(2026, 6, 15)))).toBe("202607");
    expect(getCurrentInvoiceMonth(new Date(Date.UTC(2026, 0, 2)))).toBe("202601");
  });

  it("returns russian month label for valid YYYYMM", () => {
    const label = getMonthLabel("202601");
    expect(label).toContain("2026");
    expect(label.toLowerCase()).toContain("январ");
  });

  it("returns input unchanged when invoice month is malformed", () => {
    expect(getMonthLabel("not-a-month")).toBe("not-a-month");
  });
});

import { describe, expect, it } from "vitest";

import { decodeBigQueryRows } from "./bigquery.js";

describe("decodeBigQueryRows", () => {
  it("maps rows by schema field order and passes records to mapper", () => {
    const decoded = decodeBigQueryRows(
      {
        schema: { fields: [{ name: "service" }, { name: "costUsd" }] },
        rows: [
          { f: [{ v: "Cloud Run" }, { v: "2.5" }] },
          { f: [{ v: null }, { v: "0" }] },
        ],
      },
      (record) => ({
        service: record.service || "Unknown service",
        costUsd: Number(record.costUsd || 0),
      })
    );

    expect(decoded).toEqual([
      { service: "Cloud Run", costUsd: 2.5 },
      { service: "Unknown service", costUsd: 0 },
    ]);
  });

  it("returns empty array when payload has no rows or schema", () => {
    expect(decodeBigQueryRows({}, (record) => record)).toEqual([]);
  });

  it("fills missing cells with null", () => {
    const decoded = decodeBigQueryRows(
      {
        schema: { fields: [{ name: "a" }, { name: "b" }] },
        rows: [{ f: [{ v: "x" }] }],
      },
      (record) => record
    );

    expect(decoded).toEqual([{ a: "x", b: null }]);
  });
});

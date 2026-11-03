import { createHash } from "node:crypto";
import type { AttendanceRow } from "./model.js";

export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeZoomName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
}

const GENERIC_NAME =
  /^(?:iphone|ipad|android|samsung|redmi|huawei|pixel|zoom(?: user)?|user|guest|student|гость|участник(?: без имени)?|пользователь|студент|аноним(?:ный)?)(?:\s*[\d()#._-]+)?$/u;

export function nameAliasKey(accountKey: string, name: string): string | null {
  const normalized = normalizeZoomName(name);
  if (
    !accountKey ||
    (normalized.match(/\p{L}/gu)?.length ?? 0) < 2 ||
    GENERIC_NAME.test(normalized)
  ) return null;
  return hashKey(`${accountKey}:name:${normalized}`);
}

export interface NameAliasOption {
  key: string | null;
  issue: "generic" | "ambiguous" | null;
}

/** Different connection rows with overlapping time cannot be presumed to be one person. */
function hasOverlappingRows(rows: AttendanceRow[]): boolean {
  const intervals = rows
    .flatMap((row) => row.intervals.map((interval) => ({ ...interval, owner: row.key })))
    .sort((a, b) => a.startMs - b.startMs);
  let activeEnd = -Infinity;
  let activeOwner = "";
  for (const interval of intervals) {
    if (interval.startMs < activeEnd && interval.owner !== activeOwner) return true;
    if (interval.endMs > activeEnd) {
      activeEnd = interval.endMs;
      activeOwner = interval.owner;
    }
  }
  return false;
}

/** Computed from existing snapshots: no row-key changes or migration. */
export function nameAliasOptions(
  rows: AttendanceRow[],
  accountKey: string,
): Map<string, NameAliasOption> {
  const groups = new Map<string, AttendanceRow[]>();
  const options = new Map<string, NameAliasOption>();
  for (const row of rows) {
    const key = nameAliasKey(accountKey, row.name);
    if (!key) options.set(row.key, { key: null, issue: "generic" });
    else groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const [key, group] of groups) {
    const identities = new Set(group.map((row) => row.aliasKey).filter(Boolean));
    const ambiguous = identities.size > 1 || hasOverlappingRows(group);
    for (const row of group) {
      options.set(row.key, ambiguous ? { key: null, issue: "ambiguous" } : { key, issue: null });
    }
  }
  return options;
}

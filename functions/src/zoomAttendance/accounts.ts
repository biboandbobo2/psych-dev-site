import { readLatestSecretValue } from "../lib/secrets.js";
import type { ZoomCredentials } from "./client.js";

export interface AttendanceAccount extends ZoomCredentials {
  key: string;
  label: string;
}
let cached: { accounts: AttendanceAccount[]; expires: number } | undefined;

/** One Secret Manager JSON payload; never returned to clients or logged. */
export async function loadAccounts(): Promise<AttendanceAccount[]> {
  // Local role-smoke must never read production credentials or call Zoom.
  if (process.env.FUNCTIONS_EMULATOR === "true") return [];
  if (cached && cached.expires > Date.now()) return cached.accounts;
  try {
    const value: unknown = JSON.parse(
      await readLatestSecretValue("zoom-attendance-accounts"),
    );
    const raw = (value as { accounts?: unknown })?.accounts;
    if (!Array.isArray(raw) || raw.length > 20) throw new Error();
    const keys = new Set<string>();
    const accounts = raw.map((item: unknown): AttendanceAccount => {
      if (!item || typeof item !== "object") throw new Error();
      const a = item as Record<string, unknown>;
      if (
        typeof a.key !== "string" ||
        !/^[a-z0-9-]{1,40}$/.test(a.key) ||
        keys.has(a.key)
      )
        throw new Error();
      keys.add(a.key);
      for (const field of ["accountId", "clientId", "clientSecret", "label"]) {
        if (typeof a[field] !== "string" || !(a[field] as string).trim())
          throw new Error();
      }
      return {
        key: a.key,
        label: (a.label as string).slice(0, 100),
        accountId: a.accountId as string,
        clientId: a.clientId as string,
        clientSecret: a.clientSecret as string,
      };
    });
    cached = { accounts, expires: Date.now() + 5 * 60_000 };
    return accounts;
  } catch {
    // Secret Manager error objects may contain request headers. Do not propagate them.
    throw new Error("Подключение Zoom ещё не настроено на сервере.");
  }
}

type LogEntry = {
  ts: string;
  event: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = 'psd:clientLog';
const MAX_ENTRIES = 60;

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getClientLog(): LogEntry[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.event === 'string');
  } catch {
    return [];
  }
}

export function logClientEvent(event: string, data?: Record<string, unknown>) {
  if (!isBrowser()) return;
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    event,
    data,
  };
  const existing = getClientLog();
  existing.push(entry);
  if (existing.length > MAX_ENTRIES) {
    existing.splice(0, existing.length - MAX_ENTRIES);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function clearClientLog() {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function formatClientLog() {
  const entries = getClientLog();
  return entries
    .map((entry) => {
      const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      return `${entry.ts} ${entry.event}${data}`;
    })
    .join('\n');
}

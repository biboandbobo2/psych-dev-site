const rawDevLog = (import.meta.env.DEVLOG ?? import.meta.env.VITE_DEVLOG ?? '').toString().toLowerCase();
const flagEnabled = rawDevLog === 'true' || rawDevLog === '1';
const enabled = import.meta.env.DEV || flagEnabled;

export function isDebug() {
  return enabled;
}

const safeLogger = (fn: (...args: unknown[]) => void) => (...args: unknown[]) => {
  if (enabled) {
    fn(...args);
  }
};

export const debugLog = safeLogger((...args: unknown[]) => console.debug(...args));
export const debugWarn = safeLogger((...args: unknown[]) => console.warn(...args));
export const debugError = safeLogger((...args: unknown[]) => console.error(...args));

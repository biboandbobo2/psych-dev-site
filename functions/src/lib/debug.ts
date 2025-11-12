const rawDevLog = (process.env.DEVLOG ?? process.env.FUNCTIONS_DEVLOG ?? '').toString().toLowerCase();
const flagEnabled = rawDevLog === 'true' || rawDevLog === '1';
const enabled = flagEnabled || process.env.NODE_ENV !== 'production';

export function isFunctionsDebug() {
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

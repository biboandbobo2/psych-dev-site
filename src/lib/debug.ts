// Lazy initialization to avoid "Cannot access uninitialized variable" in production
let _enabled: boolean | null = null;

function isEnabled(): boolean {
  if (_enabled === null) {
    const rawDevLog = (import.meta.env.DEVLOG ?? import.meta.env.VITE_DEVLOG ?? '').toString().toLowerCase();
    const flagEnabled = rawDevLog === 'true' || rawDevLog === '1';
    _enabled = import.meta.env.DEV || flagEnabled;
  }
  return _enabled;
}

export function isDebug() {
  return isEnabled();
}

const safeLogger = (fn: (...args: unknown[]) => void) => (...args: unknown[]) => {
  if (isEnabled()) {
    fn(...args);
  }
};

// Export as direct functions instead of const to avoid top-level function calls
export function debugLog(...args: unknown[]) {
  if (isEnabled()) {
    console.debug(...args);
  }
}

export function debugWarn(...args: unknown[]) {
  if (isEnabled()) {
    console.warn(...args);
  }
}

export function debugError(...args: unknown[]) {
  if (isEnabled()) {
    console.error(...args);
  }
}

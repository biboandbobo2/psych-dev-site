// Lazy initialization to avoid "Cannot access uninitialized variable" in production
let _enabled: boolean | null = null;

function isEnabled(): boolean {
  if (_enabled === null) {
    // Support both Vite (import.meta.env) and Node.js (process.env) environments
    let env: any = {};
    let isDev = false;

    try {
      // Try Vite environment (browser/dev server)
      if (import.meta && (import.meta as any).env) {
        env = (import.meta as any).env;
        isDev = env.DEV === true;
      }
    } catch (e) {
      // Fallback to Node.js process.env (import.meta not available)
    }

    const rawDevLog = (env.DEVLOG ?? env.VITE_DEVLOG ?? process.env?.DEVLOG ?? process.env?.VITE_DEVLOG ?? '').toString().toLowerCase();
    const flagEnabled = rawDevLog === 'true' || rawDevLog === '1';
    _enabled = isDev || flagEnabled;
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

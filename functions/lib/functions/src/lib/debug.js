const rawDevLog = (process.env.DEVLOG ?? process.env.FUNCTIONS_DEVLOG ?? '').toString().toLowerCase();
const flagEnabled = rawDevLog === 'true' || rawDevLog === '1';
const enabled = flagEnabled || process.env.NODE_ENV !== 'production';
export function isFunctionsDebug() {
    return enabled;
}
const safeLogger = (fn) => (...args) => {
    if (enabled) {
        fn(...args);
    }
};
export const debugLog = safeLogger((...args) => console.debug(...args));
export const debugWarn = safeLogger((...args) => console.warn(...args));
export const debugError = safeLogger((...args) => console.error(...args));

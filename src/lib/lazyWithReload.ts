import { debugWarn } from './debug';

const RETRY_PREFIX = 'lazy-retry:';

function getRetryKey(key: string) {
  return `${RETRY_PREFIX}${key}`;
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function reloadWindow() {
  window.location.reload();
}

let reloadHandler = reloadWindow;

export function setLazyReloadHandler(handler: typeof reloadWindow) {
  reloadHandler = handler;
}

function shouldHandleChunkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('is not a valid javascript mime type') ||
    message.includes('importing a module script failed') ||
    message.includes('unable to preload css') ||
    message.includes('chunkloaderror')
  );
}

export async function lazyWithReload<TModule>(
  importer: () => Promise<TModule>,
  key: string
) {
  try {
    const module = await importer();
    if (isBrowser()) {
      sessionStorage.removeItem(getRetryKey(key));
    }
    return module;
  } catch (error) {
    if (isBrowser() && shouldHandleChunkError(error)) {
      const retryKey = getRetryKey(key);
      const alreadyRetried = sessionStorage.getItem(retryKey) === '1';

      if (!alreadyRetried) {
        sessionStorage.setItem(retryKey, '1');
        debugWarn('[lazyWithReload] Reloading after stale chunk error:', key, error);
        reloadHandler();
      } else {
        sessionStorage.removeItem(retryKey);
      }
    }

    throw error;
  }
}

import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import { setupIntegrationEnv } from '../../tests/integration/helper';

const isIntegrationRun =
  process.env.VITEST_INTEGRATION === '1' ||
  process.argv.some((arg) => arg.includes('tests/integration'));

if (isIntegrationRun) {
  setupIntegrationEnv();
}

// jsdom 27 требует явного пути для встроенного localStorage, поэтому подменяем
// его простым in-memory stub'ом: иначе window.localStorage.getItem/setItem
// падают с SecurityError в любых unit-тестах, использующих localStorage.
function installMemoryStorage(property: 'localStorage' | 'sessionStorage') {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, property, {
    configurable: true,
    value: mock,
  });
  return store;
}

const localStorageStore = installMemoryStorage('localStorage');
const sessionStorageStore = installMemoryStorage('sessionStorage');

beforeEach(() => {
  localStorageStore.clear();
  sessionStorageStore.clear();
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as lazyWithReloadModule from '../lazyWithReload';

describe('lazyWithReload', () => {
  beforeEach(() => {
    sessionStorage.clear();
    lazyWithReloadModule.setLazyReloadHandler(lazyWithReloadModule.reloadWindow);
  });

  afterEach(() => {
    lazyWithReloadModule.setLazyReloadHandler(lazyWithReloadModule.reloadWindow);
    vi.restoreAllMocks();
  });

  it('перезагружает страницу один раз при stale chunk error', async () => {
    const reloadSpy = vi.fn();
    lazyWithReloadModule.setLazyReloadHandler(reloadSpy);

    await expect(
      lazyWithReloadModule.lazyWithReload(
        async () => {
          throw new TypeError("'text/html' is not a valid JavaScript MIME type.");
        },
        'ResearchPage'
      )
    ).rejects.toThrow(TypeError);

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('lazy-retry:ResearchPage')).toBe('1');
  });

  it('не уходит в бесконечный reload loop при повторной ошибке', async () => {
    const reloadSpy = vi.fn();
    lazyWithReloadModule.setLazyReloadHandler(reloadSpy);
    sessionStorage.setItem('lazy-retry:ResearchPage', '1');

    await expect(
      lazyWithReloadModule.lazyWithReload(
        async () => {
          throw new TypeError("'text/html' is not a valid JavaScript MIME type.");
        },
        'ResearchPage'
      )
    ).rejects.toThrow(TypeError);

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('lazy-retry:ResearchPage')).toBeNull();
  });
});

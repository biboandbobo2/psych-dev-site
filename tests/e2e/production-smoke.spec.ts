/**
 * Production Build Smoke Tests
 *
 * These tests run against the production build to catch initialization errors
 * that only appear in minified/bundled code.
 *
 * Run with: npm run test:e2e:prod
 */

import { test, expect } from '@playwright/test';

test.describe('Production Build Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });
  });

  test('main page loads without initialization errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');

    // Wait for hydration
    await page.waitForLoadState('networkidle');

    // Check for initialization errors
    expect(errors).toEqual([]);

    // Verify React rendered
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
  });

  test('notes page loads without ReferenceError', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      if (error.message.includes('ReferenceError') ||
          error.message.includes('Cannot access uninitialized variable')) {
        errors.push(error.message);
      }
    });

    // Navigate to notes page (lazy loaded chunk)
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    // Should not have initialization errors
    expect(errors).toEqual([]);

    // Verify page loaded
    await expect(page.locator('text=Мои заметки')).toBeVisible({ timeout: 10000 });
  });

  test('tests page loads without React.memo errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      if (error.message.includes('u.memo') ||
          error.message.includes('undefined is not an object')) {
        errors.push(error.message);
      }
    });

    await page.goto('/tests');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);

    // Verify tests page loaded
    await expect(page.locator('text=Тесты')).toBeVisible({ timeout: 10000 });
  });

  test('admin page loads for authenticated users', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // TODO: Add authentication setup
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should not have module errors even if redirected to login
    const hasInitErrors = errors.some(e =>
      e.includes('ReferenceError') ||
      e.includes('Cannot access uninitialized variable') ||
      e.includes('undefined is not an object')
    );

    expect(hasInitErrors).toBe(false);
  });

  test('timeline page loads with all lazy chunks', async ({ page }) => {
    const errors: string[] = [];
    const loadedChunks: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('timeline-') && url.endsWith('.js')) {
        loadedChunks.push(url);
      }
    });

    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');

    // No initialization errors
    expect(errors).toEqual([]);

    // Verify timeline sub-chunks loaded
    expect(loadedChunks.length).toBeGreaterThan(0);

    // Verify timeline rendered
    await expect(page.locator('text=Таймлайн')).toBeVisible({ timeout: 10000 });
  });

  test('navigating between lazy routes does not cause errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Navigate through multiple lazy-loaded pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    await page.goto('/tests');
    await page.waitForLoadState('networkidle');

    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');

    // Should not accumulate errors
    expect(errors).toEqual([]);
  });

  test('shared constants are available in all chunks', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // This test specifically checks that AGE_RANGE_LABELS, PERIOD_CONFIG, etc.
    // are accessible from all lazy chunks

    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    // Try to render a note (which uses PERIOD_CONFIG)
    // If constants aren't loaded, this will fail
    const createButton = page.locator('text=Новая заметка');
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(1000);
    }

    expect(errors).toEqual([]);
  });

  test('production build has correct chunk sizes', async ({ page }) => {
    const chunkSizes: Record<string, number> = {};

    page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.js')) {
        const buffer = await response.body();
        const filename = url.split('/').pop() || 'unknown';
        chunkSizes[filename] = buffer.length;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Main chunk should be reasonable size (not > 500KB)
    const indexChunk = Object.keys(chunkSizes).find(k => k.startsWith('index-'));
    if (indexChunk) {
      const sizeKB = chunkSizes[indexChunk] / 1024;
      console.log(`Main chunk size: ${sizeKB.toFixed(2)} KB`);

      // Fail if main chunk is too large (suggests shared constants are in wrong place)
      expect(sizeKB).toBeLessThan(500);
    }
  });
});

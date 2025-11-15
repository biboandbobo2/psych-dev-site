import { test, expect } from '@playwright/test';

test.describe('Text selection', () => {
  test('allows selecting text on content pages', async ({ page }) => {
    await page.goto('/prenatal');

    const heading = page.getByRole('heading', { level: 1 }).first();
    await heading.waitFor();
    const box = await heading.boundingBox();
    if (!box) {
      throw new Error('Heading bounding box not available');
    }

    const startX = box.x + 10;
    const y = box.y + box.height / 2;
    const endX = box.x + Math.max(20, box.width - 10);

    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 10 });
    await page.mouse.up();

    const selectionLength = await page.evaluate(() => {
      return window.getSelection()?.toString().length ?? 0;
    });

    expect(selectionLength).toBeGreaterThan(0);
  });
});

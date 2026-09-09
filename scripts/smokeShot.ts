/**
 * Скриншоты страниц ролевого стенда под нужной ролью (см. .claude/skills/ui-check).
 *
 *   npx tsx scripts/smokeShot.ts --as student-course --path "/notes?course=development" [--path ...]
 *                                [--out tmp/smoke-shots] [--desktop-only | --mobile-only] [--full]
 *
 * Требует поднятый стенд: `npm run smoke:roles -- --keep` (vite 4180 + эмуляторы).
 * Вход — dev-only window.__testAuth, тот же путь, что signInAs в tests/e2e/roles/helpers.ts.
 * `--as guest` — без входа.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import {
  SMOKE_AUTH_PROJECT,
  SMOKE_DEV_PORT,
  SMOKE_PASSWORD,
  SMOKE_ROLE_LIST,
} from '../tests/e2e/fixtures/roles';

interface TestAuthWindow extends Window {
  __testAuth?: {
    signIn: (email: string, password: string) => Promise<string>;
    signOut: () => Promise<void>;
    waitForUser: () => Promise<string>;
  };
}

interface Args {
  role: string;
  paths: string[];
  out: string;
  desktop: boolean;
  mobile: boolean;
  fullPage: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { role: 'guest', paths: [], out: 'tmp/smoke-shots', desktop: true, mobile: true, fullPage: true };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--as') { args.role = value; i++; }
    else if (flag === '--path') { args.paths.push(value); i++; }
    else if (flag === '--out') { args.out = value; i++; }
    else if (flag === '--desktop-only') args.mobile = false;
    else if (flag === '--mobile-only') args.desktop = false;
    else if (flag === '--viewport-only') args.fullPage = false;
    else throw new Error(`Неизвестный флаг: ${flag}`);
  }
  if (!args.paths.length) throw new Error('Нужен хотя бы один --path');
  return args;
}

async function signInAs(page: Page, roleKey: string, base: string): Promise<void> {
  const role = SMOKE_ROLE_LIST.find((r) => r.key === roleKey);
  if (!role) {
    throw new Error(`Роль ${roleKey} не найдена; доступны: guest, ${SMOKE_ROLE_LIST.map((r) => r.key).join(', ')}`);
  }
  await page.goto(`${base}/login`);
  await page.waitForFunction(() => Boolean((window as TestAuthWindow).__testAuth));
  await page.evaluate(() => (window as TestAuthWindow).__testAuth!.signOut());
  await page.evaluate(
    ([email, password]) => (window as TestAuthWindow).__testAuth!.signIn(email, password),
    [role.email, SMOKE_PASSWORD]
  );
  await page.evaluate(() => (window as TestAuthWindow).__testAuth!.waitForUser());
}

function fileSlug(path: string): string {
  return path.replace(/^\//, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'root';
}

async function main(): Promise<void> {
  const args = parseArgs();
  const base = `http://localhost:${SMOKE_DEV_PORT}`;
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });

  const viewports = [
    ...(args.desktop ? [{ name: 'desktop', width: 1280, height: 900, mobile: false }] : []),
    ...(args.mobile ? [{ name: 'mobile', width: 390, height: 844, mobile: true }] : []),
  ];

  const browser = await chromium.launch();
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.mobile ? 2 : 1,
        isMobile: viewport.mobile,
        hasTouch: viewport.mobile,
      });
      // Песочница Firestore-эмулятора (см. tests/e2e/roles/helpers.ts).
      await context.addInitScript((project: string) => {
        window.sessionStorage.setItem('testProject', project);
      }, SMOKE_AUTH_PROJECT);
      const page = await context.newPage();
      if (args.role !== 'guest') await signInAs(page, args.role, base);

      for (const path of args.paths) {
        await page.goto(`${base}${path}`);
        await page.waitForLoadState('load');
        // networkidle недостижим — Firestore держит Listen-каналы; ждём рендер.
        await page.waitForTimeout(1500);
        const file = resolve(outDir, `${args.role}__${fileSlug(path)}__${viewport.name}.png`);
        await page.screenshot({ path: file, fullPage: args.fullPage });
        console.log(`${page.url()} → ${file}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

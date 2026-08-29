import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 *
 * Два режима:
 * - обычный (`npm run test:e2e`) — прод-смоук против preview на 4175,
 *   ролевые спеки скрыты через testIgnore;
 * - ролевой стенд (HP-2) — включается переменной SMOKE_BASE_URL, которую
 *   выставляет `npm run smoke:roles` (scripts/smokeRoles.ts). Свои сервера
 *   стенд поднимает сам, поэтому webServer в этом режиме не объявляется.
 */

/** Роли со сценарными спеками: имя проекта smoke:<key>, файл roles/<key>.spec.ts. */
const SMOKE_SCENARIO_KEYS = ['author', 'admin-empty', 'superadmin', 'student-group'];

const smokeBaseURL = process.env.SMOKE_BASE_URL;
const smokeProject = process.env.SMOKE_PROJECT || 'demo-smoke';

/**
 * storageState роли. Путь относительный — Playwright резолвит его от cwd,
 * а стенд всегда запускается из корня репо (та же формула в roles/auth.setup.ts).
 */
function storageStatePath(key: string): string {
  return `tests/e2e/.auth/${smokeProject}/${key}.json`;
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: smokeBaseURL ? [['list']] : 'html',
  // Отдельная папка артефактов на песочницу — параллельные прогоны не топчутся.
  outputDir: smokeBaseURL ? `test-results/${smokeProject}` : undefined,
  use: {
    baseURL: smokeBaseURL || 'http://localhost:4175',
    trace: 'on-first-retry',
  },

  projects: smokeBaseURL
    ? [
        {
          name: 'smoke:setup',
          testMatch: 'roles/auth.setup.ts',
          use: { ...devices['Desktop Chrome'] },
        },
        ...SMOKE_SCENARIO_KEYS.map((key) => ({
          name: `smoke:${key}`,
          testMatch: `roles/${key}.spec.ts`,
          dependencies: ['smoke:setup'],
          use: { ...devices['Desktop Chrome'], storageState: storageStatePath(key) },
        })),
      ]
    : [
        {
          name: 'chromium',
          // Ролевые спеки стенда запускаются только через smoke:roles.
          testIgnore: '**/roles/**',
          use: { ...devices['Desktop Chrome'] },
        },
      ],

  webServer: smokeBaseURL
    ? undefined
    : {
        command: 'npm run preview -- --port 4175',
        port: 4175,
        reuseExistingServer: !process.env.CI,
      },
});

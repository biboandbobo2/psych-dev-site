/**
 * База ролевых e2e-спеков стенда HP-2.
 * До кода приложения кладёт testProject в sessionStorage на каждой навигации —
 * так один dev-сервер обслуживает параллельные песочницы Firestore-эмулятора
 * (см. dev-only оверрайд в src/lib/firebase.ts).
 */
import { test as base, expect, type Page } from "@playwright/test";
import { SMOKE_AUTH_PROJECT } from "../fixtures/roles";

/** Песочница текущего прогона; оркестратор передаёт через env SMOKE_PROJECT. */
export const smokeProject = process.env.SMOKE_PROJECT || SMOKE_AUTH_PROJECT;

export const test = base.extend({
  // Второй параметр фикстуры назван run, а не use: иначе eslint-плагин
  // react-hooks принимает вызов за React-хук и роняет npm run lint.
  context: async ({ context }, run) => {
    await context.addInitScript((project: string) => {
      window.sessionStorage.setItem("testProject", project);
    }, smokeProject);
    await run(context);
  },
});

export { expect };

/**
 * Навигация + ожидание загрузки. networkidle недостижим — Firestore держит
 * Listen-каналы открытыми (тот же паттерн, что в production-smoke.spec.ts).
 */
export async function gotoAndSettle(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("load");
}

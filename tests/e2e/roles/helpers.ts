/**
 * База ролевых e2e-спеков стенда HP-2.
 * До кода приложения кладёт testProject в sessionStorage на каждой навигации —
 * так один dev-сервер обслуживает параллельные песочницы Firestore-эмулятора
 * (см. dev-only оверрайд в src/lib/firebase.ts).
 */
import { test as base, expect, type Page } from "@playwright/test";
import { SMOKE_AUTH_PROJECT, SMOKE_PASSWORD } from "../fixtures/roles";

/** dev-only вход стенда (src/lib/testAuth.ts). */
export interface TestAuthApi {
  /** Вход по email/паролю из сида. Возвращает uid. */
  signIn: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  /** email текущего пользователя или null (для ожиданий в Playwright). */
  currentUserEmail: () => string | null;
  /** Резолвится, когда onAuthStateChanged отдал пользователя (или сразу, если он есть). */
  waitForUser: () => Promise<string>;
}

export type TestAuthWindow = Window & { __testAuth?: TestAuthApi };

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

/**
 * Полная смена пользователя в текущем контексте: signOut → signIn.
 * Именно перелогин, а не фоновый refresh: свежие custom claims (их ставят
 * Cloud Functions) попадают в токен только при следующем его выпуске.
 */
export async function signInAs(page: Page, email: string): Promise<string> {
  await page.goto("/login");
  await page.waitForFunction(() => Boolean((window as TestAuthWindow).__testAuth));
  await page.evaluate(() => (window as TestAuthWindow).__testAuth.signOut());
  const uid = await page.evaluate(
    ([mail, password]) => (window as TestAuthWindow).__testAuth.signIn(mail, password),
    [email, SMOKE_PASSWORD]
  );
  await page.evaluate(() => (window as TestAuthWindow).__testAuth.waitForUser());
  return uid;
}

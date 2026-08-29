/**
 * HP-2, setup-проект стенда: вход под каждой ролью без Google OAuth.
 *
 * Работает через dev-only `window.__testAuth` (src/lib/testAuth.ts) — он есть
 * только в сборке с VITE_USE_FIREBASE_EMULATORS=true. Пользователей и пароль
 * создаёт scripts/seedEmulatorRoles.ts из тех же фикстур.
 *
 * Все роли проверяются на вход (критерий приёмки «агент входит под каждой
 * ролью»); для сценарных ролей дополнительно сохраняется storageState —
 * с `indexedDB: true`, потому что firebase/auth держит сессию в IndexedDB.
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { test, expect, smokeProject, type TestAuthWindow } from "./helpers";
import { SMOKE_PASSWORD, SMOKE_ROLE_LIST } from "../fixtures/roles";

/** Роли, у которых есть сценарные спеки: должно совпадать с playwright.config.ts. */
const SCENARIO_KEYS = new Set(["author", "admin-empty", "superadmin", "student-group"]);

/** Та же формула, что в playwright.config.ts (путь резолвится от cwd = корень репо). */
function storageStatePath(key: string): string {
  return `tests/e2e/.auth/${smokeProject}/${key}.json`;
}

for (const role of SMOKE_ROLE_LIST) {
  test(`вход: ${role.key}`, async ({ page, context }) => {
    await page.goto("/login");
    await page.waitForFunction(() => Boolean((window as TestAuthWindow).__testAuth));

    const uid = await page.evaluate(
      ([email, password]) => (window as TestAuthWindow).__testAuth.signIn(email, password),
      [role.email, SMOKE_PASSWORD]
    );
    expect(uid, `сид должен создать ${role.email} с uid ${role.uid}`).toBe(role.uid);

    // onAuthStateChanged срабатывает после записи сессии в IndexedDB —
    // это и есть сигнал, что storageState будет непустым.
    const persistedUid = await page.evaluate(() =>
      (window as TestAuthWindow).__testAuth.waitForUser()
    );
    expect(persistedUid).toBe(role.uid);

    const email = await page.evaluate(() =>
      (window as TestAuthWindow).__testAuth.currentUserEmail()
    );
    expect(email).toBe(role.email);

    if (!SCENARIO_KEYS.has(role.key)) return;

    const path = storageStatePath(role.key);
    mkdirSync(dirname(path), { recursive: true });
    await context.storageState({ path, indexedDB: true });
  });
}

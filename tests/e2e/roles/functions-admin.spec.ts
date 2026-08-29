/**
 * Сквозной контур выдачи админских прав — самое опасное место платформы.
 * Проверяются РЕАЛЬНЫЕ Cloud Functions в эмуляторе (makeUserAdmin →
 * setAdminEditableCourses → removeAdmin), вызванные из настоящего UI
 * /admin/users, а результат — входом под повышаемым пользователем.
 *
 * Запускается только стендом `npm run smoke:roles -- --with-functions`
 * (проект smoke:functions в playwright.config.ts) и только в default-песочнице:
 * Admin SDK внутри functions-эмулятора пишет в проект GCLOUD_PROJECT.
 *
 * Стартовая сессия проекта — super-admin (storageState); на promotee спек
 * переключается сам через полный перелогин: свежие claims попадают в токен
 * только при следующем его выпуске.
 *
 * Тесты идут строго по порядку (serial): каждый опирается на состояние прав,
 * оставленное предыдущим. Исходное состояние promotee («без ролей») на каждом
 * прогоне возвращает scripts/seedEmulatorRoles.ts.
 */
import type { Page } from '@playwright/test';
import { test, expect, gotoAndSettle, signInAs } from './helpers';
import { SMOKE_COURSES, SMOKE_ROLES } from '../fixtures/roles';

// retries: 0 — serial-группа мутирует состояние (промоушен, занятие), ретрай
// стартовал бы с грязного и падал по нечитаемой причине; сид чинит только
// следующий полный прогон стенда.
test.describe.configure({ mode: 'serial', retries: 0 });

const PROMOTEE = SMOKE_ROLES.promotee;
const KEPT_COURSE = SMOKE_COURSES.externalX;
const REVOKED_COURSE = SMOKE_COURSES.externalHidden;

/**
 * Занятие, которое повышенный автор создаёт через UI. Это единственная
 * claim-чувствительная проверка спека: firestore.rules читают ТОЛЬКО claim
 * `editableCourses`, тогда как кабинет автора при отсутствующем claim
 * откатывается на Firestore-зеркало (resolveEditableCourses в useAuthStore) и
 * выглядел бы правильно даже со сломанной функцией.
 *
 * Курс — external-hidden: его занятия не считает ни один соседний ролевой спек,
 * идущий параллельно в той же песочнице. Id фиксированный — лишние занятия
 * удаляет сид, иначе следующий прогон упёрся бы в «ID уже существует».
 */
const NEW_LESSON = { id: 'smoke-fn-lesson', title: 'Занятие повышенного автора' };

/** Строка пользователя в таблице /admin/users. */
function promoteeRow(page: Page) {
  return page.getByRole('row').filter({ hasText: PROMOTEE.email });
}

/**
 * Админка подтверждает каждое действие через window.alert — это единственный
 * сигнал, что callable дошёл до конца. Ждать его обязательно: Firestore-запись
 * функция делает ДО setCustomUserClaims, поэтому строка таблицы успевает
 * обновиться, когда claims ещё старые, и перелогин выпустил бы токен с ними.
 * Обработчик заодно подтверждает window.confirm (иначе Playwright его отклонит).
 */
function watchDialogs(page: Page) {
  const seen: string[] = [];
  page.on('dialog', (dialog) => {
    seen.push(dialog.message());
    void dialog.accept();
  });
  return async (message: string) => {
    await expect
      .poll(() => seen.some((text) => text.includes(message)), {
        // Холодный старт воркера functions + импорт всего index.js — первый
        // callable легко переживает дефолтные 5 с expect.poll.
        timeout: 20_000,
        message: `не дождались подтверждения «${message}»`,
      })
      .toBe(true);
  };
}

test.describe('Выдача прав автору через Cloud Functions', () => {
  test('makeUserAdmin: права на курсы выданы, автор видит кабинет и пишет в свой курс', async ({
    page,
  }) => {
    const awaitAlert = watchDialogs(page);
    await gotoAndSettle(page, '/admin/users');
    await expect(page.getByRole('heading', { name: 'Управление пользователями' })).toBeVisible();

    // Исходное состояние — обычный пользователь без админ-действий.
    const row = promoteeRow(page);
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('button', { name: 'Снять права' })).toHaveCount(0);

    await page.getByRole('button', { name: '+ Добавить админа' }).click();
    await expect(page.getByRole('heading', { name: 'Добавить администратора' })).toBeVisible();
    await page.getByPlaceholder('user@example.com').fill(PROMOTEE.email);
    await page.getByRole('checkbox', { name: KEPT_COURSE.doc.name }).check();
    await page.getByRole('checkbox', { name: REVOKED_COURSE.doc.name }).check();
    await page.getByRole('button', { name: 'Назначить' }).click();
    await awaitAlert('Администратор добавлен');

    // Модалка закрывается только после успешного ответа функции, а строка
    // таблицы обновляется живым onSnapshot — это и есть запись, сделанная
    // функцией в users/{uid}.
    await expect(page.getByRole('heading', { name: 'Добавить администратора' })).toHaveCount(0);
    await expect(row.getByText('Админ', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Снять права' })).toBeVisible();

    // Claims применяются при следующем выпуске токена → полный перелогин.
    await signInAs(page, PROMOTEE.email);
    await gotoAndSettle(page, '/admin');

    await expect(page.getByRole('heading', { name: 'Кабинет автора' })).toBeVisible();
    for (const course of [KEPT_COURSE, REVOKED_COURSE]) {
      const card = page.locator('section').filter({
        has: page.getByRole('heading', { name: course.doc.name }),
      });
      await expect(card).toHaveCount(1);
    }

    // Запись: создаём занятие. Успех = редирект в редактор; отказ rules
    // остался бы ошибкой внутри модалки.
    await gotoAndSettle(page, `/admin/content?course=${REVOKED_COURSE.id}`);
    await page.getByRole('button', { name: 'Добавить занятие' }).click();

    const dialog = page.locator('div.fixed.inset-0').filter({
      has: page.getByRole('heading', { name: 'Создать занятие' }),
    });
    await dialog.locator('#lesson-title').fill(NEW_LESSON.title);
    await dialog.locator('#lesson-id').fill(NEW_LESSON.id);
    const submit = dialog.getByRole('button', { name: 'Создать занятие' });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page).toHaveURL(
      new RegExp(`/admin/content/edit/${NEW_LESSON.id}\\?course=${REVOKED_COURSE.id}$`)
    );
    await expect(
      page.getByRole('heading', { name: `Редактирование: ${NEW_LESSON.title}` })
    ).toBeVisible();
  });

  test('setAdminEditableCourses: суженный список курсов доезжает до автора', async ({ page }) => {
    const awaitAlert = watchDialogs(page);
    await gotoAndSettle(page, '/admin/users');
    await promoteeRow(page).getByRole('button', { name: 'Курсы' }).click();

    await expect(page.getByRole('heading', { name: 'Редактируемые курсы' })).toBeVisible();
    await page.getByRole('checkbox', { name: REVOKED_COURSE.doc.name }).uncheck();
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await awaitAlert('Список редактируемых курсов обновлён');
    await expect(page.getByRole('heading', { name: 'Редактируемые курсы' })).toHaveCount(0);

    await signInAs(page, PROMOTEE.email);
    await gotoAndSettle(page, '/admin');
    await expect(page.getByRole('heading', { name: KEPT_COURSE.doc.name })).toBeVisible();
    await expect(page.getByRole('heading', { name: REVOKED_COURSE.doc.name })).toHaveCount(0);

    // Отозванный курс закрыт и на запись: сайдбар его не показывает.
    await gotoAndSettle(page, `/admin/content?course=${REVOKED_COURSE.id}`);
    await expect(
      page.getByRole('button', { name: `Переименовать курс ${KEPT_COURSE.doc.name}` })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: NEW_LESSON.title })).toHaveCount(0);
  });

  test('removeAdmin: после снятия прав /admin для promotee закрыт', async ({ page }) => {
    const awaitAlert = watchDialogs(page);
    await gotoAndSettle(page, '/admin/users');
    const row = promoteeRow(page);
    await row.getByRole('button', { name: 'Снять права' }).click();
    await awaitAlert('Права администратора сняты');
    await expect(row.getByRole('button', { name: 'Снять права' })).toHaveCount(0);

    await signInAs(page, PROMOTEE.email);
    await gotoAndSettle(page, '/admin');

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Кабинет автора' })).toHaveCount(0);
  });
});

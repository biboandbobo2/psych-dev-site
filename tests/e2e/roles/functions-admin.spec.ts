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
import type { Locator, Page } from '@playwright/test';
import { test, expect, gotoAndSettle, signInAs } from './helpers';
import { SMOKE_ACCESS_REQUESTS, SMOKE_COURSES, SMOKE_ROLES } from '../fixtures/roles';

// retries: 0 — serial-группа мутирует состояние (промоушен, занятие), ретрай
// стартовал бы с грязного и падал по нечитаемой причине; сид чинит только
// следующий полный прогон стенда.
test.describe.configure({ mode: 'serial', retries: 0 });

const PROMOTEE = SMOKE_ROLES.promotee;
const KEPT_COURSE = SMOKE_COURSES.externalX;
const REVOKED_COURSE = SMOKE_COURSES.externalHidden;
/** Заявка promotee на скрытый курс — её закрывает сценарий в конце файла. */
const ACCESS_REQUEST = SMOKE_ACCESS_REQUESTS[2];

/**
 * Холодный старт воркера функций + импорт всего index.js: первый callable
 * легко переживает дефолтные 5 с ожидания.
 */
const COLD_START = 30_000;

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

/** Строка пользователя в списке /admin/users — кнопка с его email. */
function promoteeRow(page: Page): Locator {
  return page.locator('button').filter({ hasText: PROMOTEE.email });
}

/** Карточка пользователя (drawer справа). */
function drawer(page: Page): Locator {
  return page.getByRole('complementary');
}

/** Открыть карточку promotee по прямой ссылке. */
async function openPromoteeCard(page: Page): Promise<Locator> {
  await gotoAndSettle(page, `/admin/users?user=${PROMOTEE.uid}`);
  const card = drawer(page);
  await expect(card.getByRole('heading', { name: PROMOTEE.displayName })).toBeVisible();
  return card;
}

test.describe('Выдача прав автору через Cloud Functions', () => {
  test('makeUserAdmin: права на курсы выданы, автор видит кабинет и пишет в свой курс', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/admin/users');
    await expect(page.getByRole('heading', { name: 'Пользователи', level: 1 })).toBeVisible();

    // Исходное состояние — обычный пользователь без админских бейджей.
    const row = promoteeRow(page);
    await expect(row).toHaveCount(1);
    await expect(row.getByText('Администратор курса')).toHaveCount(0);

    await page.getByRole('button', { name: 'Добавить', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Добавить пользователей' })).toBeVisible();
    await page.getByLabel('Email пользователей').fill(PROMOTEE.email);
    await page.getByRole('radio', { name: /Права администратора курса/ }).check();
    await page.getByRole('checkbox', { name: KEPT_COURSE.doc.name }).check();
    await page.getByRole('checkbox', { name: REVOKED_COURSE.doc.name }).check();
    await page.getByRole('button', { name: /^Выдать права · 1$/ }).click();

    // Инлайн-сводка вместо window.alert: это единственный сигнал, что callable
    // дошёл до конца. Ждать его обязательно — Firestore-запись функция делает
    // ДО setCustomUserClaims, и перелогин выпустил бы токен со старыми claims.
    await expect(page.getByText('Права выданы: 1 из 1.')).toBeVisible({ timeout: COLD_START });
    await page.getByRole('button', { name: 'Отмена' }).click();

    // Строка таблицы обновляется живым onSnapshot — это и есть запись функции.
    await expect(row.getByText('Администратор курса')).toBeVisible();
    await expect(row.getByText('Редактирует 2 курса')).toBeVisible();

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
    const card = await openPromoteeCard(page);
    await card.getByRole('button', { name: 'Изменить' }).click();

    await expect(page.getByRole('heading', { name: 'Редактируемые курсы' })).toBeVisible();
    await page.getByRole('checkbox', { name: REVOKED_COURSE.doc.name }).uncheck();
    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page.getByRole('heading', { name: 'Редактируемые курсы' })).toHaveCount(0);
    await expect(card.getByText('Список редактируемых курсов обновлён')).toBeVisible({
      timeout: COLD_START,
    });

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
    const card = await openPromoteeCard(page);

    // Двухшаговое подтверждение вместо window.confirm.
    await card.getByRole('button', { name: 'Снять права' }).click();
    await expect(card.getByText('Снять права администратора курса?')).toBeVisible();
    await card.getByRole('button', { name: 'Да, снять' }).click();

    await expect(card.getByText('Права администратора курса сняты')).toBeVisible({
      timeout: COLD_START,
    });
    await expect(card.getByRole('button', { name: 'Назначить курсы' })).toBeVisible();

    await signInAs(page, PROMOTEE.email);
    await gotoAndSettle(page, '/admin');

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Кабинет автора' })).toHaveCount(0);
  });
});

/**
 * «Открыть курс» в панели заявок (AC-2) — второй реальный callable этого
 * спека: bulkEnrollStudents выдаёт доступ, и только после него заявка
 * помечается закрытой. Заявку и исходное состояние promotee возвращает сид.
 */
test.describe('Заявка на доступ: «Открыть курс» супер-админом', () => {
  test('заявка уходит из панели, а курс у студента открыт', async ({ page }) => {
    // Предыдущая группа оставила сессию promotee — возвращаемся к владельцу.
    await signInAs(page, SMOKE_ROLES.superAdmin.email);
    await gotoAndSettle(page, '/admin/users');

    const panel = page.locator('section').filter({
      has: page.getByRole('heading', { name: /^Заявки на доступ · \d+$/ }),
    });
    const row = panel.getByRole('listitem').filter({ hasText: ACCESS_REQUEST.message });
    await expect(row).toHaveCount(1);

    await row.getByRole('button', { name: 'Открыть курс' }).click();

    // Закрытая заявка уходит из выдачи (панель слушает status == 'new').
    await expect(row).toHaveCount(0, { timeout: COLD_START });

    const card = await openPromoteeCard(page);
    await expect(
      card.getByRole('switch', { name: `Открыть лично: ${REVOKED_COURSE.doc.name}` })
    ).toBeChecked();
  });
});

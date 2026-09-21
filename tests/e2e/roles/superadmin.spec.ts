/**
 * Роль `superadmin` — распознаётся по email (src/constants/superAdmin.ts).
 * Закрывает критерий приёмки 5 docs/plans/author-cabinet.md: поведение
 * супер-админа не изменилось — все курсы, все кнопки, телеметрия целиком.
 */
import type { Page } from '@playwright/test';
import { test, expect, gotoAndSettle } from './helpers';
import { SMOKE_COURSES, SMOKE_GROUP, SMOKE_ROLES, SMOKE_ROLE_LIST } from '../fixtures/roles';

/** Все роли стенда, кроме супер-админа, сидятся с почтой @smoke.test. */
const SMOKE_EMAIL_ROWS = SMOKE_ROLE_LIST.filter((role) => role.email.endsWith('@smoke.test')).length;
const SMOKE_USERS_TOTAL = SMOKE_ROLE_LIST.length;

const HIDDEN_COURSE_NAME = SMOKE_COURSES.externalHidden.doc.name;

/** Все курсы стенда: 3 core (закреплены фикстурами) + 2 динамических. */
const ALL_COURSE_NAMES = [
  SMOKE_COURSES.development.doc.name,
  SMOKE_COURSES.clinical.doc.name,
  SMOKE_COURSES.general.doc.name,
  SMOKE_COURSES.externalX.doc.name,
  HIDDEN_COURSE_NAME,
];

test.describe('Супер-админ: полный доступ сохранился', () => {
  test('/admin по-прежнему редиректит супер-админа на /superadmin', async ({ page }) => {
    await gotoAndSettle(page, '/admin');

    await expect(page).toHaveURL(/\/superadmin$/);
  });

  test('/superadmin/telemetry показывает и посещения страниц, и использование фич по всем курсам', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/superadmin/telemetry');

    await expect(page.getByRole('heading', { name: '👣 Посещения страниц' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '🧪 Использование фич' })).toBeVisible();

    // Селектор курса доступен супер-админу всегда, дефолт — «Все курсы» ('').
    await expect(page.locator('#telemetry-course')).toHaveValue('');
    await expect(page.locator('#telemetry-range')).toHaveValue('12');

    // StatCard: подпись и цифра — соседние <div> (AdminTelemetry.tsx, StatCard).
    // Все 6 событий стенда попадают в окно 12 недель, включая событие без
    // courseId и события чужих курсов.
    const stat = (label: string) =>
      page
        .locator('div')
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator('xpath=following-sibling::div[1]');

    await expect(stat('Событий за период')).toHaveText('6');
  });

  test('в /admin/content видны все курсы, скрытый — с бейджем, и доступно «Добавить курс»', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/admin/content');

    for (const name of ALL_COURSE_NAMES) {
      await expect(page.getByRole('button', { name: `Переименовать курс ${name}` })).toBeVisible();
    }

    // Кнопка выбора курса содержит имя и бейдж; ищем бейдж точным текстом,
    // иначе «Скрыт» совпало бы с подстрокой «Скрытый курс».
    const hiddenCourse = page.getByRole('button', { name: new RegExp(`^${HIDDEN_COURSE_NAME}`) });
    await expect(hiddenCourse.getByText('Скрыт', { exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Добавить курс' })).toBeVisible();
  });
});

/** Строка списка /admin/users — кнопка с email пользователя. */
function userRow(page: Page, email: string) {
  return page.locator('button').filter({ hasText: email });
}

test.describe('Супер-админ: /admin/users', () => {
  // Последний тест группы меняет доступ студента и возвращает его обратно —
  // параллельный запуск сломал бы счётчики соседних проверок.
  test.describe.configure({ mode: 'serial' });

  test('список, поиск и фильтр по роли', async ({ page }) => {
    await gotoAndSettle(page, '/admin/users');

    await expect(page.getByRole('heading', { name: 'Пользователи', level: 1 })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '@smoke.test' })).toHaveCount(SMOKE_EMAIL_ROWS);

    await page.getByLabel('Поиск по имени или email').fill('Студент Курса');
    await expect(page.locator('button').filter({ hasText: '@smoke.test' })).toHaveCount(1);
    await expect(userRow(page, SMOKE_ROLES.studentCourse.email)).toBeVisible();
    await expect(page.getByText(`Показано 1 из ${SMOKE_USERS_TOTAL}`)).toBeVisible();

    await page.getByLabel('Поиск по имени или email').fill('');
    await page.getByLabel('Фильтр по роли').selectOption('guest');
    // Гость = ни одного платного курса: без доступа, со-админ и кандидат.
    await expect(userRow(page, SMOKE_ROLES.studentNoAccess.email)).toBeVisible();
    await expect(userRow(page, SMOKE_ROLES.studentCourse.email)).toHaveCount(0);
  });

  test('карточка открывается кликом и прямой ссылкой ?user=', async ({ page }) => {
    await gotoAndSettle(page, '/admin/users');
    await userRow(page, SMOKE_ROLES.studentCourse.email).click();

    const drawer = page.getByRole('complementary');
    await expect(drawer.getByRole('heading', { name: SMOKE_ROLES.studentCourse.displayName })).toBeVisible();
    await expect(page).toHaveURL(/user=smoke-student-course/);

    await drawer.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(page.getByRole('complementary')).toHaveCount(0);

    await gotoAndSettle(page, `/admin/users?user=${SMOKE_ROLES.studentGroup.uid}`);
    await expect(
      page.getByRole('complementary').getByRole('heading', { name: SMOKE_ROLES.studentGroup.displayName })
    ).toBeVisible();
  });

  test('вкладка «Потоки» показывает группу стенда', async ({ page }) => {
    await gotoAndSettle(page, '/admin/users?tab=streams');

    const card = page.getByRole('heading', { name: SMOKE_GROUP.name });
    await expect(card).toBeVisible();
    // Потоков на стенде несколько — ищем ссылку «Участники» именно этой карточки.
    await expect(
      page.locator(`a[href="/admin/users?tab=users&stream=${SMOKE_GROUP.id}"]`, { hasText: 'Участники' })
    ).toBeVisible();

    // Фильтр по потоку из карточки: в смоук-группе один студент.
    await gotoAndSettle(page, `/admin/users?tab=users&stream=${SMOKE_GROUP.id}`);
    await expect(page.getByText(`Показано 1 из ${SMOKE_USERS_TOTAL}`)).toBeVisible();
    await expect(userRow(page, SMOKE_ROLES.studentGroup.email)).toBeVisible();
  });

  test('тумблер «лично» открывает курс студенту без доступа', async ({ page }) => {
    test.skip(
      process.env.SMOKE_WITH_FUNCTIONS !== '1',
      'updateCourseAccess — реальный callable, нужен стенд с --with-functions'
    );
    const target = SMOKE_ROLES.studentNoAccess;
    const courseName = SMOKE_COURSES.general.doc.name;

    await gotoAndSettle(page, `/admin/users?user=${target.uid}`);
    const drawer = page.getByRole('complementary');
    await expect(drawer.getByText('Доступ к курсам · 0 из 5')).toBeVisible();

    // Именно click, а не check(): тумблер управляемый, он переключится только
    // после ответа callable и свежего onSnapshot.
    await drawer.getByRole('switch', { name: `Открыть лично: ${courseName}` }).click();
    // Первый callable поднимает воркер функций — ждём дольше дефолта.
    await expect(drawer.getByText('Курс открыт лично')).toBeVisible({ timeout: 30_000 });
    await expect(drawer.getByText('Доступ к курсам · 1 из 5')).toBeVisible();

    await drawer.getByRole('button', { name: 'Закрыть', exact: true }).click();
    const row = userRow(page, target.email);
    await expect(row.getByText('1 курс', { exact: true })).toBeVisible();
    await expect(row.getByText('Студент', { exact: true })).toBeVisible();

    // Возвращаем стенд в исходное состояние.
    await row.click();
    await drawer.getByRole('switch', { name: `Открыть лично: ${courseName}` }).click();
    await expect(drawer.getByText('Личный доступ снят')).toBeVisible({ timeout: 30_000 });
  });
});

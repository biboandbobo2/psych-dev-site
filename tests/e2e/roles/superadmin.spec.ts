/**
 * Роль `superadmin` — распознаётся по email (src/constants/superAdmin.ts).
 * Закрывает критерий приёмки 5 docs/plans/author-cabinet.md: поведение
 * супер-админа не изменилось — все курсы, все кнопки, телеметрия целиком.
 */
import { test, expect, gotoAndSettle } from './helpers';
import { SMOKE_COURSES } from '../fixtures/roles';

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

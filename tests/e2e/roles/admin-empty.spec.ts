/**
 * Роль `admin-empty` — админ с пустым editableCourses.
 * Закрывает критерий приёмки 3 docs/plans/author-cabinet.md: заглушки вместо
 * пустых экранов и чужого контента, запрос телеметрии без фильтра по курсу
 * не уходит.
 *
 * Текст заглушки «У вас пока нет курсов в управлении…» живёт в трёх местах
 * (AuthorCabinet, AdminCourseSidebar, AdminContent), поэтому локаторы
 * скоупятся ближайшим заголовком.
 */
import { test, expect, gotoAndSettle } from './helpers';
import { SMOKE_COURSES } from '../fixtures/roles';

const STUB_TEXT = 'У вас пока нет курсов в управлении';

/** Все курсы стенда: ни один не должен попасть админу без прав. */
const ALL_COURSE_NAMES = [
  'Психология развития',
  'Клиническая психология',
  'Общая психология',
  SMOKE_COURSES.externalX.doc.name,
  SMOKE_COURSES.externalHidden.doc.name,
];

test.describe('Админ без курсов: заглушки вместо чужого контента', () => {
  test('на /admin вместо карточек курсов показана заглушка кабинета', async ({ page }) => {
    await gotoAndSettle(page, '/admin');

    await expect(page.getByRole('heading', { name: 'Кабинет автора' })).toBeVisible();
    // На /admin сайдбара нет, поэтому заглушка ровно одна — кабинета.
    await expect(page.getByText(STUB_TEXT)).toHaveCount(1);

    for (const name of ALL_COURSE_NAMES) {
      await expect(page.getByRole('heading', { name })).toHaveCount(0);
    }
  });

  test('/admin/content показывает «Курсы не назначены» и заглушку в сайдбаре', async ({ page }) => {
    await gotoAndSettle(page, '/admin/content');

    // Основная область: h1 + пояснение под ним (AdminContent.tsx, ранний выход).
    await expect(
      page
        .getByRole('heading', { name: 'Курсы не назначены' })
        .locator('xpath=following-sibling::p[1]')
    ).toContainText(STUB_TEXT);

    // Сайдбар: «Редактор / Курсы» + та же заглушка вместо списка курсов.
    // exact — иначе подстрока совпала бы и с «Курсы не назначены».
    await expect(
      page
        .getByRole('heading', { name: 'Курсы', exact: true })
        .locator('xpath=following-sibling::p[1]')
    ).toContainText(STUB_TEXT);

    await expect(page.getByRole('button', { name: 'Добавить курс' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Переименовать курс / })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Создать тест' })).toHaveCount(0);
  });

  test('/admin/telemetry показывает заглушку и не шлёт запрос без фильтра по курсу', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/admin/telemetry');

    await expect(page.getByRole('heading', { name: '🧪 Использование фич' })).toBeVisible();
    await expect(page.getByText('телеметрию показывать не по чему')).toBeVisible();

    await expect(page.locator('#telemetry-course')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '👣 Посещения страниц' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Добавить курс' })).toHaveCount(0);

    // Запрос без where('courseId') rules отклонили бы, и ошибка попала бы в
    // блок error страницы — проверяем, что его нет.
    await expect(page.getByText('Missing or insufficient permissions')).toHaveCount(0);

    // StatCard'ы при пустых правах всё же рендерятся (AdminTelemetry.tsx:
    // courseFilter === null → loading=false → блок сводки виден). Проверяем,
    // что цифры нулевые: чужих событий не подтянуто.
    const stat = (label: string) =>
      page
        .locator('div')
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator('xpath=following-sibling::div[1]');

    await expect(stat('Событий за период')).toHaveText('0');
    await expect(stat('Уникальных пользователей')).toHaveText('0');
  });
});

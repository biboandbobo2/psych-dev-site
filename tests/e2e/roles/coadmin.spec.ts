/**
 * Роль `coadmin` — параллельный флаг `coAdmin: true` без admin-роли.
 * Проверяет границу «ведёт людей и потоки, но права раздаёт только владелец»:
 * страница /admin/users и её вкладка «Потоки» открыты, контролы секции
 * «Права» в карточке заблокированы.
 */
import { test, expect, gotoAndSettle } from './helpers';
import { SMOKE_GROUP, SMOKE_ROLES } from '../fixtures/roles';

test.describe('Со-админ: пользователи и потоки', () => {
  test('/coadmin ведёт на страницу пользователей', async ({ page }) => {
    await gotoAndSettle(page, '/coadmin');

    await expect(page.getByRole('heading', { name: 'Панель со-админа' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Пользователи и потоки/ })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });

  test('/admin/users открыт и показывает людей', async ({ page }) => {
    await gotoAndSettle(page, '/admin/users');

    await expect(page.getByRole('heading', { name: 'Пользователи', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Access denied' })).toHaveCount(0);
    await expect(
      page.locator('button').filter({ hasText: SMOKE_ROLES.studentCourse.email })
    ).toBeVisible();
  });

  test('вкладка «Потоки» доступна со-админу', async ({ page }) => {
    await gotoAndSettle(page, '/admin/users?tab=streams');

    // Чтение /groups со-админу открыто firestore.rules (canReadGroup).
    await expect(page.getByRole('heading', { name: SMOKE_GROUP.name })).toBeVisible();
    await expect(page.getByText('Missing or insufficient permissions')).toHaveCount(0);
  });

  test('в карточке секция «Права» только для чтения', async ({ page }) => {
    // Цель — студент курса: его роль не меняет ни один соседний спек.
    await gotoAndSettle(page, `/admin/users?user=${SMOKE_ROLES.studentCourse.uid}`);

    const drawer = page.getByRole('complementary');
    await expect(drawer.getByText('меняет только супер-админ')).toBeVisible();
    await expect(drawer.getByRole('switch', { name: 'Со-админ' })).toBeDisabled();
    await expect(drawer.getByRole('button', { name: 'Назначить курсы' })).toBeDisabled();

    // Доступ к курсам со-админ менять может — это его работа.
    await expect(drawer.getByRole('switch', { name: /^Открыть лично: / }).first()).toBeEnabled();
  });
});

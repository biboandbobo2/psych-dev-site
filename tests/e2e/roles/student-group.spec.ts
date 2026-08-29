/**
 * Роль `student-group` — доступ к курсу clinical только через группу
 * (groups/{id}.grantedCourses, union считается в useAuthStore).
 * Закрывает «студент группы видит только открытые ему курсы и не попадает
 * в админку» из docs/plans/role-smoke-harness.md (этап 4).
 */
import { test, expect, gotoAndSettle } from './helpers';

const GRANTED_COURSE_NAME = 'Клиническая психология';
const DENIED_COURSE_NAME = 'Психология развития';

test.describe('Студент группы: доступ только к курсу группы, админка закрыта', () => {
  test('на /home открывается дашборд студента, а не экран гостя без доступов', async ({ page }) => {
    await gotoAndSettle(page, '/home');

    // useGuestStatus: accessibleCount > 0 только за счёт grantedCourses группы.
    // Если групповой доступ отвалится, HomeDashboard отдаст RegisteredGuestHome.
    await expect(page.getByRole('heading', { name: 'Мои курсы' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Закрытые курсы' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Как получить доступ' })).toHaveCount(0);
  });

  test('в профиле доступным числится только курс группы', async ({ page }) => {
    // Каталог на /home перечисляет все курсы платформы независимо от доступа
    // (HomeDashboard.catalogCourses), поэтому «что реально открыто» проверяем
    // там, где UI строит список по hasCourseAccess, — в «Моих актуальных
    // курсах» профиля (FeaturedCoursesSection).
    await gotoAndSettle(page, '/profile');

    const section = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Мои актуальные курсы' }),
    });
    await section
      .getByRole('button', { name: 'Не выбрано. Нажмите, чтобы выбрать актуальные курсы.' })
      .click();

    // Под --with-functions машина нагружена сильнее и «Загрузка курсов…»
    // может жить дольше дефолтного таймаута ассерта — дожидаемся явно.
    await expect(section.getByText('Загрузка курсов…')).toHaveCount(0, { timeout: 15_000 });

    const options = section.getByRole('listitem');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText(GRANTED_COURSE_NAME);
    await expect(section.getByText(DENIED_COURSE_NAME)).toHaveCount(0);
  });

  test('/admin недоступен студенту', async ({ page }) => {
    await gotoAndSettle(page, '/admin');

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });

  test('/superadmin недоступен студенту и не редиректит на /admin/content', async ({ page }) => {
    await gotoAndSettle(page, '/superadmin');

    // RequireAdmin отдаёт «Access denied» до внутреннего Navigate.
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page).toHaveURL(/\/superadmin$/);
  });
});

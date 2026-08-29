/**
 * Роль `author` — админ курса external-x (кабинет автора).
 * Закрывает критерии приёмки 1, 2, 4 и «/admin не редиректит на /superadmin»
 * из docs/plans/author-cabinet.md.
 *
 * Данные стенда — tests/e2e/fixtures/roles.ts: у автора ровно один курс
 * external-x (3 занятия: 2 опубликованы, 1 черновик), 1 вопрос студента,
 * 3 события телеметрии от 2 уникальных hashedUid.
 */
import { test, expect, gotoAndSettle } from './helpers';
import { SMOKE_COURSES, SMOKE_CORE_LESSONS } from '../fixtures/roles';

const COURSE_NAME = SMOKE_COURSES.externalX.doc.name;
const HIDDEN_COURSE_NAME = SMOKE_COURSES.externalHidden.doc.name;
const [LESSON_PUBLISHED, , LESSON_DRAFT] = SMOKE_COURSES.externalX.lessons;
const FOREIGN_LESSON = SMOKE_CORE_LESSONS.development[0];

/** Имена core-курсов — из src/constants/courses.ts (CORE_COURSE_META). */
const CORE_COURSE_NAMES = ['Психология развития', 'Клиническая психология', 'Общая психология'];

test.describe('Админ курса external-x: кабинет автора ограничен своим курсом', () => {
  test('на /admin открывается кабинет автора только со своим курсом и сводкой по нему', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/admin');

    await expect(page.getByRole('heading', { name: 'Кабинет автора' })).toBeVisible();

    // Карточка курса — <section> с h2-названием (AuthorCabinet.tsx, CourseCard).
    const card = page.locator('section').filter({
      has: page.getByRole('heading', { name: COURSE_NAME }),
    });
    await expect(card).toHaveCount(1);

    for (const name of [...CORE_COURSE_NAMES, HIDDEN_COURSE_NAME]) {
      await expect(page.getByRole('heading', { name })).toHaveCount(0);
    }

    await expect(card.getByRole('link', { name: 'Контент' })).toHaveAttribute(
      'href',
      '/admin/content?course=external-x'
    );
    await expect(card.getByRole('link', { name: 'Вопросы', exact: true })).toHaveAttribute(
      'href',
      '/admin/questions?course=external-x'
    );
    await expect(card.getByRole('link', { name: 'Телеметрия' })).toHaveAttribute(
      'href',
      '/admin/telemetry?course=external-x'
    );
    await expect(card.getByRole('link', { name: 'О курсе' })).toHaveAttribute(
      'href',
      '/admin/content/course-intro/external-x'
    );

    // StatBlock: подпись и цифра — соседние <p> внутри карточки.
    const stat = (label: string) =>
      card
        .locator('p')
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator('xpath=following-sibling::p[1]');

    // «Занятия» — счётчик ОПУБЛИКОВАННЫХ (useAuthorCabinetStats.loadLessonCounts),
    // черновик уходит в подпись под цифрой.
    await expect(stat('Занятия')).toHaveText('2');
    await expect(card.getByText('1 в черновиках')).toBeVisible();
    await expect(stat('Вопросы студентов')).toHaveText('1');
    await expect(stat('События за 4 недели')).toHaveText('3');
    await expect(card.getByText('2 студентов')).toBeVisible();
  });

  test('в /admin/content виден только свой курс: без «Добавить курс», с активной «Создать тест»', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/admin/content');

    await expect(page.getByRole('heading', { name: 'Управление контентом' })).toBeVisible();

    // Сайдбар: одна строка курса — считаем по aria-label кнопки переименования.
    await expect(page.getByRole('button', { name: /^Переименовать курс / })).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: `Переименовать курс ${COURSE_NAME}` })
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'Добавить курс' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Создать тест' })).toBeEnabled();

    // Список занятий курса: h3 в карточке + бейдж статуса соседним <span>
    // (AdminContent → SortableItem). В сайдбаре занятия — кнопки, не заголовки.
    await expect(page.getByRole('heading', { name: /^Занятие \d/ })).toHaveCount(3);
    await expect(
      page
        .getByRole('heading', { name: LESSON_DRAFT.title })
        .locator('xpath=following-sibling::span[1]')
    ).toHaveText('Черновик');
    await expect(
      page
        .getByRole('heading', { name: LESSON_PUBLISHED.title })
        .locator('xpath=following-sibling::span[1]')
    ).toHaveText('Опубликовано');
  });

  test('подмена ?course= чужим курсом не открывает чужой контент', async ({ page }) => {
    await gotoAndSettle(page, '/admin/content?course=development');

    // Сначала дожидаемся загруженного списка своего курса, потом проверяем,
    // что курса из URL в кабинете нет — иначе проверка отсутствия прошла бы
    // до первой отрисовки.
    await expect(page.getByRole('heading', { name: LESSON_DRAFT.title })).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Переименовать курс ${COURSE_NAME}` })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: FOREIGN_LESSON.title })).toHaveCount(0);
  });

  test('прямая ссылка на занятие чужого курса не открывает редактор', async ({ page }) => {
    // Роут /admin/content/edit/:periodId (AppRoutes.tsx), курс — из ?course=.
    await gotoAndSettle(page, `/admin/content/edit/${FOREIGN_LESSON.id}?course=development`);

    await expect(page.getByText('У вас нет прав на редактирование этого курса.')).toBeVisible();
    await expect(page.getByRole('link', { name: '← К управлению контентом' })).toBeVisible();
  });

  test('/admin/telemetry показывает сводку только по своему курсу', async ({ page }) => {
    await gotoAndSettle(page, '/admin/telemetry');

    await expect(page.getByRole('heading', { name: '🧪 Использование фич' })).toBeVisible();

    // Курс один — селектор курса не рендерится; диапазон по умолчанию 12 недель.
    await expect(page.locator('#telemetry-course')).toHaveCount(0);
    await expect(page.locator('#telemetry-range')).toHaveValue('12');

    // StatCard: подпись и цифра — соседние <div> (AdminTelemetry.tsx, StatCard).
    // Ограничение по div отсекает одноимённую ячейку сводной таблицы (<td>).
    const stat = (label: string) =>
      page
        .locator('div')
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator('xpath=following-sibling::div[1]');

    await expect(stat('Событий за период')).toHaveText('3');
    await expect(stat('Уникальных пользователей')).toHaveText('2');

    // Посещения лендингов — данные всей платформы, обычному админу не видны.
    await expect(page.getByRole('heading', { name: '👣 Посещения страниц' })).toHaveCount(0);
  });

  test('/superadmin уводит админа курса на /admin/content', async ({ page }) => {
    await gotoAndSettle(page, '/superadmin');

    await expect(page).toHaveURL(/\/admin\/content$/);
  });
});

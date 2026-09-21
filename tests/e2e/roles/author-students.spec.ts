/**
 * «Студенты курса» (`/admin/students`) глазами админа курса external-x.
 *
 * Состав курса приходит из РЕАЛЬНОЙ callable `getCourseStudents`, поэтому спек
 * запускается только стендом `npm run smoke:roles -- --with-functions`
 * (проект smoke:author-students в playwright.config.ts): без эмулятора функций
 * вызов упёрся бы в закрытый порт.
 *
 * Данные стенда — tests/e2e/fixtures/roles.ts: у external-x опубликованы
 * 2 занятия из 3, один студент приходит потоком SMOKE_EXTERNAL_GROUP (2/2
 * просмотрено), один — личным courseAccess (1/2). Прогресс читается клиентом
 * из users/{uid}/courseProgress/external-x под боевыми firestore.rules.
 */
import { test, expect, gotoAndSettle } from './helpers';
import { SMOKE_COURSES, SMOKE_EXTERNAL_GROUP, SMOKE_ROLES } from '../fixtures/roles';

const COURSE = SMOKE_COURSES.externalX;
const STREAM_STUDENT = SMOKE_ROLES.studentExternalStream;
const SOLO_STUDENT = SMOKE_ROLES.studentExternal;
/** Студенты соседних курсов: автор external-x их видеть не должен. */
const FOREIGN_STUDENTS = [SMOKE_ROLES.studentCourse, SMOKE_ROLES.studentGroup];

test.describe('Админ курса: страница «Студенты курса»', () => {
  test('показывает поток и индивидуальных студентов своего курса с прогрессом', async ({
    page,
  }) => {
    await gotoAndSettle(page, `/admin/students?course=${COURSE.id}`);

    await expect(page.getByRole('heading', { name: 'Студенты курса' })).toBeVisible();
    await expect(page.getByText(`Кабинет автора · ${COURSE.doc.name}`)).toBeVisible();

    // Сводка: 2 студента, один потоком и один лично, 2 опубликованных занятия.
    await expect(
      page.getByText('2 студента · 1 через потоки · 1 лично · 2 занятия опубликовано')
    ).toBeVisible();

    const stream = page.locator('section').filter({
      has: page.getByRole('heading', { name: SMOKE_EXTERNAL_GROUP.name }),
    });
    await expect(stream).toHaveCount(1);
    await expect(stream.getByText(STREAM_STUDENT.displayName)).toBeVisible();
    await expect(stream.getByText(STREAM_STUDENT.email)).toBeVisible();
    await expect(stream.getByText('2 / 2')).toBeVisible();

    const individual = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Индивидуально' }),
    });
    await expect(individual).toHaveCount(1);
    await expect(individual.getByText(SOLO_STUDENT.displayName)).toBeVisible();
    await expect(individual.getByText(SOLO_STUDENT.email)).toBeVisible();
    await expect(individual.getByText('1 / 2')).toBeVisible();

    // Автор в announcementAdminIds потока — кнопка объявления на месте.
    await expect(stream.getByRole('link', { name: 'Объявление потоку' })).toHaveAttribute(
      'href',
      '/admin/announcements'
    );
  });

  test('чужие студенты на страницу не попадают', async ({ page }) => {
    await gotoAndSettle(page, `/admin/students?course=${COURSE.id}`);

    // Сначала дожидаемся загруженного списка, иначе проверка отсутствия
    // прошла бы ещё до ответа callable.
    await expect(page.getByText(STREAM_STUDENT.email)).toBeVisible();
    for (const student of FOREIGN_STUDENTS) {
      await expect(page.getByText(student.email)).toHaveCount(0);
      await expect(page.getByText(student.displayName)).toHaveCount(0);
    }
  });

  test('поиск сужает список до совпавшего студента', async ({ page }) => {
    await gotoAndSettle(page, `/admin/students?course=${COURSE.id}`);
    await expect(page.getByText(STREAM_STUDENT.email)).toBeVisible();

    await page.getByRole('searchbox', { name: 'Поиск студента' }).fill(SOLO_STUDENT.email);

    await expect(page.getByText(SOLO_STUDENT.email)).toBeVisible();
    await expect(page.getByText(STREAM_STUDENT.email)).toHaveCount(0);
  });

  test('подмена ?course= чужим курсом даёт заглушку вместо чужих студентов', async ({ page }) => {
    await gotoAndSettle(page, '/admin/students?course=development');

    await expect(page.getByText('У вас нет прав на этот курс.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Индивидуально' })).toHaveCount(0);
    for (const student of FOREIGN_STUDENTS) {
      await expect(page.getByText(student.email)).toHaveCount(0);
    }
  });

  test('«Пригласить на курс» открывает модалку приглашения', async ({ page }) => {
    await gotoAndSettle(page, `/admin/students?course=${COURSE.id}`);

    await page.getByRole('button', { name: 'Пригласить на курс' }).click();

    await expect(
      page.getByRole('heading', { name: `Пригласить на курс «${COURSE.doc.name}»` })
    ).toBeVisible();
    // Пока адресов нет — кнопка отправки заблокирована.
    await expect(page.getByRole('button', { name: 'Пригласить · 0' })).toBeDisabled();

    await page.getByRole('textbox').fill('new-student@smoke.test');
    await expect(page.getByRole('button', { name: 'Пригласить · 1' })).toBeEnabled();
  });
});

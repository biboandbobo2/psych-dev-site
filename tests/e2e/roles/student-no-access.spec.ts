/**
 * Роль `student-no-access` — зарегистрированный гость без единого курса.
 * Закрывает AC-2 со стороны заявителя: отправку заявки с `/home` и её статус
 * вместо кнопки. Доказательством записи в `accessRequests` служит сам статус:
 * он приезжает живым onSnapshot из коллекции, а не из состояния модалки.
 *
 * Спек мутирует песочницу — заявка создаётся с auto-id, и вернуть стенд в
 * исходное состояние умеет только сид (seedAccessRequests чистит лишние
 * заявки). Поэтому serial и без ретраев: ретрай стартовал бы с уже
 * отправленной заявкой и падал по нечитаемой причине.
 */
import { test, expect, gotoAndSettle } from './helpers';
import { SMOKE_COURSES } from '../fixtures/roles';

test.describe.configure({ mode: 'serial', retries: 0 });

const COURSE = SMOKE_COURSES.externalX;
const REQUEST_BUTTON = '🔓 Запросить доступ';
const MESSAGE = 'Веду подростковую группу, нужен доступ к курсу.';

test.describe('Гость без доступа: заявка на доступ к курсу', () => {
  test('на /home есть кнопка «Запросить доступ», статуса заявки нет', async ({ page }) => {
    await gotoAndSettle(page, '/home');

    await expect(page.getByRole('heading', { name: 'Как получить доступ' })).toBeVisible();
    await expect(page.getByRole('button', { name: REQUEST_BUTTON })).toBeVisible();
    await expect(page.getByText(/ждём ответа/)).toHaveCount(0);
  });

  test('заявка с выбранным курсом уходит и превращается в статус на странице', async ({ page }) => {
    await gotoAndSettle(page, '/home');
    await page.getByRole('button', { name: REQUEST_BUTTON }).click();

    await expect(page.getByRole('heading', { name: 'Запрос доступа к курсу' })).toBeVisible();
    // Селект собран из закрытых пользователю курсов: на стенде открытых нет.
    // exact: иначе подпись текстового поля «Какой курс вам нужен…» тоже совпадёт.
    await page.getByLabel('Курс', { exact: true }).selectOption(COURSE.id);
    await page.getByLabel('Какой курс вам нужен и контекст').fill(MESSAGE);
    await page.getByRole('button', { name: 'Отправить' }).click();

    await expect(page.getByText('Заявка отправлена, мы ответим в ближайшее время.')).toBeVisible();

    // Статус — из onSnapshot по accessRequests, значит документ записан.
    await expect(
      page.getByText(new RegExp(`ждём ответа · ${COURSE.doc.name}`))
    ).toBeVisible();
    await expect(page.getByRole('button', { name: REQUEST_BUTTON })).toHaveCount(0);
  });

  test('после перезагрузки дубль отправить нельзя, Telegram остаётся', async ({ page }) => {
    await gotoAndSettle(page, '/home');

    await expect(page.getByText(/ждём ответа/)).toBeVisible();
    await expect(page.getByRole('button', { name: REQUEST_BUTTON })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Написать Алексею в Telegram/ })).toBeVisible();
  });
});

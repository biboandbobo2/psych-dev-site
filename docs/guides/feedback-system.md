# Система обратной связи / Telegram

Актуализировано 2026-09-08 по коду. Единый контур используется Академией и бесплатным разделом «Иконография».

## Поток

`FeedbackModal` / `features/iconography/components/Feedback` → `src/lib/feedback.ts` (`submitFeedback`) → Firebase callable `sendFeedback` → `functions/src/lib/telegram.ts` → существующий Telegram-бот и чат.

Второй бот, публичный Telegram endpoint, Firestore-коллекция отзывов и клиентские токены не создаются. Гостевые сообщения разрешены. Вызов успешен только при `data.success === true`.

**Исключение — заявка на доступ к курсу (AC-2, 2026-09-22).** Кнопка «Запросить доступ» на `/home` больше не ходит через `FeedbackModal`: её окно (`src/pages/home/AccessRequestModal.tsx`) сначала пишет заявку в Firestore-коллекцию `accessRequests`, и только потом шлёт уведомление тем же `submitFeedback`. Порядок важен: Telegram здесь best effort — его ошибка уходит в `reportAppError` и не отменяет уже сохранённую заявку, потому что хранилище теперь Firestore, а Telegram — канал уведомления. Схема коллекции и правила — [firestore-schema.md](../reference/firestore-schema.md#accessrequestsrequestid-ac-2); панель обработки — [multi-course.md](multi-course.md).

## Клиент

`src/components/FeedbackModal.tsx` сохраняет существующие варианты кнопки header/profile/mobile и расширенные параметры заголовков/префикса/фиксированного типа. Авторизованное окно может передавать email, имя и роль. Состояния: ввод, отправка, успех, ошибка.

Форма портала не требует Auth. Текст 3–1700 символов оставляет место для служебного префикса. Передаёт `iconId` и текущий URL; ID также в префиксе, поэтому контекст доставляется через предыдущую production-версию функции. Есть honeypot, двухсекундная задержка, защита двойного клика и минутная пауза после успешного сообщения. При ошибке текст остаётся в форме, техническая ошибка сервера не показывается. Рядом с кнопкой объясняется, какие сведения уйдут в Telegram; комментарии не публикуются.

## Callable и входной контракт

`functions/src/sendFeedback.ts`: Gen2 `onCall`, регион `us-central1`, общие `CALLABLE_OPTS`, service account из `FUNCTIONS_SERVICE_ACCOUNT` для доступа к Secret Manager.

```ts
interface FeedbackPayload {
  type: 'bug' | 'idea' | 'thanks';
  message: string; // 3–2000 символов
  userEmail?: string; // до 254
  userName?: string; // до 120
  userRole?: string; // до 80
  pageUrl?: string; // до 600, http/https, без userinfo
  iconId?: string; // до 100, [a-z0-9-]+
  website?: string; // honeypot; непустое значение отклоняется
}
```

Вход должен быть объектом, строки проверяются по типу и длине; служебные поля не допускают управляющие символы. Старые клиенты без дополнительных полей поддерживаются. Проверка URL не является проверкой личности отправителя: это предоставленный клиентом контекст.

Лимитер в памяти: 5 запросов / 10 минут по Auth uid или IP. Лимит на один инстанс; распределённой квоты нет. При существенном спаме следующий шаг — защита публичного endpoint на уровне инфраструктуры, а не создание нового бота.

Сообщения обратной связи передаются с `{ plainText: true }`. Telegram Markdown не разбирает пользовательский текст; незакрытые скобки, подчёркивания и обратные кавычки не ломают доставку. Другие вызовы helper сохраняют Markdown по умолчанию. Сумма ограничений полей остаётся ниже лимита Telegram. Клиенту возвращается нейтральная ошибка без внутреннего текста исключения и секретов.

## Секреты

`functions/src/lib/telegram.ts` сначала читает Secret Manager (`telegram-bot-token`, `telegram-chat-id`), затем использует серверные `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` при отсутствии секретов. Результат кэшируется, неудачный lookup не кэшируется навсегда. Значения не должны попадать в клиентский bundle, документацию или логи.

Предыдущая версия guide ошибочно говорила о Gen1 и токенах в исходнике. Эти утверждения удалены: фактический код использует Gen2 и Secret Manager.

## Проверки

```bash
npm run typecheck:app
npm run typecheck:functions
npm test -- --run src/features/iconography/components/Feedback.test.tsx
cd functions
npm test -- --run src/sendFeedback.test.ts src/lib/telegram.test.ts
npm run build
```

Unit-тесты mock-ируют Telegram helper / fetch и не отправляют сообщений. Эмулятор сам по себе НЕ гарантирует отсутствия реальной отправки: при доступных серверных секретах helper может обратиться к Telegram. Для изоляции использовать тестовые секреты или mock transport; не запускать реальные рассылки случайно.

Локальный live smoke 2026-09-08: одно явно помеченное QA-сообщение со страницы `cma-168322` получило успешный ответ существующего production callable; в тексте был ID, в payload — URL локального паспорта. Это подтверждает старый опубликованный контур. Новая валидация/`plainText` проверены локальными тестами и требуют отдельного targeted deploy.

## Публикация

Только после разрешения владельца. Планируемое изменение: **одна существующая функция `sendFeedback`**, без создания/удаления функций или смены бота/секретов. Пересобрать функции, перечислить изменения и получить одобрение до `firebase deploy --only functions:sendFeedback`. После публикации проверить plain-text комментарий и URL/ID на production.

Связанные документы: [Иконография](iconography.md), [testing-workflow](../development/testing-workflow.md), [QA log](../processes/qa-smoke-log.md).

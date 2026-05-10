# Бронирование экзамена

Студент записывается на 40-минутный слот, прилагая эссе; админ (super-admin) создаёт слоты и читает эссе. Все ключевые операции — **через Cloud Functions** (`bookExamSlot`, `cancelExamBooking`), которые делают атомарные транзакции через Admin SDK. Прямого write студента в Firestore нет.

## Сущности и пути в Firestore

```
exams/{examId}                                       // конфигурация экзамена
  ├─ slots/{slotId}                                  // публичный факт занятости
  ├─ bookingDetails/{slotId}__{groupId}              // приватные данные брони
  ├─ essays/{userId}                                 // эссе студента
  └─ userIndex/{userId}                              // O(1) проверка «у меня есть бронь»
```

**Почему 4 коллекции:**
- `slot.bookings.{groupId}` — публичный read (студенты видят, занят ли слот).
- `bookingDetails` — read только владелец брони + super-admin (соседу по слоту имена не видны).
- `essays` — read только владелец + super-admin.
- `userIndex` — атомарный гарант «один юзер ≤ одна бронь».

Один `slot` = N мест (N = `exam.groupIds.length`); каждый groupId соответствует одному студенту из этой группы. Студент видит слот доступным, если **в его группе** `bookings[myGroup] == null`.

## Поля Exam

| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| `title` | string | — | Заголовок экзамена |
| `courseId` | string | — | Связанный курс |
| `groupIds` | string[] | — | Группы-участники (`groups/{groupId}.memberIds`) |
| `slotDurationMinutes` | number | 40 | Длительность одного слота |
| `essayMinChars` / `essayMaxChars` | number | 1000 / 3500 | Границы длины эссе |
| `cancelLeadTimeHours` | number | 48 | Сколько часов до начала ещё можно отменить |
| `timezone` | string | `Asia/Tbilisi` | Только для UI; UTC для хранения |
| `status` | `'active'` \| `'archived'` | `'active'` | Архивирование скрывает карточку у студентов |
| `announcement` | `{ title, body }` | — | Текст карточки на /home |

## Cloud Functions

### `bookExamSlot({ examId, slotId, essay })`
- Проверяет: статус, длину эссе, единственность группы юзера, отсутствие другой брони, свободность гнезда.
- Атомарно пишет 4 документа через `runTransaction`.
- Возвращает `{ ok: true, slotId, groupId }`.

### `cancelExamBooking({ examId })`
- Проверяет дедлайн `now ≤ slot.startAt − cancelLeadTimeHours`.
- Атомарно nullify-ит `slot.bookings.{groupId}` и удаляет `bookingDetails`, `essays/{uid}`, `userIndex/{uid}`.

Стоимость: ~60 invocations за весь экзамен (15 слотов × 2 потока × book+cancel) — пренебрежима в Firebase free tier.

## Security rules

`firestore.rules`, секция `match /exams/{examId}`:
- read для всех authenticated → `slots`, родительский `exams/{examId}`.
- read только владелец+super-admin → `essays`, `userIndex`, `bookingDetails`.
- write на всех — только super-admin (Cloud Functions обходят rules через Admin SDK).
- Catch-all сужен через `document.size() ≥ 4 && document[0] == 'exams' && document[2] in [essays, userIndex, bookingDetails]` — приватные пути не утекают через общий публичный read.

## Клиентские хуки

| Хук | Назначение |
|---|---|
| `useExam(examId)` | Подписка на документ экзамена + слоты (`onSnapshot`, `orderBy startAt`) |
| `useMyExamBooking(examId)` | Подписка на `userIndex/{uid}`, возвращает `{ slotId, groupId, bookedAt }` или `null` |
| `useActiveExamsForMe()` | Список active-экзаменов, в группах которых состоит юзер |

## UI

### Студент (`/home`)
- Карточка в `MyExamsSection` (`src/pages/home/components/`): «Записаться» / «Моя запись: …». Клик → `ExamBookingModal`.
- Модалка использует тот же `ExamMonthGrid` в `mode='student'`, без кнопок создания/удаления.
- Под выбранным слотом — `<textarea>` со счётчиком и подсказкой; «Забронировать» вызывает `bookExamSlot`.
- Если уже есть бронь — плашка «Моя запись» с кнопкой «Отменить». Кнопка скрыта, если до начала меньше `cancelLeadTimeHours`.
- Бронь подмешивается в общий календарь `/home` через `examCalendarEvents` в `HomeDashboard.tsx` (поддерживает один активный экзамен; для нескольких — см. audit-backlog).

### Админ (`/superadmin/exams`)
- Список активных экзаменов (без `orderBy` — сортировка на клиенте, чтобы избежать composite index).
- Тот же `ExamMonthGrid` в `mode='admin'`: счётчик `N/M`, кнопки создания слотов.
- `SlotDetailsModal` — два «гнезда» с именем+email; клик по имени → `StudentEssayModal` (read эссе).
- «Удалить слот» disabled, если есть хоть одна бронь (договорись со студентами вручную).
- «В архив» — мгновенно скрывает карточку у студентов, сохраняя историю броней.

## Уведомления преподавателю (GCal + Telegram)

Firestore-trigger `onExamSlotWrite` ([functions/src/examNotifications.ts](../../functions/src/examNotifications.ts)) однонаправленно экспортирует слоты с бронями в **личный календарь преподавателя** и шлёт уведомления в Telegram. Это отдельный контур от двусторонней `gcalSync` (та работает с групповыми календарями студентов).

| Переход count | GCal | Telegram |
|---|---|---|
| `0 → ≥1` | `insertEvent`, ID кладётся в `slot.personalGcalEventId` | 🟢 «Новая бронь» с именем+email |
| `≥1 → ≥1` | `patchEvent` (обновляем description со списком студентов) | 🟢 «Доп. бронь» / 🔵 «Отмена брони» |
| `≥1 → 0` | `patchEvent` → `summary='❌ ОТМЕНЕНО — …'`, `transparency=transparent` (event НЕ удаляется) | 🔴 «Все брони отменены» |
| `startAt`/`endAt` изменились (count > 0) | `patchEvent` с новым временем | 📅 «Перенос слота» |

**Конфиг:**
- `personal-gcal-id` (Secret Manager) или env `PERSONAL_GCAL_ID` — calendar ID преподавателя. Если не задан, GCal-часть пропускается, TG продолжает работать.
- Telegram chat ID — общий `telegram-chat-id` (тот же, что для feedback).
- Service account `psych-dev-site-prod@appspot.gserviceaccount.com` должен иметь право «Вносить изменения в мероприятия» в нужном календаре.

**Anti-echo:** функция дописывает в slot поля `personalGcalEventId` / `personalGcalSyncedAt`. Повторный onWrite видит одинаковые `bookings` и одинаковые `startAt/endAt` → `detectTransition` возвращает `skip`.

**Self-heal (backfill):** если у слота `count > 0`, но `personalGcalEventId` отсутствует, и при этом bookings/время не менялись — `detectTransition` возвращает `self-heal` → создаётся event без TG-уведомления. Срабатывает при «touch» слота (любое мета-поле дописали). Использовалось для backfill старых броней при первом деплое; продолжает работать как защита от потери eventId.

**Тесты:** `functions/src/examNotifications.test.ts` (31 тест) — `countOccupied`, `detectTransition` для всех веток (включая self-heal), `buildGCalPayload`, `buildTgMessage`, и семь integration-кейсов с моками gcalClient/telegram (0→1, 1→0, time-shift, slot deleted, error path, self-heal, anti-echo).

### Runbook: что делать, если в slot появилось `personalGcalSyncError`

Поле появляется, когда `insertEvent`/`patchEvent` упал. Триггер не падает дальше — TG всё равно уходит, чтобы преподаватель узнал о брони.

| Симптом | Вероятная причина | Действие |
|---|---|---|
| `403 Forbidden` / `permission denied` | SA потерял доступ к календарю | Перевыдать в GCal → Настройки календаря → Общий доступ → `psych-dev-site-prod@appspot.gserviceaccount.com` → «Вносить изменения в мероприятия» |
| `404 Not Found` при patch | event удалён вручную из календаря | Очистить `personalGcalEventId: null` в slot → touch slot → self-heal создаст новый |
| `5xx` / `Internal error` | временный сбой GCal | Повторить touch (Firestore-update любого мета-поля slot) — trigger перезапустится |
| `secret manager … access denied` | потеряли IAM на `personal-gcal-id` | `gcloud secrets add-iam-policy-binding personal-gcal-id --member=serviceAccount:psych-dev-site-prod@appspot.gserviceaccount.com --role=roles/secretmanager.secretAccessor --project=psych-dev-site-prod` |

Логи: `firebase functions:log --only onExamSlotWrite --project psych-dev-site-prod`.

«Touch» slot для перезапуска self-heal:
```bash
# через MCP firestore_update_document или из админки — любое незначащее поле, например:
{ "personalGcalBackfillTouched": <ISO timestamp> }
```
detectTransition увидит cnt>0 без eventId (после очистки) → self-heal → новый insert без TG.

### Подключение второго преподавателя (полная цепочка)

Когда нужно, чтобы у конкретного экзамена брони уходили в календарь другого преподавателя (не Алексея). Этап 2 архитектуры — на текущий момент НЕ реализован, ниже последовательность, которую нужно выполнить:

1. **Поля в `Exam`** ([src/types/exam.ts](../../src/types/exam.ts)):
   ```ts
   notifyCalendarId?: string;   // override personal-gcal-id
   notifyTelegramChatId?: string;  // override telegram-chat-id
   ```
2. **Trigger ([functions/src/examNotifications.ts](../../functions/src/examNotifications.ts)):** в обработчике брать `exam.notifyCalendarId ?? defaultPersonalGcalId` и аналогично для chat. `sendTelegramMessage(text, { chatId })` уже поддерживает per-call override.
3. **UI ([src/pages/admin/exams/](../../src/pages/admin/exams/)):** два опциональных input'а в форме создания/редактирования экзамена.
4. **Конфиг для нового преподавателя:**
   ```bash
   # 1) если у него отдельный календарь — пусть создаст и расшарит SA
   #    (если использует свой primary, просто расшарит primary)
   #    GCal → Настройки нужного календаря → Общий доступ → добавить
   #    psych-dev-site-prod@appspot.gserviceaccount.com с правом «Make changes»

   # 2) узнать его Telegram chat id (один раз пишем боту, читаем getUpdates)
   curl "https://api.telegram.org/bot<TOKEN>/getUpdates"

   # 3) внести calendarId/chatId в Exam.notifyCalendarId / notifyTelegramChatId
   #    через UI админки (или временно через firestore_update_document)
   ```

**Что НЕ нужно:** отдельный Secret Manager под второго преподавателя. Поля документа экзамена — достаточно. Email-адреса календарей и chat ID — не критичные секреты.

## Что не сделано (см. audit-backlog)

- Перенос слота на другое время в UI (хелпер `rescheduleSlot` есть, но без кнопки).
- Архивные экзамены в UI (только поле в БД).
- Поддержка нескольких активных экзаменов одновременно в общем календаре `/home` (сейчас — только первый).
- Per-exam override (`Exam.notifyCalendarId` / `notifyTelegramChatId`) — отложено до второго преподавателя.

## Ключевые файлы

| Слой | Файл |
|---|---|
| Типы | [src/types/exam.ts](../../src/types/exam.ts) |
| Cloud Functions | [functions/src/exams.ts](../../functions/src/exams.ts), [examNotifications.ts](../../functions/src/examNotifications.ts) |
| Firestore rules | [firestore.rules](../../firestore.rules) (секция `/exams/{examId}`) |
| Клиентский client | [src/lib/exams/examsClient.ts](../../src/lib/exams/examsClient.ts) |
| Клиентский CRUD | [src/lib/exams/examsFirestore.ts](../../src/lib/exams/examsFirestore.ts) |
| Хуки | [src/hooks/useExam.ts](../../src/hooks/useExam.ts), [useMyExamBooking.ts](../../src/hooks/useMyExamBooking.ts), [useActiveExamsForMe.ts](../../src/hooks/useActiveExamsForMe.ts) |
| Админ-страница | [src/pages/admin/exams/](../../src/pages/admin/exams/) |
| Студенческие компоненты | [src/pages/home/components/MyExamsSection.tsx](../../src/pages/home/components/MyExamsSection.tsx), [ExamBookingModal.tsx](../../src/pages/home/components/ExamBookingModal.tsx) |
| Тесты | [functions/src/exams.test.ts](../../functions/src/exams.test.ts), [examNotifications.test.ts](../../functions/src/examNotifications.test.ts), [src/lib/exams/__tests__/](../../src/lib/exams/__tests__/), [src/pages/admin/exams/__tests__/](../../src/pages/admin/exams/__tests__/) |

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

## Что не сделано (см. audit-backlog)

- Уведомления (email/Telegram) при бронировании/отмене.
- Перенос слота на другое время в UI (хелпер `rescheduleSlot` есть, но без кнопки).
- Архивные экзамены в UI (только поле в БД).
- Поддержка нескольких активных экзаменов одновременно в общем календаре `/home` (сейчас — только первый).

## Ключевые файлы

| Слой | Файл |
|---|---|
| Типы | [src/types/exam.ts](../../src/types/exam.ts) |
| Cloud Functions | [functions/src/exams.ts](../../functions/src/exams.ts) |
| Firestore rules | [firestore.rules](../../firestore.rules) (секция `/exams/{examId}`) |
| Клиентский client | [src/lib/exams/examsClient.ts](../../src/lib/exams/examsClient.ts) |
| Клиентский CRUD | [src/lib/exams/examsFirestore.ts](../../src/lib/exams/examsFirestore.ts) |
| Хуки | [src/hooks/useExam.ts](../../src/hooks/useExam.ts), [useMyExamBooking.ts](../../src/hooks/useMyExamBooking.ts), [useActiveExamsForMe.ts](../../src/hooks/useActiveExamsForMe.ts) |
| Админ-страница | [src/pages/admin/exams/](../../src/pages/admin/exams/) |
| Студенческие компоненты | [src/pages/home/components/MyExamsSection.tsx](../../src/pages/home/components/MyExamsSection.tsx), [ExamBookingModal.tsx](../../src/pages/home/components/ExamBookingModal.tsx) |
| Тесты | [functions/src/exams.test.ts](../../functions/src/exams.test.ts), [src/lib/exams/__tests__/](../../src/lib/exams/__tests__/), [src/pages/admin/exams/__tests__/](../../src/pages/admin/exams/__tests__/) |

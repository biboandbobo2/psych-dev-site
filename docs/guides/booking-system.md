# Система бронирования кабинетов

## Обзор

Страница `/booking` — публичная standalone-страница для бронирования кабинетов в психологическом центре DOM (Тбилиси). Использует alteg.io (YCLIENTS) как backend для управления записями, расписанием и клиентами.

**Дизайн:** стиль оффлайн-сайта DOM (Sofia Sans, зелёный #6d8134 / красный #ce164d / кремовый #f5f1eb), отдельный от основного сайта курсов. Страница самодостаточна (свой header/footer) для будущей миграции на отдельный сайт.

## Архитектура

```
Пользователь → BookingPage / AccountPage
  → useBookingApi (хуки) → /api/booking (Vercel serverless)
    → alteg.io REST API (book_times, book_record, records, clients)
  → useBookingAuth → Firestore users/{uid} ↔ alteg.io clients
  → Firebase Auth (Google / Email+password)
```

## Кабинеты (alteg.io staff)

| Кабинет | alteg.io staff ID | Цвет |
|---------|-------------------|------|
| Лазурный | 3012185 | #4A90D9 |
| Бордовый | 2769648 | #8B2252 |
| Изумрудный | 3012126 | #2E8B57 |

## Услуги (alteg.io services)

| Длительность | Service ID | seance_length |
|-------------|-----------|---------------|
| 1 час | 12334505 | 3600 |
| 1.5 часа | 13451976 | 5400 |
| 2 часа | 13451977 | 7200 |

**Важно:** alteg.io возвращает неправильный `seance_length` в ответах `book_times` (всегда 7200 независимо от услуги). Для отображения используем `DURATION_OPTIONS[].seconds`, для overlap-фильтрации — `durationSeconds` параметр.

## Рабочие часы

- Расписание: 8:00–22:00 в alteg.io
- Бронирование доступно: 9:00–22:00 (фильтр `hour >= 9` на фронте)
- Слоты после 22:00 отфильтровываются: `startMin + duration <= 22*60`

## Потоки бронирования

### 1. Через кабинет (room-first)
Кабинет → Дата → Время (с переключателем длительности 1ч/1.5ч/2ч) → Подтверждение

### 2. Через дату (date-first)  
Дата → Сводная таблица всех кабинетов (с переключателем длительности) → Подтверждение

### 3. Через недельный календарь (quick booking)
Клик по свободному слоту в таблице расписания → Сразу на подтверждение
- Desktop: один клик = бронь
- Mobile (touch): первый тап = выделение + кнопка "Забронировать", второй = бронь

## Недельный календарь (WeekSchedule)

- Строки: 9:00–22:00 (метки начиная с 10:00)
- Столбцы: 7 дней × 3 кабинета
- Занятые слоты: цветные блоки (высота = длительность)
- Hover: блок размером с выбранную длительность, цвет кабинета (зелёный=можно, серый=нельзя)
- Переключатель длительности: слева от заголовка
- Навигация: стрелки ← → (текущая неделя + 3 вперёд)
- Сегодня: зелёный фон столбца + красная линия текущего времени

## Фильтрация слотов

alteg.io API (`book_times`) **не проверяет** overlap с существующими бронями. Наш фронтенд:

1. Запрашивает слоты: `GET /api/booking?action=slots&staffId=X&date=Y&serviceId=Z`
2. Параллельно запрашивает busy: `GET /api/booking?action=busy&staffId=X&date=Y`
3. Фильтрует: `hour >= 9`, `endMin <= 22*60`, `!slotOverlapsBusy()`
4. **padTime:** alteg.io возвращает часы без ведущего нуля (`"9:30"`), ISO 8601 требует `"09:30"` — функция `padTime()` в useBookingApi.ts
5. Сортировка: числовая по `h*60+m` (не строковая)
6. Overlap с корзиной: выбрал 18:00 на 2ч → 18:30 и 19:00 блокируются

## API Proxy (`api/booking.ts`)

Vercel serverless function — прокси к alteg.io.

### Credentials (Vercel env vars)
- `ALTEG_PARTNER_TOKEN` — Bearer token для API
- `ALTEG_USER_TOKEN` — User token для B2B операций
- `ALTEG_COMPANY_ID` — 1265772

### Actions

| Action | Method | Описание |
|--------|--------|----------|
| `rooms` | GET | Список кабинетов (staff) |
| `services` | GET | Список услуг |
| `slots` | GET | Доступные слоты (staffId, date, serviceId) |
| `dates` | GET | Доступные даты (staffId, serviceId) |
| `busy` | GET | Занятые интервалы (staffId, date) — для overlap-фильтрации |
| `check` | POST | Валидация перед бронированием (book_check) |
| `book` | POST | Создание бронирования (book_record) + notify_by_email:24 |
| `resolveMyClientIds` | POST | Защищённая self-only связка Firebase user ↔ alteg.io clients по Bearer token |
| `createClient` | POST | Создание клиента в alteg.io |
| `clientRecords` | GET | Записи клиента (по массиву clientIds) |
| `cancelRecord` | POST | Удаление записи (DELETE /record/{id}/{recordId}) |

### Особенности
- DELETE в alteg.io возвращает пустой body — `handleCancelRecord` проверяет `res.ok` вместо `res.json()`
- `altegFetch`/`altegPost` читают response как text, проверяют на пустоту перед JSON.parse
- Поиск клиентов: параллельно по email и phone, объединение без дублей

## Авторизация

**Общий Firebase Auth** — тот же аккаунт что на основном сайте (academydom.com).

### Методы входа
- **Google** — `signInWithPopup()`, мгновенный вход
- **Email + пароль** — `signInWithEmailAndPassword()` / `createUserWithEmailAndPassword()` + email verification

### После первого входа
PhoneModal — обязательный ввод телефона. Валидация: `+`, 10-15 цифр, международный формат.

### Связка с alteg.io (`useBookingAuth`)
1. Проверяет кэш `altegClientIds[]` в Firestore `users/{uid}`
2. Если кэша нет — отправляет защищённый `POST /api/booking` с `action=resolveMyClientIds` и Bearer token текущего Firebase user
3. Сервер сам читает `users/{uid}`, ищет клиента в alteg.io по email/phone из Firestore и при необходимости создаёт нового
4. Сервер сохраняет `altegClientIds[]` обратно в Firestore и возвращает только минимальный результат для текущего пользователя

### Предзаполнение формы
BookingConfirmation автоподставляет name, email (из Firebase user), phone (из Firestore).

## Личный кабинет (`/booking/account`)

- Предстоящие и прошлые бронирования
- Данные из alteg.io через `clientRecords` (по всем altegClientIds)
- Отмена: кнопка "Отменить" → подтверждение → DELETE в alteg.io
- Дедлайн отмены: до 21:00 накануне дня брони
- После отмены: карточка становится серой, статус "Отменено"

## Файловая структура

```
src/pages/
├── BookingPage.tsx              # Главная страница бронирования
├── booking/
│   ├── BookingLayout.tsx        # Layout (header с auth + footer)
│   ├── StartStep.tsx            # 2 входа: кабинет / дата
│   ├── RoomSelector.tsx         # Карточки кабинетов (с availability)
│   ├── DatePicker.tsx           # Выбор даты (28 дней)
│   ├── TimeSlotGrid.tsx         # Слоты времени + переключатель длительности
│   ├── AllRoomsGrid.tsx         # Сводная таблица кабинеты × слоты
│   ├── WeekSchedule.tsx         # Недельный календарь
│   ├── BookingCart.tsx           # Корзина (fixed bottom bar)
│   ├── BookingConfirmation.tsx  # Форма контактов + сводка
│   ├── EventsSection.tsx        # Плейсхолдер мероприятий
│   ├── AccountPage.tsx          # Личный кабинет
│   ├── AuthModal.tsx            # Модалка входа (Google / email)
│   ├── PhoneModal.tsx           # Модалка ввода телефона
│   ├── useBookingApi.ts         # API хуки (slots, rooms, book)
│   ├── useBookingAuth.ts        # Firebase ↔ alteg.io связка
│   ├── useWeekSchedule.ts       # Данные недельного расписания
│   ├── types.ts                 # Типы, ROOMS, DURATION_OPTIONS
│   └── mockData.ts              # Моковые данные (не используются)
api/
└── booking.ts                   # Vercel serverless proxy
```

## Известные особенности alteg.io API

1. `book_times` возвращает неправильный `seance_length` (всегда одно значение для всех услуг)
2. `book_times` **не проверяет overlap** с существующими бронями — нужен фильтр на фронте через `busy`
3. Время без ведущего нуля: `"9:30"` вместо `"09:30"` — ломает ISO 8601 парсинг
4. DELETE `/record` возвращает пустой body при успехе
5. PUT на услугу сбрасывает привязки staff — связывать заново через POST `/services/{id}/staff`
6. `is_paid_staff` и `has_access_timetable` нужно выставить true для расписания

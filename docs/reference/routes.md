# 🗺️ Routes Reference

> **Дата:** 2026-04-16
> **Статус:** Актуальный справочник

Полный список маршрутов приложения с правами доступа и описанием.

---

## 📋 Содержание

1. [Публичные маршруты](#публичные-маршруты)
2. [Защищённые маршруты](#защищённые-маршруты)
3. [Административные маршруты](#административные-маршруты)
4. [Система ролей](#система-ролей)
5. [Lazy Loading](#lazy-loading)

---

## Публичные маршруты

Доступны всем пользователям (с авторизацией и без).

### Главная страница (Home) и профиль

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/` | `Navigate → /home` | Редирект: любая точка входа на сайт ведёт на `/home`. |
| `/home` | `HomePage` | Домашний дашборд: continue-курсы, лента объявлений/событий, каталог курсов, выезжающий drawer со списком занятий, блок «Возможности платформы». |
| `/homepage` | `Navigate → /home` | Legacy-URL, сохранён для совместимости с внешними ссылками. |
| `/profile` | `Profile` | Страница настроек/идентичности: аватар, роль, обратная связь, история поиска, Gemini API ключ (BYOK). |
| `/features` | `FeaturesPage` | Обзор возможностей платформы (курсы, тесты, заметки, таймлайн, поиск, бронирование). |
| `/about` | `AboutPage` | О проекте DOM Academy (Development Of Mind): 6 вкладок (проект/команды/история/офлайн-центр/партнёры). Контент в `pages/about`, fallback на хардкод. |
| `/projects/:slug` | `DynamicProjectPage` | Страница проекта академии. Контент в `projectPages/{slug}`, fallback на хардкод-словарь (`dom-academy-overview`). |
| `/warm_springs2` | `WarmSprings2Page` | Лендинг интенсива по групповой психотерапии «Тёплые ключи» (Тбилиси, июль 2026). Статическая, не редактируется через `/superadmin/pages`. |
| `/login` | `Login` | Страница входа (eager load, не через lazy.ts). |

**Вводные страницы курсов:**

| Маршрут | Курс | Назначение |
|---------|------|------------|
| `/development/intro` | Психология развития | Вводная страница курса |
| `/clinical/intro` | Клиническая психология | Вводная страница курса |
| `/general/intro` | Общая психология | Вводная страница курса |

---

### Бронирование кабинетов

**Базовый путь:** `/booking`

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/booking` | `BookingPage` | Выбор кабинета, даты и времени |
| `/booking/account` | `BookingAccountPage` | Личный кабинет бронирований |
| `/booking/photos` | `BookingPhotosPage` | Фотогалерея кабинетов |
| `/booking/pricing` | `BookingPricingPage` | Тарифы и цены |

**Layout:** `BookingSectionLayout` — standalone layout (Sofia Sans, DOM-цвета), отдельный от основного приложения. Бронирование кабинетов в психологическом центре «Dom» в Тбилиси через alteg.io API.

**См. подробности:** [docs/guides/booking-system.md](../guides/booking-system.md)

---

### Курс: Психология развития

**Базовый путь:** `/`

| Маршрут | Описание | Возраст |
|---------|----------|---------|
| `/intro` | Вводное занятие | - |
| `/prenatal` | Пренатальное развитие | До рождения |
| `/0-1` | Младенчество | 0-1 год |
| `/1-3` | Ранний возраст | 1-3 года |
| `/3-6` | Дошкольный возраст | 3-6 лет |
| `/7-9` | Младший школьный возраст | 7-9 лет |
| `/10-13` | Подростковый возраст | 10-13 лет |
| `/14-18` | Юность | 14-18 лет |
| `/19-22` | Молодость (ранняя) | 19-22 года |
| `/22-27` | Молодость (поздняя) | 22-27 лет |
| `/28-40` | Зрелость | 28-40 лет |
| `/40-65` | Средний возраст | 40-65 лет |
| `/66-80` | Пожилой возраст | 66-80 лет |
| `/80-plus` | Долголетие | 80+ лет |

**Компонент:** `PeriodPage` (src/pages/PeriodPage.tsx) — eager load для быстрого отклика

---

### Курс: Клиническая психология

**Базовый путь:** `/clinical`

**Требование:** `courseAccess.clinical === true` (выдаётся Super Admin)

| Маршрут | Описание |
|---------|----------|
| `/clinical/intro` | Вводное занятие |
| `/clinical/1` | Тема 1: Патопсихология |
| `/clinical/2` | Тема 2: Расстройства личности |
| `/clinical/3` | Тема 3: Аффективные расстройства |
| `/clinical/4` | Тема 4: Психотические расстройства |
| `/clinical/5` | Тема 5: Невротические расстройства |
| `/clinical/6` | Тема 6: Психосоматика |
| `/clinical/7` | Тема 7: Зависимости |
| `/clinical/8` | Тема 8: Детская клиническая психология |
| `/clinical/9` | Тема 9: Геронтопсихология |
| `/clinical/10` | Тема 10: Методы психодиагностики |
| `/clinical/11` | Тема 11: Психотерапевтические подходы |
| `/clinical/12` | Тема 12: Кризисная интервенция |

**Компонент:** `ClinicalTopicDetail` (src/pages/ClinicalTopicDetail.tsx)

---

### Курс: Общая психология

**Базовый путь:** `/general`

**Требование:** `courseAccess.general === true` (выдаётся Super Admin)

| Маршрут | Описание |
|---------|----------|
| `/general/1` | Тема 1: История психологии |
| `/general/2` | Тема 2: Восприятие |
| `/general/3` | Тема 3: Внимание |
| `/general/4` | Тема 4: Память |
| `/general/5` | Тема 5: Мышление |
| `/general/6` | Тема 6: Речь |
| `/general/7` | Тема 7: Воображение |
| `/general/8` | Тема 8: Эмоции |
| `/general/9` | Тема 9: Чувства |
| `/general/10` | Тема 10: Мотивация |
| `/general/11` | Тема 11: Воля |
| `/general/12` | Тема 12: Личность |

**Компонент:** `GeneralTopicDetail` (src/pages/GeneralTopicDetail.tsx)

---

### Научный поиск

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/research` | `ResearchPage` | Поиск научных статей (OpenAlex, Semantic Scholar) + AI-помощник (Gemini) |

**Доступ:** требует авторизации (RequireAuth)

---

## Защищённые маршруты

Требуют авторизации (`request.auth != null`).

### Профиль и инструменты

| Маршрут | Компонент | Описание | Lazy |
|---------|-----------|----------|------|
| `/profile` | `Profile` | Профиль пользователя | ✅ |
| `/notes` | `Notes` | Создание и просмотр заметок | ✅ |
| `/timeline` | `Timeline` | Интерактивный таймлайн жизни | ✅ |
| `/disorder-table` | `DisorderTable` | Таблица по расстройствам (матрица функции × диагнозы) | ✅ |

**Lazy Loading:** Эти страницы загружаются через `React.lazy` (см. `src/pages/lazy.ts`)

---

### Система тестирования

| Маршрут | Компонент | Описание | Lazy |
|---------|-----------|----------|------|
| `/tests` | `TestsPage` | Список тестов (rubricFilter="full-course") | ✅ |
| `/tests-lesson` | `TestsPage` | Тесты по возрастным периодам (rubricFilter="age-periods") | ✅ |
| `/tests/dynamic/:testId` | `DynamicTest` | Прохождение теста из Firestore | ✅ |

**Динамические тесты (Firestore):**
- Создаются через админ-панель (`/admin/content` → "Создать тест")
- Рубрики: курс целиком или конкретные возрастные периоды
- 1-20 вопросов с 4 вариантами ответа
- Система разблокировки уровней (`prerequisiteTestId`)

**См. подробности:** [docs/guides/testing-system.md](../guides/testing-system.md)

---

### Legacy тесты

| Маршрут | Компонент | Описание | Разблокировка |
|---------|-----------|----------|---------------|
| `/tests/authors` | `AuthorsTest` | Уровень 1: Авторы и термины | Доступен сразу |
| `/tests/authors/level2` | `AuthorsTestLevel2` | Уровень 2: Цитаты | Требует 10/10 на уровне 1 |
| `/tests/authors/level3` | `AuthorsTestLevel3` | Уровень 3: Термины в контексте | Требует 10/10 на уровне 2 |

**Данные:** legacy-уровни инкапсулированы внутри клиентских модулей `AuthorsTest*`; отдельные migration data-файлы больше не используются.

---

## Административные маршруты

Требуют роль **Admin** или **Super Admin**.

### Основная админ-панель

| Маршрут | Компонент | Роль | Описание | Lazy |
|---------|-----------|------|----------|------|
| `/admin` | `AdminLanding` | Admin | Редирект на `/superadmin` (Super Admin) или `/admin/content` (Admin) | — |
| `/superadmin` | `Admin` | Super Admin | Главная админ-панель | ✅ |
| `/admin/users` | `AdminUsers` | Super Admin | Управление пользователями и ролями | ✅ |
| `/admin/archive` | `AdminArchive` | Super Admin | Утилиты: диагностика токенов, загрузка ассетов, seed-admin | ✅ |
| `/migrate-topics` | `MigrateTopics` | Super Admin | Миграция тем в Firestore | ✅ |

---

### Редактирование контента

| Маршрут | Компонент | Роль | Описание | Lazy |
|---------|-----------|------|----------|------|
| `/admin/content` | `AdminContent` | Admin | Единый редактор для всех трёх курсов | ✅ |
| `/admin/content/edit/:periodId?course=development` | `AdminContentEdit` | Admin | Редактирование периода психологии развития | ✅ |
| `/admin/content/edit/:topicId?course=clinical` | `AdminContentEdit` | Admin | Редактирование темы клинической психологии | ✅ |
| `/admin/content/edit/:topicId?course=general` | `AdminContentEdit` | Admin | Редактирование темы общей психологии | ✅ |

**Примечание:** Переключатель курсов на `/admin/content` позволяет выбрать курс для редактирования.

**Firestore коллекции:**
- `development` → `periods/{periodId}`
- `clinical` → `clinical-topics/{topicId}`
- `general` → `general-topics/{topicId}`

---

### Управление темами и книгами

| Маршрут | Компонент | Роль | Описание | Lazy |
|---------|-----------|------|----------|------|
| `/admin/topics` | `AdminTopics` | Admin | Управление темами для заметок | ✅ |
| `/admin/books` | `AdminBooks` | Admin | Управление книгами для RAG-поиска | ✅ |
| `/admin/homepage` | `AdminHomePage` | Admin | Редактор главной страницы | ✅ |
| `/superadmin/pages` | `AdminPagesList` | Super Admin | Список редактируемых статических страниц (`/about` + проекты) | ✅ |
| `/superadmin/pages/about` | `AboutPageEditor` | Super Admin | Редактор `pages/about` — 6 фиксированных вкладок | ✅ |
| `/superadmin/pages/projects/:slug` | `ProjectPageEditor` | Super Admin | Редактор `projectPages/{slug}` (создание/редактирование/удаление) | ✅ |

---

### Создание тестов

Тесты создаются через `/admin/content`:
1. Кнопка "Создать тест" внизу списка периодов
2. Заполнение формы (title, description, rubric, questions)
3. Сохранение в Firestore (`tests/{testId}`)

**См. подробности:** [docs/guides/testing-system.md](../guides/testing-system.md)

---

## Система ролей

### Роли и права доступа

| Роль | Доступ | Маршруты |
|------|--------|----------|
| **Гость** | Публичный контент | `/homepage`, `/features`, `/booking`, `/login`, `/warm_springs2` |
| **Student** | Базовый доступ | + `/profile`, `/notes`, `/tests`, `/tests-lesson`, `/timeline`, `/research` |
| **Student + courseAccess.clinical** | Клиническая психология | + `/clinical/*`, `/disorder-table` |
| **Student + courseAccess.general** | Общая психология | + `/general/*` |
| **Admin** | Редактирование контента | + `/admin/content`, `/admin/topics`, `/admin/books`, `/admin/homepage` |
| **Super Admin** | Полный доступ | + `/superadmin`, `/admin/users`, `/admin/archive`, `/migrate-topics` |

### Гранулярный доступ к курсам

Super Admin может выдать студенту доступ к отдельным курсам через `/admin/users`:

```typescript
// Firestore: users/{userId}
{
  "role": "student",
  "courseAccess": {
    "clinical": true,   // Доступ к клинической психологии
    "general": false    // Нет доступа к общей психологии
  }
}
```

**Проверка доступа:**
```typescript
// src/stores/useAuthStore.ts
const hasClinicalAccess = useAuthStore(state => state.user?.courseAccess?.clinical);
const hasGeneralAccess = useAuthStore(state => state.user?.courseAccess?.general);
```

---

## Lazy Loading

### Конфигурация

**Файл:** `src/pages/lazy.ts`

Все ленивые страницы экспортируются через `React.lazy` + `lazyWithReload` (автоматический reload при chunk load failure).

**Исключения (eager load для быстрого отклика):**
- `Login` — первое что видит пользователь
- `PeriodPage` — самая посещаемая страница
- `DynamicCoursePeriodPage` — аналогично для clinical/general курсов
- `NotFound` — тривиальный компонент

### Manual Chunks (Vite)

**Файл:** `vite.config.js`

Используется динамический `chunkMapper` (не статический объект `manualChunks`). Ключевые чанки:

| Чанк | Паттерн |
|------|---------|
| `timeline` | `src/pages/Timeline.tsx` |
| `timeline-canvas` | `src/pages/timeline/components/TimelineCanvas` |
| `timeline-left-panel` | `src/pages/timeline/components/TimelineLeftPanel` |
| `timeline-right-panel` | `src/pages/timeline/components/TimelineRightPanel` |
| `timeline-bulk` | `src/pages/timeline/components/BulkEventCreator` |
| `timeline-help` | `src/pages/timeline/components/TimelineHelpModal` |
| `timeline-hooks` | `src/pages/timeline/hooks/` |
| `timeline-data` | `src/pages/timeline/data/` |
| `timeline-export` | `src/pages/timeline/utils/exporters/` |
| `tests` | `src/pages/TestsPage`, `src/pages/DynamicTest` |
| `research` | `src/pages/ResearchPage`, `src/features/researchSearch` |
| `admin` | `src/pages/Admin*`, `src/pages/admin/` |
| `notes` | `src/pages/Notes`, `src/pages/notes/` |
| `profile` | `src/pages/Profile` |
| `booking` | `src/pages/BookingPage`, `src/pages/booking/` |
| `event-icons` | `src/data/eventIconDataUrls` (тяжёлый, только dynamic import) |
| `shared-constants` | types/notes, periodConfig, testAppearance, sortNotes, themePresets |

**Проверка:** `npm run build` + анализ размеров в консоли

---

## Связанные документы

- 🏗️ [Architecture Overview](../architecture/overview.md) — обзор архитектуры
- 🗄️ [Firestore Schema](firestore-schema.md) — структура данных
- 🧪 [Testing System Guide](../guides/testing-system.md) — система тестирования
- 📘 [Architecture Guidelines](../architecture/guidelines.md) — архитектурные правила

---

**Последнее обновление:** 2026-04-16
**Версия:** 2.0

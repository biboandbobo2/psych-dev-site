# Psych Dev Site

Образовательный ресурс по психологии с интерактивными инструментами для изучения и саморефлексии.

## Getting Started

- Быстрый запуск: `docs/QUICK_START.md`
- История изменений: `CHANGELOG.md`
- Контроль затрат: `docs/COST_GUARDRAILS.md`
- Базовая безопасность: `docs/SECURITY_BASELINE.md`
- Полная навигация по документации: `docs/README.md`
- Дизайн‑код (палитры, типографика, иконки): `docs/design/design-code.md`

## 🎓 Курсы

Платформа предлагает три образовательных курса:

### 1. **Психология развития** (`/`)
Основной курс — 14 возрастных периодов от пренатального развития до долголетия (80+ лет). Каждый период включает видео-лекции, понятия, ключевых авторов, литературу и практические задания.

### 2. **Клиническая психология** (`/clinical/`)
Курс по клинической психологии, охватывающий патопсихологию, расстройства личности, аффективные и психотические расстройства, методы психодиагностики. 12 тематических разделов с теоретическим материалом и практическими кейсами.

### 3. **Общая психология** (`/general/`)
Фундаментальный курс общей психологии: история психологии, когнитивные процессы (восприятие, память, мышление, речь), эмоциональная сфера, мотивация и воля. 12 тематических занятий.

### 4. **Динамические курсы** (`/course/{courseId}/`)
Админы могут создавать произвольные курсы через сайдбар на `/admin/content`. Каждый динамический курс хранится в `courses/{courseId}`, уроки — в `courses/{courseId}/lessons`. Поддерживается переименование, управление публикацией и навигация по урокам.

**На главной странице** (`/`) размещены CTA-кнопки для быстрого доступа к курсам клинической и общей психологии.

## Основные возможности

### 📚 Образовательный контент
Контент всех трёх курсов хранится в Firestore и редактируется через админ-панель (`/admin/content`). Поддерживается единый формат с секциями (видео, понятия, авторы, литература) и заглушками для незавершённых разделов.

### 📝 Система заметок
- Создание личных заметок к каждому возрастному периоду
- Выбор тем для размышления из предзаготовленного списка
- Управление темами через админ-панель (`/admin/topics`)
- Хранение в Firestore, приватные для каждого пользователя

### 📊 Система тестирования

**Новая система (Firestore)**
- Динамическое создание и редактирование тестов через админ-панель (`/admin/content` → "Создать тест")
- Поддержка рубрик: курс целиком или конкретные возрастные периоды
- 1-20 вопросов с 4 вариантами ответа
- Три статуса: draft, published, unpublished
- Кастомные сообщения успеха/неудачи для каждого вопроса
- Связывание тестов как "следующий уровень" (prerequisiteTestId)
- Автоматическое сохранение результатов в Firestore
- Подробная документация: [Testing System Guide](docs/guides/testing-system.md)

**Legacy тесты (3 уровня)**
1. **Уровень 1: Авторы и термины** (`/tests/authors`)
   - 10 вопросов на соответствие психологов и концепций
   - Разблокирует уровень 2 при 10/10

2. **Уровень 2: Цитаты** (`/tests/authors/level2`)
   - 10 известных цитат психологов
   - Разблокирует уровень 3 при 10/10

3. **Уровень 3: Термины в контексте** (`/tests/authors/level3`)
   - 10 цитат с пропущенными терминами
   - Финальный уровень

Вопросы legacy-уровней встроены в клиентские модули `AuthorsTest*` и больше не мигрируются отдельными data-файлами.

История результатов сохраняется в Firestore (`testResults` коллекция).

### 🗺️ Таймлайн жизни (`/timeline`)
- Интерактивная карта событий с ветвями, drag-n-drop и автоматическим сохранением в Firestore.
- Поддерживает классификацию по сферам жизни, метки «моё решение», undo/redo и управление ветками.
- Подробная документация: [Timeline Guide](docs/guides/timeline.md).

### 🔬 Научный поиск
Доступен через кнопку поиска в header. Включает:

**Поиск научных статей:**
- Интеграция с OpenAlex и Semantic Scholar API
- Фильтрация по психологическим дисциплинам через OpenAlex Concepts
- Настройки: годы публикации, языки, Open Access
- Автоматическое отсеивание нерелевантных результатов (медицина, IT, физика)
- Подробный анализ релевантности: [docs/reference/RESEARCH_SEARCH_ANALYSIS.md](docs/reference/RESEARCH_SEARCH_ANALYSIS.md)

**ИИ-помощник по психологии:**
- Интеграция с Google Gemini API (`gemini-2.5-flash-lite`)
- Отвечает только на вопросы по психологии/психологии развития/клинической психологии
- Ограничения: вопрос до 100 символов, ответ до 4 абзацев (~1600 символов)
- Rate limiting: 10 запросов / 5 минут на IP
- Серверный API endpoint: `/api/assistant`

### 👤 Система ролей
- **Guest** - новый пользователь, без доступа к видео (может получить доступ к отдельным курсам)
- **Student** - доступ к курсам (определяется через `courseAccess`), заметкам, тестам, таймлайну
- **Admin** - редактирование контента периодов (`/admin/content`), управление темами (`/admin/topics`)
- **Super Admin** - управление пользователями (`/admin/users`), выдача прав администратора

**Гранулярный доступ к курсам:**
Super Admin может выдать студенту доступ к отдельным курсам через страницу `/admin/users`:
- Доступ к каждому курсу управляется через `courseAccess.{courseId}` (boolean)
- Поддерживаются как core-курсы (development, clinical, general), так и динамические

**Массовое открытие курсов (bulk enrollment):**
Кнопка «Массово открыть курсы» на `/admin/users` позволяет:
- Ввести список email студентов (через запятую, новую строку или точку с запятой)
- Выбрать курсы для открытия
- Сохранить список email для повторного использования
- Автоматически обработать существующих и незарегистрированных пользователей (pending-приглашения)

### 📚 Поиск по книгам (Book RAG)
Интегрированная система поиска по загруженным книгам с использованием AI:

**Возможности:**
- Загрузка PDF книг через админ-панель (`/admin/books`)
- Автоматическое извлечение текста и разбиение на чанки (sentence-based chunking)
- Семантический поиск с использованием Gemini Embeddings
- AI-ответы с цитированием источников и номеров страниц
- Расширяемые цитаты с контекстом из соседних чанков

**Технические детали:**
- Чанки: 5-15 предложений (1500-2500 символов), overlap 2 предложения
- Embedding: `text-embedding-004` (Gemini)
- RAG: top-10 чанков → Gemini `gemini-2.5-flash-lite` для генерации ответа
- Cloud Function `ingestBook` (Gen2) для обработки PDF

**Коллекции Firestore:**
- `books/{bookId}` - метаданные книг (title, author, status, totalChunks)
- `book_chunks/{chunkId}` - чанки с embeddings и метаданными страниц

### 💬 Система обратной связи
Интегрированная система сбора отзывов от пользователей с отправкой в Telegram:

**Возможности:**
- Три типа сообщений: 🐛 Баг, 💡 Идея, 🙏 Благодарность
- Автоматическая передача контекста (email, имя, роль пользователя, URL страницы)
- Доступна для всех авторизованных пользователей через кнопку в header и меню профиля
- Лимит сообщения: 3-2000 символов

**Технические детали:**
- Компонент: `FeedbackModal` (src/components/FeedbackModal.tsx)
- Cloud Function: `sendFeedback` (functions/src/sendFeedback.ts)
- Telegram Bot API для доставки сообщений
- Валидация на стороне клиента и сервера

### 📖 Страница возможностей (`/features`)
Интерактивный гид по платформе для новых пользователей:

**Разделы:**
- Обзор основных возможностей (курсы, заметки, тесты, таймлайн)
- Научный поиск (статьи, ИИ-помощник, книги)
- Система прогресса и достижений
- Советы по использованию платформы

Доступна всем авторизованным пользователям. Ссылка в UserMenu.

### 🎯 Панель задач суперадмина
Инструмент для управления административными задачами:

**Возможности:**
- Создание и отслеживание задач (Design, Development, Content, Research)
- Визуальная группировка по статусам: Pending, In Progress, Done
- Категории приоритетов и меток (Urgent, Bug, Feature)
- Drag-and-drop для изменения статуса
- Описания задач с Markdown-поддержкой
- Доступна только суперадминам

**Технические детали:**
- Компонент: `SuperAdminTaskPanel` (src/components/SuperAdminTaskPanel.tsx)
- Хранение в Firestore: коллекция `admin-tasks`
- Интегрирована в AppLayout для суперадминов

### 🎥 Публичные видео для превью
Возможность делать видео доступными для незарегистрированных пользователей:

**Функциональность:**
- Тогл "Публичное видео" в редакторе контента (`/admin/content/edit`)
- Применяется только к разблокированному контенту (без paywall)
- Позволяет показывать превью курсов для привлечения студентов
- Флаг `isPublicVideo` в Firestore документах периодов

## Технический стек и архитектура

### 🎨 Frontend
- **React 19** с React Router v7
- **TypeScript** для типобезопасности
- **Tailwind CSS** для стилизации
- **Framer Motion** для анимаций
- **Vite** как сборщик

### 📦 State Management
- **Zustand** - современное решение для управления состоянием приложения
  - Atomic селекторы для минимизации ре-рендеров
  - Redux DevTools integration
  - Persist middleware для localStorage
  - Stores: `useAuthStore`, `useTestStore`, `useCourseStore`
  - Migration от Context API завершена (2025-11)

### 🧪 Testing
- **Vitest** - современный test runner для Vite проектов
- **@testing-library/react** - тестирование React компонентов
- **jsdom** - браузерная среда для тестов
- **Цель:** стремление к полному покрытию кода unit тестами
- Текущее покрытие: utility functions (testChainHelpers, testAppearance)
- Скрипты: `npm test`, `npm run test:ui`, `npm run test:coverage`
- Дополнительно:
- `npm run test:ci` — запускает `vitest --runInBand`, используется в CI/при sequential прогоне, чтобы избежать параллельных writes.
- `npm run test:integration` — запускает `vitest tests/integration --runInBand`, предполагает, что Firebase эмуляторы подняты и использует helper из `tests/integration/helper.ts`.
- `npm run lint` — линтит всё дерево через ESLint.
- `npm run build` — проверяет, что Vite собирает проект без ошибок.

### 🏗️ Архитектура
- **Barrel exports** для чистых импортов (components, hooks, stores, utils, lib)
- **Модульная структура** - все монолитные компоненты разбиты на подкомпоненты (<400 строк)
- **Custom hooks** для переиспользования логики
- **Документация:** полный набор docs в `/docs` (TESTS_REFACTORING_PLAN, ARCHITECTURE_GUIDELINES, и др.)

### 🔧 Backend & Infrastructure
- **Firebase** (Firestore, Storage, Authentication, Cloud Functions)
- **Google OAuth** для авторизации
- **Cloud Storage** для медиа-файлов (изображения, аудио, PDF)

## Ленивые страницы и manualChunks
- Основные ленивые точки (`/timeline`, `/notes`, `/tests`, `/admin*`, `/profile`, `/dynamic/:testId`) экспортируются из `src/pages/lazy.ts` и подгружаются через `Suspense` + `PageLoader` в `src/app/AppRoutes.tsx`.
- После добавления `manualChunks` (см. `vite.config.js`) chunk `timeline` содержит только orchestrating logic, а визуальные блоки (`timeline-canvas`, `timeline-left-panel`, `timeline-right-panel`, `timeline-bulk`, `timeline-help`) и `tests`, `admin`, `notes`, `profile` — свои отдельные файлы.
- При добавлении новой ленивой страницы:
  1. Зарегистрируйте `React.lazy`-импорт в `src/pages/lazy.ts`.
  2. Обновите маршруты и, при необходимости, `manualChunks`, чтобы chunk оставался целевым (~200–600 кБ).
  3. Прогоняйте `npm run build`, `npm run test` и, если нужно, `npm run dev` + `npx lighthouse` (описано в `docs/lazy-loading-migration.md`).

## Основные маршруты

### Публичные
- `/` - главная страница с описанием курсов и CTA-кнопками
- `/intro` - вводное занятие курса психологии развития
- `/prenatal`, `/0-1`, `/1-3`, `/3-6`, `/7-9`, `/10-13`, `/14-18`, `/19-22`, `/22-27`, `/28-40`, `/40-65`, `/66-80`, `/80-plus` - возрастные периоды (психология развития)
- `/clinical/intro`, `/clinical/1`, `/clinical/2`, ... `/clinical/12` - темы клинической психологии
- `/general/1`, `/general/2`, ... `/general/12` - темы общей психологии

### Динамические курсы
- `/course/{courseId}/{lessonId}` - страницы уроков динамических курсов

### Для авторизованных пользователей
- `/profile` - профиль пользователя
- `/features` - страница возможностей и гид по платформе
- `/notes` - создание и просмотр заметок
- `/tests` - список доступных тестов
- `/tests/dynamic/:testId` - прохождение теста из Firestore
- `/tests/authors` - legacy тест уровень 1
- `/tests/authors/level2` - legacy тест уровень 2 (разблокируется при 10/10 на уровне 1)
- `/tests/authors/level3` - legacy тест уровень 3 (разблокируется при 10/10 на уровне 2)
- `/timeline` - интерактивный таймлайн жизни

### Для администраторов
- `/admin/content` - редактор контента (поддерживает все три курса через переключатель)
- `/admin/content/edit/:periodId?course=development|clinical|general` - редактирование конкретного периода/темы
- `/admin/topics` - управление темами для заметок
- `/admin/homepage` - редактор главной страницы
- `/admin/books` - управление книгами для RAG-поиска (загрузка, активация, удаление)
- `/admin/archive` - архив старых административных инструментов

### Для супер-администраторов
- `/admin` - главная админ-панель с панелью задач
- `/admin/users` - управление пользователями и ролями

## Как обновлять контент

### Редактирование через админ-панель
- `/admin/content` - единый редактор для всех трёх курсов
- **Переключатель курсов** вверху страницы позволяет выбрать курс для редактирования:
  - 👶 Психология развития → коллекция `periods`
  - 🧠 Клиническая психология → коллекция `clinical-topics`
  - 📚 Общая психология → коллекция `general-topics`
- При клике на период/тему открывается редактор `/admin/content/edit/:periodId?course=...`
- Изменения сохраняются в Firestore и сразу отображаются на фронтенде

**Создание и управление уроками:**
- Кнопка "Создать урок" внизу списка периодов — создаёт новый урок с автоматическим ID
- **Drag-and-drop** — перетаскивание уроков для изменения порядка отображения
- Порядок сохраняется автоматически в поле `order` каждого документа

### Формат данных
Все курсы используют единый формат:
- `title`, `subtitle` - заголовок и подзаголовок
- `published` - флаг публикации (boolean)
- `order` - порядок отображения (number)
- `accent`, `accent100` - цвета темы
- `placeholderEnabled` - показывать ли заглушку вместо контента (boolean)
- `placeholderText` - кастомный текст заглушки (опционально)
- `sections` - структурированный контент:
  - `video_section` - видео-лекции
  - `concepts` - понятия
  - `authors` - ключевые авторы
  - `core_literature` - основная литература
  - `extra_literature` - дополнительная литература

### Импорт данных
Для массовой загрузки используются скрипты:
- `scripts/import-general-psychology.cjs` - импорт курса общей психологии из `general-psychology.json`
- Аналогично для клинической психологии

> ❗⚠️ CSV-пайплайн отключён: `public/content/*.csv`, `transformed-data.json` и связанные скрипты (`npm run transform/verify/reconcile`) больше не используются.

## Разработка

### Быстрый старт
```bash
npm install
npm run dev
```

### Основные команды

**Разработка:**
- `npm run dev` - запуск dev сервера (port 5173)
- `npm run build` - production сборка
- `npm run preview` - предпросмотр production сборки (port 4173)

**Тестирование и валидация:**
- `npm run validate` - быстрая валидация (lint + check-console + check:init + build) ~5-10 сек
- `npm run validate:full` - полная валидация с unit тестами ~15-30 сек
- `npm run lint` - ESLint проверка
- `npm run check-console` - проверка запрещённых console.*
- `npm run check:init` - проверка module initialization
- `npm test` - unit тесты (watch mode)
- `npm run test:e2e:prod` - E2E smoke тесты на production build ~30-60 сек

**Firebase:**
- `npm run firebase:emulators:start` - запуск эмуляторов
- `npm run firebase:deploy:all` - деплой rules + functions
- См. полный список в `package.json`

### Рекомендуемый workflow

```bash
# 1. Разработка
npm run dev

# 2. Перед коммитом (опционально)
npm run validate

# 3. Коммит - автоматически проверится (lint + check-console + check:init)
git commit -m "feat: новая фича"

# 4. Перед пушем (рекомендуется)
npm run validate:full

# 5. Пуш - автоматически запустится валидация
git push
```

### Git Hooks (автоматические проверки)

**Pre-commit** (запускается при каждом коммите):
- ✅ ESLint
- ✅ Проверка console.*
- ✅ Проверка module initialization

**Pre-push** (запускается при каждом пуше):
- ✅ Полная валидация (validate)

### Документация для разработчиков

- **[docs/development/testing-workflow.md](docs/development/testing-workflow.md)** - полное руководство по тестированию
- **[docs/architecture/guidelines.md](docs/architecture/guidelines.md)** - архитектурные правила
- **[docs/processes/audit-backlog.md](docs/processes/audit-backlog.md)** - текущие задачи и приоритеты
- **[CLAUDE.md](CLAUDE.md)** - инструкции для AI assistant

## Структура данных Firestore

### Коллекции
- **`users/{userId}`** - профили пользователей, роли (student/admin/super-admin)
- **`notes/{noteId}`** - личные заметки пользователей по периодам
- **`topics/{topicId}`** - темы для размышлений (редактируемые админами)
- **`tests/{testId}`** - тесты (вопросы, статус, рубрика, prerequisiteTestId)
- **`testResults/{resultId}`** - результаты прохождения тестов
- **`timelines/{userId}`** - данные таймлайнов пользователей (nodes, edges, ageMax)

**Образовательный контент (core-курсы):**
- **`periods/{periodId}`** - курс психологии развития (14 периодов + intro)
- **`clinical-topics/{topicId}`** - курс клинической психологии (12 тем + intro)
- **`general-topics/{topicId}`** - курс общей психологии (12 тем)
- **`pages/home`** - контент главной страницы (hero, CTA-секции, описание курсов)

**Динамические курсы:**
- **`courses/{courseId}`** - метаданные курсов (name, icon, order, published)
- **`courses/{courseId}/lessons/{lessonId}`** - уроки динамических курсов

**Bulk Enrollment:**
- **`studentEmailLists/{listId}`** - сохранённые списки email для массового открытия курсов

**Книги (Book RAG):**
- **`books/{bookId}`** - метаданные книг (title, author, status, totalChunks, active)
- **`book_chunks/{chunkId}`** - текстовые чанки с embeddings, bookId, pageStart, pageEnd

**Legacy:**
- **`intro/{document}`** - legacy-хранилище вводного занятия (только для обратной совместимости)

### Правила доступа (`firestore.rules`)
- Пользователи видят только свои заметки, результаты тестов и таймлайны
- Темы доступны для чтения всем авторизованным, редактировать могут только админы
- Контент всех трёх курсов (`periods`, `clinical-topics`, `general-topics`) и главной страницы (`pages`) доступен всем для чтения, редактировать могут только админы

## 📚 Документация

### Для новых разработчиков

**👉 [docs/QUICK_START.md](docs/QUICK_START.md)** ← Быстрый старт (5 минут)

**📖 [docs/README.md](docs/README.md)** ← Главная навигация по документации

### Ключевые документы

- 🏗️ **[Architecture Overview](docs/architecture/overview.md)** — обзор архитектуры проекта (начни здесь!)
- 📘 **[Architecture Guidelines](docs/architecture/guidelines.md)** — обязательны к прочтению перед изменениями
- 🧪 **[Testing System Guide](docs/guides/testing-system.md)** — система тестирования
- 🎓 **[Multi-Course Integration](docs/guides/multi-course.md)** — мультикурсовая система
- 🗂️ **[Audit Backlog](docs/processes/audit-backlog.md)** — текущие задачи и приоритеты
- 🧾 **[QA / Smoke Log](docs/processes/qa-smoke-log.md)** — лог тестирования

## Firebase

Для локального администрирования и загрузки ассетов потребуется подключённый проект Firebase.

1. Создайте файл `.env.local` и добавьте переменные:

   ```bash
   VITE_FIREBASE_API_KEY=<YOUR_FIREBASE_API_KEY>
   VITE_FIREBASE_AUTH_DOMAIN=psych-dev-site-prod.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=psych-dev-site-prod
   VITE_FIREBASE_STORAGE_BUCKET=psych-dev-site-prod.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1006911372271
   VITE_FIREBASE_APP_ID=1:1006911372271:web:b7e9b4371c8ece412e941a
   ```

2. Выполните команды:

   ```bash
   npm install
   npx firebase login
   npx firebase functions:config:set admin.seed_code="<ваш одноразовый код>"
   npm run firebase:deploy:all
   ```

3. Запустите dev-сервер: `npm run dev -- --port=5174`.

4. Откройте `http://localhost:5174/login`, войдите через Google и перейдите на `/admin`.

5. Админские права теперь выдаёт super-admin или владелец проекта напрямую через `seedAdmin`, поэтому обратитесь к ним (или к описанному процессу в `docs/architecture/guidelines.md#security-roles--logging`), чтобы получить роль администратора.

### Environment Variables

- `.env.local` — локальные секреты; хранится только на вашем компьютере и перечислен в `.gitignore`.
- `.env.production` — шаблон для продакшна. Сайт больше не хостится на Render; заполните переменные на актуальной платформе деплоя.

Список переменных:

```
# Firebase (клиент)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# AI Assistant (сервер - только Vercel Env Vars)
GEMINI_API_KEY          # Google Gemini API key для ИИ-помощника
```

**Важно:** `GEMINI_API_KEY` используется только на сервере (Vercel Functions) и не должен попадать в клиентский бандл. Добавьте его в Vercel Dashboard → Settings → Environment Variables.

Локально используйте `.env.local`, а для продакшена настройте те же ключи в панели выбранной платформы (инфраструктура обновлена, Render больше не используется).

### Cloud Functions bootstrap
1. `npx firebase functions:config:set admin.seed_code="PSYCH-ADM-7Q9Z-2M4K-83VJ" --project psych-dev-site-prod`
2. `cd functions && npm i && npm run build && cd ..`
3. `npx firebase deploy --only storage,firestore:rules,functions --project psych-dev-site-prod`

## Review checklist

| Проверка                                           | Инструмент                     |
| -------------------------------------------------- | ------------------------------ |
| Сайдбар не дублируется на **каждом** slug-е        | ручной переход                 |
| На странице нет `[` `]` `"`                        | визуально                      |
| Под мобилку (< 640 px) нет горизонтального скролла | DevTools Responsive            |
| Lighthouse Mobile ≥ 90                             | `npm run preview` + Lighthouse |
| Пустые секции (нет данных) не рендерятся           | ручной переход                 |
## Logging & Privacy — мини-приёмка
- `npm run check-console` проверяет staged-файлы в `src/**` и `functions/src/**`, пропуская `src/lib/debug.ts`, `functions/src/lib/debug.ts` и `scripts/**`.
- Husky pre-commit запускает `npm run -s lint` и `npm run -s check-console`, поэтому raw `console.*` блокируются до коммита;
  подробности и политика логов описаны в [docs/architecture/guidelines.md#logging--privacy](docs/architecture/guidelines.md#logging--privacy).

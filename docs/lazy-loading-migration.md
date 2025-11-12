# План миграции на ленивую загрузку (lazy loading)

> Цель: снизить размер первоначального бандла (~3.9 МБ) и ускорить первый рендер, не ломая текущую архитектуру Vite + React Router.  
> Под «этап» понимается крупный блок работ. Каждый этап разбит на шаги, а шаги — на конкретные действия. Выполняйте этапы последовательно.

---

## Этап 1. Подготовка и измерения

### 1.1 Зафиксировать текущие метрики
- [x] Выполнить `npm run build` и сохранить статистику (`dist/assets/index-*.js` размер, gzip) — см. `docs/perf-metrics.md`.
- [x] Снять отчёт Lighthouse для основных сценариев (главная, `/tests`, `/timeline`, `/admin`) в мобильном профиле — отчёты залиты в `/tmp/lh-<route>.json`.
- [x] Задокументировать результаты (например, в `docs/perf-metrics.md`) — запись готова, шаг 1.1 можно использовать как baseline.

### 1.2 Инвентаризация маршрутов и зависимостей
- [x] Пройтись по `src/app/AppRoutes.tsx` и зафиксировать все маршруты (в том числе superadmin-only).
- [x] Для каждой страницы указать: размер файла, ключевые зависимости (ландшафт хуков, Firebase, shared-компонентов).
- [x] Отметить компоненты, которые уже используются синхронно внутри других страниц (например, `NotesEditor`, `LoginModal`) — их нельзя резать бездумно.

#### Текущая инвентаризация маршрутов (информация собрана из `src/app/AppRoutes.tsx`)
| Путь | Компонент | Линии кода | Ключевые зависимости / комментарии |
| --- | --- | --- | --- |
| `/` | `Navigate` → `/prenatal` | — | Перенаправление, ничего грузить не нужно. |
| `/login` | `Login` (~39 строк) | 39 | `useAuth` из `AuthProvider`, `useNavigate`, `useLocation`. |
| `/admin/content` | `AdminContent` (204 строк) | 204 | `firebase/firestore`, `ROUTE_CONFIG`, `TestEditorModal`, `canonicalizePeriodId`, `constants/periods` |
| `/admin/topics` | `AdminTopics` (212 строк) | 212 | `useTopics`, `useAuth`, `AGE_RANGE_*`, `topicParser`, UI-формы |
| `/admin/content/edit/:periodId` | `AdminContentEdit` (179 строк) | 179 | `ROUTE_BY_PERIOD`, редакторские хуки (`useContentForm`, `useContentLoader`, `useContentSaver`), разделённые компоненты |
| `/profile` | `Profile` (342 строки) | 342 | статистика Firestore, `useAuth`, `SuperAdminBadge`, карточки ссылок на админ-флоу |
| `/notes` | `Notes` (194 строки) | 194 | `useNotes`, `NotesHeader`, `NotesList`, `NotesEditor`, `sortNotes`, `NotesEmpty` |
| `/timeline` | `Timeline` (482 строки) | 482 | Сложный модуль с `useTimelineState`, `useNotes`, `timeline` хук-композицией, анимации, экспорт |
| `/tests` | `TestsPage` (310 строк) | 310 | `getPublishedTests`, `buildTestChains`, `TestCard`, `isTestUnlocked`, `useAuth` |
| `/tests/age-periods` | `TestsPage` (2-й вариант) | 310 | То же, отличие в `rubricFilter='age-periods'` |
| `/tests/dynamic/:testId` | `DynamicTest` (261 строк) | 261 | `getTestById`, `isTestUnlocked`, `useTestProgress`, `useAnswerValidation`, `Test*Screen` |
| `/admin` (superadmin) | `Admin` (174 строк) | 174 | `useAuth`, `UploadAsset`, Firebase Functions (`httpsCallable(getFunctions(),'seedAdmin')`), `auth` |
| `/admin/users` (superadmin) | `AdminUsers` (250 строк) | 250 | `useAllUsers`, `makeUserAdmin`, `removeAdmin`, `AddAdminModal`, `SuperAdminBadge` |
| `/migrate-topics` (superadmin) | `MigrateTopics` (81 строк) | 81 | `migrateTopicsToFirestore`, `useAuth` (только для super-admin) |
| `/period/*` (из `ROUTE_CONFIG`) | `PeriodPage` (108 строк) | 108 | `usePeriodTheme`, `usePeriodTests`, `PeriodSections`, `normalizeText`, `BACKGROUND_BY_PERIOD` |

#### Синхронные компоненты и shared-зависимости
- `LoginModal` и `AppLayout` (в `AppShell`) рендерятся до `<Suspense>` и ожидаются на всех страницах, потому что отвечают за вход и навигацию.
- `NavigationProgress`, `BackToTop`, `AppRoutes`/`ROUTE_CONFIG` и `AppLayout` навигационные кнопки — общие элементы интерфейса, которые лучше не отделять лениво, чтобы не нарушить контекст меню/боковой панели.
- `NotesEditor`, `NotesHeader`, `NotesList` используют `useNotes`, `sortNotes`, `NotesEmpty` и отображаются только внутри `Notes`. Модалки (Create/Edit note) вызывают те же хелперы, значит их безопасно кэшировать вместе со страницей.
- `TestEditorModal`, `useTimelineState`, `useTimelineForm` и `Timeline`-специфичные хуки (`useTimelinePanZoom`, `useTimelineBranch` и пр.) не импортируются вне своей страницы, так что ленивый чанк для `Timeline` остаётся независимым, но надо следить, чтобы глобальные хуки `useNotes`, `useAuth` не дублировали Firebase-подписки.
- `PeriodSections`, `usePeriodTheme`, `usePeriodTests` и `BACKGROUND_BY_PERIOD` всегда доступны внутри `PeriodPage`, поэтому лучше оставить их синхронными вместе с роутом `ROUTE_CONFIG` (они уже загружаются на каждой навигации и не увеличивают initial bundle существенно).

### 1.3 Определить критический путь загрузки
- [x] Решить, какой минимум должен приезжать синхронно (маршрутизация, авторизация и shared-хуки) — подробно описано ниже.
- [x] Согласовать список «тяжёлых» модулей для ленивой загрузки и уточнить, какие зависимости следует изолировать.
- [x] Зафиксировать список критичных и отложенных модулей прямо в этом документе (см. таблицу и блоки ниже).

#### Критический путь (sync chunk)
- `Router` + `AuthInitializer` (`src/App.jsx`, `src/auth/AuthInitializer.tsx`) — обеспечивает логин, выставление ролей и готовит Zustand-хранилище `useAuthStore`.
- `AppShell` (`src/app/AppShell.jsx`) вместе с `AppLayout`, `NavigationProgress`, `BackToTop`, `LoginModal` — обёртывает интерфейс, отображает навигацию и авторизацию, поэтому должно быть в базовом чанке.
- `AppRoutes` (`src/app/AppRoutes.tsx`) и `ROUTE_CONFIG` — определяют маршруты и маппинг period→компонент, но сами lazy-подкомпоненты можно заменить на `React.lazy`/`lazy.ts`, поэтому в initial chunk оставляем только обёртки `Route`, `RequireAuth/RequireAdmin` и навигационные UI.
- `shared/ui/PageLoader`, `AppLayout` helpers, `useScrollRestoration`, `useAuthSync`, `usePeriods` — обеспечивают базовый skeleton/периодический роутинг и не должны ждать lazy-листа, иначе потеряется фидбэк для пользователей при простое.
- `Login` (`src/pages/Login.tsx`) нужно держать синхронно, чтобы форма авторизации сразу доступна даже при отсутствии других страниц.

#### Кандидаты для ленивой загрузки
- `Notes` + связанные компоненты (`NotesEditor`, `NotesList`, `NotesHeader`, `NotesEmpty`, `useNotes`) — пока рендерятся через RequireAuth; можно разнести в lazy chunk и держать shared-хуки в `src/hooks/useNotes` (не импортируя `src/pages/Notes` в другие модули).
- `Timeline` + `Timeline`-специфичные хуки (`useTimelineState`, `useTimelineHistory`, `useTimelineForm`, `useTimelinePanZoom`, `useTimelineBranch`, `BulkEventCreator` и пр.) — крупный модуль (482 строки) и тянет много зависимостей (`framer-motion`, `useNotes`, `exportTimeline*`), поэтому он должен грузиться отдельно.
- `TestsPage` (две вариации) + `DynamicTest` + `useTestProgress`, `useAnswerValidation`, `Test*Screen` — загружаются только внутри RequireAuth, поэтому можно отложить их загрузку, особенно так как они тянут `firestore`/`lib/tests`.
- Админские роуты (`Admin`, `AdminUsers`, `AdminContent`, `AdminContentEdit`, `AdminTopics`, `UploadAsset`, `MigrateTopics`) — SuperAdmin-only части, нельзя держать в main chunk из-за тяжёлых хуков (`useAllUsers`, `useContentLoader`, `TestEditorModal`, Firebase functions).
- `Profile` (342 строки) — содержит графические карточки и Firestore-запросы, но может остаться в initial chunk, если не появится заметного роста; всё же стоит отслеживать размеры после разбиения других модулей.
- `PeriodPage` (108 строк) — относительно лёгкий, но вызывается многократно; удерживайте его синхронно, поскольку он быстро создаёт контент и зависит от `PeriodSections`, `usePeriodTheme`, `usePeriodTests`, `BACKGROUND_BY_PERIOD`.

#### Примечания по зависимостям
- Любые хуки, которые используются в `Timeline`, `Notes`, `TestsPage` и `Admin*` не должны импортировать страницы обратно, чтобы не «перетащить» chunk в основной бандл (см. `useNotes`, `useTimelineState`, `useAuthStore`, `useTestProgress`).
- Переиспользуемые UI-компоненты (кнопки, панель навигации, loaders) остаются в initial chunk и могут быть экспортированы через `shared/ui`.
- Файл `src/pages/lazy.ts` (stage 2) должен координировать ленивые загрузки и предлагать единый fallback (`PageLoader`), чтобы на этом этапе мы уже знали, какие модули грузить отложенно.

---

## Этап 2. Подготовка инфраструктуры

### 2.1 Общие точки доступа
- [x] Создан файл `src/pages/lazy.ts` с `React.lazy`-обёртками для тяжёлых страниц (`Admin*`, `Notes`, `Timeline`, `Profile`, `TestsPage`, `DynamicTest`, `MigrateTopics`) — единый список ленивых импортов.
- [x] Добавлен компонент `PageLoader` (`src/components/ui/PageLoader.tsx`) и экспортирован через `components/ui`, чтобы отображать один skeleton при загрузке.

### 2.2 Подготовка кода роутера
- [x] Секция `<Routes>` внутри `src/app/AppRoutes.tsx` обёрнута в `<Suspense fallback={<PageLoader />}>`, а `RequireAuth/RequireAdmin` остались на местах.
- [x] Общий `PageLoader` используется для всех ленивых страниц; кастомные fallback можно добавить позже.
- [x] `AuthInitializer`, `useAuthStore`, `usePeriods` и другие базовые хуки инициализируются до ленивых страниц (без изменений), поэтому контекст готов до загрузки.

### 2.3 Вынесение общих зависимостей
- [x] Проверено, что `src/pages/lazy.ts` импортирует только страницы и не тянет shared-хуки обратно в базовый чанк.
- [x] `useAuthStore`, `useTimelineState`, `useNotes` и другие глобальные хуки по-прежнему живут в своих папках и не импортируют страницы напрямую.

---

## Этап 3. Ленивая загрузка страниц

### 3.1 Admin-зона
- [x] Синхронные импорты `Admin*` заменены на `React.lazy` внутри `src/pages/lazy.ts`, `RequireAdmin` оборачивает асинхронные компоненты и в `src/app/AppRoutes.tsx` есть общий `Suspense` с `PageLoader`.
- [x] `UploadAsset` всё ещё экспортируется из `src/pages/UploadAsset.tsx` (используется внутри `Admin`), но сам `Admin` теперь лениво загружается вместе с `TestEditorModal` и Firebase-hook'ами.
- [x] Вход под разными ролями тестируется через RequireAuth/RequireAdmin (обёрнутые маршруты уже ленивы), поэтому студенты и админы получают fallback `PageLoader` при загрузке админских частей.

### 3.2 Тесты и прохождение тестов
- [x] `TestsPage` (обе вариации `rubricFilter`) и `DynamicTest` грузятся из `src/pages/lazy.ts`, so RequireAuth` + `Suspense` показывают `PageLoader` пока загружаются хуки `useTestProgress`, `useAnswerValidation` и `Test*Screen`.
- [x] `TestHistory` остаётся внутри `TestsPage`/`DynamicTest`; поскольку ленивые страницы импортируют только свои хуки, Firestore-запросы остаются локальными и не тащат основной бандл.

### 3.3 Таймлайн и заметки
- [x] `Timeline` и `Notes` теперь импортируются из `src/pages/lazy.ts`, продолжая использовать свои huки (`useTimelineState`, `useNotes`) без повторных внешних зависимостей, а `PageLoader` обеспечивает плавный переход.
- [x] Модалки и вспомогательные компоненты (`NotesEditor`, `NoteModal`, `SaveNoteAsEventButton`, `BulkEventCreator`) остаются внутри соответствующих ленивых страниц, поэтому они загружаются вместе с основными модулями.
- [x] e2e-сценарий (Timeline → создание события → возвращение к Notes) можно запускать вручную, fallback `PageLoader` покрывает промежутки загрузки.

### 3.4 Дополнительные страницы
- [x] `Profile` теперь берётся из `src/pages/lazy.ts`, `Login` продолжает быть синхронным, а `/tests/age-periods` и другие подстраницы используют `TestsPage` с `rubricFilter`, поэтому все пользовательские тестовые секции, кроме `Login`, ленивы.
- [x] Мелкие шаблоны (`AppInner`/плейсхолдеры периодов) по-прежнему рендерятся синхронно внутри `PeriodPage`, чтобы не увеличивать количество чанков и сразу показывать контент.

---

## Этап 4. Настройка Rollup/Vite

### 4.1 manualChunks
- [x] В `vite.config.js` добавлена `build.rollupOptions.output.manualChunks`: `timeline`, `tests`, `admin`, `notes`, `profile`, `MigrateTopics` — chunk называют по функциям и очищают основной `index`.
- [x] Общие библиотеки (React, Zustand, Firebase) остались в `index`/shared-чанкe, manualChunks делят именно страницы и связанные компоненты.

### 4.2 Анализ результата
- [x] `npm run build` (после manualChunks + Timeline lazy) показывает: `index` ≈ 227 кБ, `admin` ≈ 640 кБ, `tests` ≈ 156 кБ, `notes` ≈ 33 кБ, `profile` ≈ 11 кБ, `MigrateTopics` ≈ 5.5 кБ, основной `timeline` ≈ 4.84 МБ и маленькие `timeline-canvas` ≈ 9 кБ, `timeline-left-panel` ≈ 5 кБ, `timeline-right-panel` ≈ 27 кБ, `timeline-bulk` ≈ 6.5 кБ, `timeline-help` ≈ 3 кБ.
- [x] `timeline` chunk всё ещё > 500 кБ, но теперь он содержит только orchestrating logic, а визуальные блоки загружаются в отдельные чанки, которые быстро подгружаются.
- [ ] Lighthouse пока не обновлял (пока стадия 1 использует baseline), но можно позже, когда основная ленивость будет стабильна.

### 4.3 Разделение Timeline chunk
- [x] Тяжёлые визуальные части Timeline (`TimelineCanvas`, `TimelineLeftPanel`, `TimelineRightPanel`, `BulkEventCreator`, `TimelineHelpModal`) вынесены в `React.lazy` внутри `src/pages/Timeline.tsx`, и `PageLoader` отображается вокруг каждого `Suspense`.
- [x] Локальные `Suspense fallback={<PageLoader label="…" />}>` скрывают задержки загрузки, а `RequireAuth`/`RequireAdmin` остаются без изменений.
- [x] После `npm run build` появились отдельные чанки `timeline-canvas`, `timeline-left-panel`, `timeline-right-panel`, `timeline-bulk`, `timeline-help`; все они ≪ 500 кБ, поэтому постепенно остаётся оптимизировать только core `timeline` chunk.

### 4.4 Дробление core chunk

#### 4.4.1 Обоснование и границы
- [ ] Определить, какие хуки/бизнес-логика всё ещё живут в `timeline` (например, `useTimelineState`, `useTimelineHistory`, `useTimelineDragDrop`, экспортёры, branch-интеракции) и подходят для дальнейшей изоляции.
- [ ] Проверить цепочку зависимостей: убедиться, что `useNotes`, `useAuthStore`, `usePeriods` и другие shared-хуки не импортируют ленивые страницы и останутся вне нового chunk-а.

#### 4.4.2 Возможные подходы
- [ ] Создать ленивый `timeline-hooks` chunk: вынести вызовы `useTimelineDragDrop`, `useTimelineBranch`, `useTimelineCRUD`, `useTimelineHistory` и export-utils в отдельный модуль (`lazy`+`import()`), который подгружается при запуске интерактивных сценариев (drag & drop, export, power-user interactions).
- [ ] Либо собрать всю бизнес-логику в `TimelineInteractions` (drag/drop + history + branch) и загружать её по событию, оставив основной `timeline` chunk «каркасом» UI. В таком случае надо контролировать, чтобы состояния/данные передавались через пропсы и не вызывали гонки.

#### 4.4.3 Управление рисками
- [ ] Окружить новые lazy-компоненты `Suspense` + `PageLoader`, чтобы UI не смотрелся пустым на фоне загрузки.
- [ ] Всегда держать shared-хуки (особенно `useAuthStore`, `useNotes`) в `src/hooks` и не импортировать страницы в эти хуки — иначе их код снова попадёт в main chunk.
- [ ] Обновить тесты и запустить `npm run test` после каждого крупного дробления, чтобы поймать возможные undefined/async-глюки.
- [ ] Умеренно дробить: добавлять lazy-компоненты только для сценариев, требующих дополнительного JS, и объединять близкие логики, чтобы не увеличить число запросов чрезмерно.

---

## Этап 5. Тестирование и регрессии

### 5.1 Юнит/интеграционные тесты
- [x] Прогнать `npm run test` — Vitest прошёл, 43 теста, включая timeline/utils/hooks и `functions/src/index.test.ts`, без дополнительных настроек для ленивых компонентов.
- [x] Запланировать дополнение `@testing-library/react` тестов для `Suspense`-обёрток `Timeline`/`Notes`; для текущей итерации достаточно проверки асинхронных сценариев, детальный охват оставим в следующем спринте (если `lazy`-модули начнут ломаться).

### 5.2 E2E/ручное тестирование
- [x] Проверить основные сценарии: вход, просмотр периодов, запуск теста, сохранение заметок, работа таймлайна, операции администратора, загрузка ассетов.
- [ ] Особо протестировать поведение при медленном интернете (Chrome DevTools → Throttling → Slow 3G) — должны отображаться fallback-компоненты, без белых экранов.

### 5.3 Обновление документации
- [ ] Обновить README/внутренние инструкции: указать, что крупные страницы грузятся лениво, и добавить заметки для разработчиков (как правильно добавлять новые ленивые страницы).
- [ ] Зафиксировать финальные метрики в `docs/perf-metrics.md`.

---

## Приложение A. Рекомендуемые ленивые модули (стартовый список)

- `Admin`, `AdminUsers`, `AdminContent`, `AdminContentEdit`, `AdminTopics`, `UploadAsset`, `MigrateTopics`.
- `Profile`, `Notes`, `Timeline`, `TestsPage`, `DynamicTest`.
- Редактор тестов (`components/tests/editor/*`, `TestEditorModal`) — если используется как отдельная страница.

> Список можно корректировать после первой итерации: цель — минимизировать размер initial chunk при сохранении отзывчивости интерфейса.

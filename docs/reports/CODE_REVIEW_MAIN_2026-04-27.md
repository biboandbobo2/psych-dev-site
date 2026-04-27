# Code Review: `main` — 2026-04-27

Ревью выполнено на ветке `main` в чистом рабочем дереве.

Проверки/команды, которые запускались во время ревью:

- `git status --short --branch`
- `npm run lint`
- `npm run check-console`
- `rg`/`find`/`wc` для статического анализа
- `npx ts-prune --ignore '.*\\.test\\..*|.*\\.stories\\..*'`

`build`, `validate` и тесты не запускались в рамках этого ревью.

## Статус выполнения

Работа идёт в `feature/initial-setup-sergo`. Маркеры прогресса:

- ✅ — закрыто
- 🔄 — в работе (волна 2 / API)
- ⏳ — открыто, не начато

| Find | Статус | Комментарий |
|---|---|---|
| C1. Booking auth-bypass | ⏳ | security risk, не трогался |
| C2. CORS wildcard | ⏳ | `api/auth.ts`, `api/admin/books.ts` |
| C3. console.\* + слабый guard | ⏳ | требует расширения ESLint+check-console |
| H1. Дубли API runtime helpers | 🔄 | планируется в волне 2 (API distill) |
| H2. Vercel function-budget впритык | — | constraint, не fix |
| H3. Lazy для PeriodPage / DynamicCoursePeriodPage | — | разрешено CLAUDE.md |
| H4. Debug-роуты `/_debug/*` | ⏳ | не трогалось |
| **H5. Монолиты выше 400 LoC (UI)** | ✅ | Wave 1: 10 файлов разрезаны (5abacdd…094a5d1), коммиты в `feature/initial-setup-sergo` |
| **H5. Монолиты выше 400 LoC (API)** | 🔄 | Wave 2 в работе |
| H6. ESLint не покрывает TS | ⏳ | связано с C3 |
| H7. transcript-search full scan (MR-1) | ⏳ | в audit-backlog |
| M1. Cross-layer features → pages | ⏳ | `roleHelpers` |
| M2. Feature → feature импорты | — | через barrel, ок |
| M3. Устаревшие docs | ⏳ | синхронизация после fixes |
| **M4. JS центральные файлы (`*.jsx`)** | 🟡 частично | `routes.jsx` → `routes/` (TS) ✅. Остаются `App.jsx`, `AppShell.jsx`. |
| M5. Тестовые пробелы | 🟡 частично | Добавлено 78 unit/snapshot тестов в волне 1 (helpers/normalize/api). Для `api/admin/books.ts` тестов всё ещё нет. |
| M6. Stores | — | OK |

### Wave 1 итоги (UI-only декомпозиция)

10 коммитов `5abacdd..094a5d1` (закрывают H5-UI):

| # | Файл | Было | Стало | Тестов добавлено |
|---|---|---|---|---|
| 1 | `routes.jsx` | 502 | 6 модулей × ≤177 | +14 |
| 2 | `useContentSearch.ts` | 458 | 117 + 5 lib×≤119 | +14 |
| 3 | `GroupEditorModal.tsx` | 491 | 349 + 4×≤124 | +12 |
| 4 | `CourseIntroEditor.tsx` | 540 | 218 + 5×≤200 | +6 |
| 5 | `AdminContent.tsx` | 507 | 251 + 5×≤110 | +6 |
| 6 | `SuperAdminTaskPanel.tsx` | 598 | 278 + 5×≤170 | +14 |
| 7 | `Timeline.tsx` | 561 | 462 + 5×≤60 | — |
| 8 | `WarmSprings2Page.tsx` | 487 | 45 + 13×≤163 | — |
| 9 | `HomeDashboard.tsx` | 797 | 335 + 9×≤100 | +5 |
| 10 | `DisorderTable.tsx` | 1315 | 766 + 12×≤200 | +11 |

Итого: 6256 → 3160 LoC в главных файлах (–49%), 70+ новых модулей ≤200 LoC, 78 новых тестов (все зелёные).

Заметные побочные улучшения переиспользования:

- `routes/lookup.ts:byPeriodLookup()` — 1 generic вместо 3 копий `reduce`.
- `groupEditor/CourseChecklistField.tsx` — 1 компонент для 2 fieldset (Granted и Featured courses).
- `courseIntro/MarkdownDraftSection.tsx` — общий блок для секций «Идея» и «Программа» (был дублирован).
- `warmSprings2/components/InstructorCard.tsx` — единственная карточка ведущего (было задублировано для пар 1 и 2).
- `disorderTable/components/TrackPicker.tsx` — picker трека для 2 модалок (Entry и Bulk).

WarmSprings2 теперь готов как шаблон для будущих лендингов: data + sections + reusable components.

### Hotfix `094a5d1`

Поправлена давняя проблема в карточке актуального курса (`ContinueCourseCard.tsx`): убран `group-hover` с левой кнопки «Список занятий» — теперь подсветка срабатывает только при наведении на саму кнопку. Баг был в `main` до распила, не регрессия.

## Executive Summary

Концептуальная архитектура проекта хорошая: есть живые `docs/`, subsystem guides, QA log, audit backlog, route-level lazy loading, разделение Firebase/Functions/API/client и постепенный переход к feature-модулям.

Фактическое соблюдение архитектурных правил слабее из-за неработающих guardrails, TS-файлов вне ESLint, прямых `console.*`, монолитов больше 500 строк и местами дублирующейся runtime-логики.

Оценка:

- Концептуальная архитектура: 7/10
- Фактическое соответствие правилам проекта: 5/10

## Critical Findings

### 1. Booking email login выдаёт Firebase custom token по одному email

Файлы:

- `api/auth.ts`
- `src/pages/booking/AuthModal.tsx`
- `tests/api/booking-login.test.ts`

Суть:

`/api/auth?action=loginByEmail` принимает email, проверяет `emailVerified`, затем выдаёт Firebase custom token через `createCustomToken`. Клиент сразу вызывает `signInWithCustomToken`.

Риск:

Зная verified email пользователя, можно получить сессию этого пользователя без проверки владения почтой в момент входа.

Что исправить:

- Убрать выдачу custom token по одному email.
- Использовать стандартный Firebase email-link/password flow или server-side one-time challenge.
- Переписать тест `booking-login.test.ts`, который сейчас закрепляет небезопасное поведение.

### 2. Инвариант логирования нарушен, guard не ловит нарушения

Файлы-примеры:

- `src/pages/timeline/components/SaveEventAsNoteButton.tsx`
- `src/lib/testResults.ts`
- `src/components/TestHistory.tsx`
- `src/hooks/useAuthSync.ts`
- `api/assistant.ts`
- `src/lib/errorHandler.ts`
- `scripts/check-console.cjs`

Суть:

`npm run check-console` проходит, но прямые `console.*` есть в `src/` и `api/`. При ручном поиске найдено 56 вхождений в runtime-коде.

Причина:

- `scripts/check-console.cjs` проверяет только staged files.
- Проверяются только `src/` и `functions/src/`, но не `api/`.
- TS-файлы не покрыты ESLint-конфигом.

Что исправить:

- Перевести runtime-логи на `debugLog`, `debugWarn`, `debugError` из `@/lib/debug`.
- Расширить `check-console` на full-repo режим для `validate`.
- Добавить `api/` в проверяемые директории.
- Отдельно решить, как должен логировать `reportAppError`.

### 3. ESLint фактически не проверяет TypeScript

Файлы:

- `eslint.config.js`
- `tsconfig.base.json`

Суть:

`eslint.config.js` применяет правила только к `**/*.{js,jsx}`. Для `src/lib/testResults.ts` `eslint --print-config` возвращает `undefined`.

Риск:

`npm run lint` зелёный, но не проверяет основную часть проекта. В сочетании с `strict: false` и `checkJs: false` это делает качество TS-кода зависимым от ручной дисциплины.

Что исправить:

- Подключить TypeScript ESLint для `ts/tsx`.
- Добавить хотя бы базовые правила: unused vars, no-console для runtime, React hooks, no-floating-promises/consistent type imports по возможности.
- Постепенно включать более строгие TS checks, не ломая проект одной большой миграцией.

## High Priority Findings

### 4. Монолиты снова вышли за архитектурный стандарт

> **Статус:** UI-часть закрыта в Wave 1 (10 коммитов в `feature/initial-setup-sergo`,
> `5abacdd..094a5d1`). API-часть в работе в Wave 2.

Метрики production-кода:

- 531 runtime TS/TSX/JSX-файл в `src/api/functions/shared`
- 57 файлов больше 300 строк
- 13 файлов больше 500 строк
- 2 файла больше 800 строк

Крупнейшие файлы:

- `src/pages/DisorderTable.tsx` — 1315 строк
- `api/papers.ts` — 1206 строк
- `src/pages/home/HomeDashboard.tsx` — 797 строк
- `api/assistant.ts` — 680 строк
- `api/lectures.ts` — 671 строк
- `api/booking.ts` — 620 строк
- `api/books.ts` — 615 строк
- `src/components/SuperAdminTaskPanel.tsx` — 598 строк

Риск:

Сложно ревьюить, тестировать и локально менять поведение без регрессий. Это противоречит `docs/architecture/guidelines.md`.

Что исправить:

- Начать с `DisorderTable.tsx`: вынести локальные модалки, фильтры, комментарии и form-state в components/hooks.
- API-монолиты резать только по runtime helper-модулям с учётом лимита Vercel functions.
- Для каждого нового крупного UI-файла добавлять локальные pure helpers и тесты.

### 5. Route-level lazy loading соблюдается не полностью

Файлы:

- `src/pages/lazy.ts`
- `src/app/AppRoutes.tsx`

Суть:

Большинство страниц централизованы в `src/pages/lazy.ts`, но `AppRoutes.tsx` eager-импортит:

- `PeriodPage`
- `DynamicCoursePeriodPage`

Что исправить:

- Добавить lazy exports для этих route-level pages.
- Использовать их через общий `Suspense fallback={<PageLoader />}`.
- После правки проверить `npm run build`.

### 6. Повторное использование местами проседает

Примеры:

- Course navigation logic есть в `AppShell.jsx`, `useCourseNavItems.ts`, `courseLessons.ts`.
- API runtime helpers частично дублируются между `src/lib/api-server/sharedApiRuntime.ts`, `api/lib/lectureApiRuntime.ts`, локальными `initFirebaseAdmin` и CORS helpers.
- `api/lectureTranscriptFallback.ts` выглядит как устаревший дубль `api/lib/lectureFallback.ts`.

Что исправить:

- Выбрать один canonical helper для course navigation.
- Свести API auth/CORS/BYOK/rate-limit/runtime helpers к одной переиспользуемой зоне, не нарушая Vercel function limit.
- Удалять дубли только после проверки импортов и тестов.

### 7. `/api/transcript-search` делает full collection scan

Файл:

- `api/transcript-search.ts`

Суть:

Endpoint делает `collectionGroup(...).get()` по всем transcript chunks на каждый запрос и фильтрует в памяти.

Статус:

Проблема уже есть в `audit-backlog` как `MR-1`; ревью 2026-04-27 повторно подтверждает риск.

Что исправить:

- Убрать full scan из hot path.
- Спроектировать индекс/lookup/sharding или другой server-side retrieval.
- Добавить performance guard/тест на отсутствие полного scan path.

## Medium Priority Findings

### 8. Debug routes доступны в production routing

Файл:

- `src/app/AppRoutes.tsx`

Роуты:

- `/_debug/palette`
- `/_debug/home-v2`

Риск:

Сейчас это не похоже на утечку секретов, но внутренние debug pages не должны быть публичной production-поверхностью.

Что исправить:

- Закрыть под env/dev guard или super-admin guard.

### 9. Документация частично устарела

Файлы:

- `docs/reference/routes.md`
- `docs/guides/booking-system.md`
- `docs/reference/firestore-schema.md`

Примеры:

- `routes.md` описывает legacy `/tests/authors*`, которых нет в `AppRoutes`.
- `booking-system.md` говорит про Email+password, а код использует custom-token по email.
- `firestore-schema.md` датирован 2026-01-09 и не полностью отражает новые группы, booking, BYOK usage, dynamic courses.

Что исправить:

- Синхронизировать docs после security/auth fixes.
- Удалить legacy routes из reference или явно пометить archive-only.

### 10. Центральные app files остаются JS без проверки типов

> **Статус:** `src/routes.jsx` мигрирован в Wave 1 (5abacdd) — теперь
> `src/routes/*.ts` с типизацией. `App.jsx`, `AppShell.jsx` остаются открытыми.

Файлы:

- `src/App.jsx`
- `src/app/AppShell.jsx`
- ~~`src/routes.jsx`~~ → `src/routes/*.ts` (typed) ✅

Риск:

Это центральная маршрутизация/навигация, но `checkJs: false`; ошибки типов здесь не ловятся.

Что исправить:

- Постепенно мигрировать в TS/TSX.
- Начать с `routes.jsx` как data/config module, затем `AppShell.jsx`.

## Strengths

- `docs/` действительно используется как source of truth.
- `qa-smoke-log.md` подробный и помогает восстановить историю проверок.
- `audit-backlog.md` живой и содержит конкретные follow-ups.
- `functions` и `shared` в целом соблюдают NodeNext `.js` import discipline.
- Тяжёлый `src/data/eventIconDataUrls.ts` не импортируется статически; используется dynamic import.
- Есть хороший переход к feature modules: `features/periods`, `features/bookSearch`, `features/lectureSearch`, `features/disorderTable`.
- У `/api/books` уже есть более зрелая модель BYOK/auth/rate-limit, которую можно переиспользовать дальше.

## Suggested Fix Order

1. Закрыть booking email login auth-bypass.
2. Починить ESLint/check-console guardrails так, чтобы они реально покрывали TS/API runtime.
3. Заменить прямые `console.*` в runtime-коде.
4. Вернуть route-level lazy discipline для `PeriodPage` и `DynamicCoursePeriodPage`.
5. Разрезать `DisorderTable.tsx` и самые крупные API handlers.
6. Свести дубли course navigation/API runtime helpers.
7. Обновить docs после исправлений.


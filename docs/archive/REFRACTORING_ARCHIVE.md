# Архив рефакторинга

Документ фиксирует, что именно уже выполнено в рамках основных планов, какие документы/коммиты подтверждают работу и какие проверки применялись.

## Общий статус
- **Core Refactoring Plan** — все фазы выполнены, Phase 6 QA покрыта (см. `docs/archive/legacy/CORE_REFACTORING_PLAN.md`, коммит `refactor(core): phase 6 qa and coverage`).
- **Timeline Refactoring Plan** — Phases 1‑5 завершены, Phase 6 QA описана в `docs/archive/legacy/TIMELINE_REFACTORING_PLAN.md`, ключевые юнит-тесты добавлены (`SaveNoteAsEventButton`, `useTimeline`).
- **Tests Refactoring Plan** — быстрая реорганизация утилит/типов выполнена ранее, текущий статус указан в документе `docs/archive/legacy/TESTS_REFACTORING_PLAN.md` (перенос утилит, отдельные тестовые компоненты).
- **Notes and Export Features** — структура и утилиты приведены к модульному виду (`src/pages/notes/components`, `src/utils/notesExport.ts`), `NoteModal`/`SaveNoteAsEventButton` соответствуют ожиданиям.

## Подробности по планам

### Core
- **Phase 1 («Быстрые победы»)**: удалены legacy-данные и перенесены утилиты. Документ — `docs/CORE_REFACTORING_PLAN.md:80-134`. Коммиты: ранее [[link]].
- **Phase 2 (AdminContentEdit)**: структура `content-editor` и хук/компоненты (в коде). Зафиксировано описание в плане `docs/CORE_REFACTORING_PLAN.md:126-233`.
- **Phase 3 (AdminImport)**: legacy CSV-импорт (страница `AdminImport` и связанная логика) удалены, связанные документы/процедуры перенесены в `docs/processes/audit-backlog.md`.
- **Phase 4 (Notes)**: `NotesHeader/NotesList/NotesEditor/NotesEmpty` вынесены, `useNotes` остался; описание в `docs/CORE_REFACTORING_PLAN.md:304-368`.
- **Phase 5 (Финал)**: анализ «желтых» файлов, рефакторинг `NoteModal`, `ExportNotesButton` и `SaveNoteAsEventButton`, итог описан в `docs/CORE_REFACTORING_PLAN.md:369-405`.
- **Phase 6 (QA и релиз)**: покрыты тестами `SaveNoteAsEventButton` и `useTimeline`, проведены `npm run test`/`npm run build`; описание `docs/CORE_REFACTORING_PLAN.md:407-638`.
- **Audit заметки:** команды `npm run test -- src/components/__tests__/SaveNoteAsEventButton.test.tsx`, `npm run test -- src/hooks/__tests__/useTimeline.test.ts`, `npm run build` выполняются без ошибок, ручные проверки CRUD/экспорт/добавление события предстоит зафиксировать.

### Timeline
- Все фазы и метрики описаны в `docs/archive/legacy/TIMELINE_REFACTORING_PLAN.md`; Phase 6 и итоговые проверки также отражены в этом архиве. Тесты `parseBulkEvents`, `formatEventAsNote`, `ageToRange`, а теперь `useTimeline` уже покрыты.

### Tests
- Система тестов описана в `docs/guides/testing-system.md` и `docs/archive/legacy/TESTS_REFACTORING_PLAN.md` (перенос утилит, новые папки, разбивка компонентов).

### Notes / Export / UI helpers
- Файл `src/utils/notesExport.ts` и `ExportNotesButton` модульно организованы (см. `docs/CORE_REFACTORING_PLAN.md:369-405`).
- `NoteModal` и связанная модалка `SaveNoteAsEventButton` рефакторены, добавлены тесты (см. `src/components/__tests__/SaveNoteAsEventButton.test.tsx`).

## Архив проверок и аудита
| Дата | Область | Что проверялось | Результат |
|------|---------|-----------------|-----------|
| 2025-11-09 | Phase 6 | `SaveNoteAsEventButton` + `useTimeline` юнит-тесты | ✅ проходят, `npm run test` без ошибок | 
| 2025-11-09 | Phase 6 | `npm run build` | ✅ бандл собирается, warning по большим чанкам (следить) | 
| 2025-11-09 | Phase 6 (ручной smoke / TODO) | CRUD заметок, экспорт заметок, создание события из заметки | 🟧 выполняется вручную; нужно логировать результаты отдельно |
| 2026-04-28 | Code Review 2026-04-27 (waves 1-11) | Полный аудит main + 48 коммитов с фиксами C1/C2/C3/H1/H4/H5/H6/H7/M1/M3/M4/M5; merge в main коммитом `b33bdc1` | ✅ все critical/high/medium закрыты; smoke на academydom.com подтвердил CORS allowlist + удаление `/api/auth`; integration 6/6, unit 912 passed |

## Что дальше
1. Завести лог прогонов ручных сценариев (добавить сюда или в `docs/PLANS_OVERVIEW.md`) с датой/результатом. Пока процесс ручной, но важны метки.
2. При появлении новых рефакторингов добавлять сюда их описание; если фаза возвращается в работу (например, появляются баги), отметьте дату и кратко опишите откат/фикс.
3. Синхронизировать файл с релизной записью/issue tracker, чтобы у QA и review было единое место ссылки.

---

## Архивированные планы (подробности перемещены сюда)

### Core Refactoring Plan
- ✅ Содержимое перенесено из `docs/CORE_REFACTORING_PLAN.md` (фазы 1‑6, чеклисты, метрики).  
- 📌 Ключевые выписки:
  - Фаза 1 «быстрые победы» (удаление legacy-данных, перенос test-утилит).  
  - Фаза 2 разбиение `AdminContentEdit` на `content-editor/*` (4 компонента, 3 hook, types).  
  - Фаза 3: вывод CSV-импорта и удаление `AdminImport`.  
  - Фаза 4 модульная система Notes (`NotesHeader`, `NotesList`, `NotesEditor`, `NotesEmpty`).  
  - Фаза 5 «желтая зона» (NoteModal, ExportNotesButton, SaveNoteAsEventButton).  
  - Фаза 6 QA + smoke (юнит-тесты `SaveNoteAsEventButton`, `useTimeline`, `npm run build`).  
- 🔗 Актуальные задания по этой области теперь живут в `docs/processes/audit-backlog.md`.

### Tests Refactoring Plan
- ✅ План из `docs/archive/legacy/TESTS_REFACTORING_PLAN.md` перенесён сюда (Фазы 1‑3, 2.1+, метрики).  
- 📌 Итоги:
  - Удалены legacy Authors тесты, перенесены утилиты.  
  - Разбиты `TestEditorForm`, `QuestionEditor`, `DynamicTest`.  
  - Внедрены Zustand стора, barrel-exports, 9 юнит тестов, 28 компонентов, 17 хуков.  
  - Метрики (‑3753 строк кода, максимальный файл < 400 строк).  
- 🔗 См. `docs/processes/audit-backlog.md` для дальнейших задач (обновление тест‑гайдов, CI, интеграционные и e2e тесты).

### Timeline Refactoring Plan
- ✅ Подробный план (`docs/archive/legacy/TIMELINE_REFACTORING_PLAN.md`) объединён с этим архивом.  
- 📌 Основные блоки:
  - Фазы 1‑5 (экспорт, левая/правая панель, Canvas, формы, хуки/утилиты).  
  - Метрики успеха (размеры файлов, производительность, покрытие).  
  - Phase 6 QA: юнит‑тесты `SaveNoteAsEventButton`, `useTimeline`, ручные smoke, `npm run build`.  
- 🔗 Текущие действия смотрите в `audit-backlog` (ленивая загрузка, логирование, документация Timeline).

### Научный поиск и ИИ-помощник (декабрь 2025) — завершённые задачи

**Поиск научных статей (Research Search):**
- ✅ Интеграция с OpenAlex API + Semantic Scholar API
- ✅ Фильтрация по психологическим дисциплинам через OpenAlex Concepts API
- ✅ Настройки поиска: годы, языки, Open Access
- ✅ Автоматическое отсеивание нерелевантных результатов (психологический фильтр)
- ✅ UI: drawer с результатами, источники, настройки
- ✅ Кэширование запросов (5 минут)
- ✅ Unit-тесты: `useResearchSearch.test.tsx`, `queryVariants.test.ts`
- 📊 Релевантность: 60% (анализ в `docs/reference/RESEARCH_SEARCH_ANALYSIS.md`)
- 📁 Файлы: `src/features/researchSearch/**`

**ИИ-помощник по психологии:**
- ✅ Интеграция с Google Gemini API (`gemini-2.5-flash-lite`)
- ✅ Ограничение тематики: только психология/развития/клиническая
- ✅ Ограничения ввода/вывода: 100 символов вопрос, 4 абзаца ответ
- ✅ Rate limiting: 10 запросов / 5 минут на IP
- ✅ Серверный API endpoint: `/api/assistant` (Vercel Functions)
- ✅ UI блок внизу drawer'а научного поиска
- ✅ Unit-тесты: `api/__tests__/assistant.test.ts` (18 тестов)
- ✅ Документация env vars в README
- 📁 Файлы: `api/assistant.ts`, `src/features/researchSearch/hooks/useAiAssistant.ts`, `src/features/researchSearch/components/AiAssistantBlock.tsx`

**Архитектурные решения:**
- API ключ хранится на сервере (GEMINI_API_KEY в Vercel Env Vars)
- Структурированный JSON ответ от Gemini (`{allowed, answer}`)
- Retry логика при неудачном парсинге JSON
- Truncation ответа на границе предложений
- TypeScript типизация на клиенте и сервере

**Качество кода: ✅ ХОРОШЕЕ**
- Код соответствует архитектурным guidelines
- Чёткое разделение ответственности (API, hook, component)
- Proper error handling и типизация
- Accessibility (aria-labels, semantic HTML)
- Мелкие улучшения вынесены в `docs/processes/audit-backlog.md` (LP-3, LP-4)

### Audit backlog (январь 2025) — завершённые задачи
- **1. Безопасность доступа и ролей.** Полностью удалён «одноразовый» seed-код из клиента, повышенные права выдаются только через Cloud Functions. `ensureAdmin` принимает role `admin/super-admin`, Storage rules и UI синхронизированы, README/ARCHITECTURE_GUIDELINES зафиксировали новый процесс.
- **2. Логи и приватность.** Проведена инвентаризация `console.*`, внедрены `debugLog/debugWarn/debugError`, включена автоматическая проверка (`npm run check-console`, Husky). Приватные данные больше не попадают в продакшен-логи.
- **3. Данные и UX.** Восстановлены корректные админские метрики профиля, убран legacy CSV-режим (UI, хуки, скрипты). Единственный источник контента — Firestore.
- **4. Lazy loading и сборка.** Этапы 1‑3 плана `docs/lazy-loading-migration.md` завершены: все страницы переведены на `React.lazy`, вручную настроены `manualChunks` в `vite.config.js`, baseline метрики сохранены. Чанк Timeline разбит (коммит `6065075`), крупные визуальные части отложены, EVENT_ICON_DATA_URL_MAP грузится динамически.
- **5. Тестирование и QA.** Добавлен `npm run test:ci`, настроен CI (lint → test → build → e2e), заведена интеграционная инфраструктура на Firebase эмуляторах (`tests/integration/**`, `test:integration`). Playwright настроен, `tests/e2e/production-smoke.spec.ts` покрывает базовые сценарии и запускается в CI, traces сохраняются. Скрипт `scripts/check-module-initialization.cjs` устранил 8 module-init warning'ов; `docs/architecture/guidelines.md` описывает политику тестирования загрузки модулей.
- **6. Качество кода.** Удалены устаревшие хуки/скрипты (`usePeriods.js`, CSV tooling), централизована обработка ошибок (`ErrorBoundary`, `reportAppError`). 
- **7. Документация и процессы.** Введён `docs/processes/qa-smoke-log.md`, `docs/guides/timeline.md` синхронизирован с архивом и актуальными задачами, `docs/guides/testing-system.md` отражает модульную архитектуру и новые хуки редактора тестов.


### Code Review 2026-04-27 — waves 1-11 (закрыт 2026-04-28)
- ✅ Полный аудит main, оформлен в [`CODE_REVIEW_MAIN_2026-04-27.md`](reports/CODE_REVIEW_MAIN_2026-04-27.md), все critical/high/medium закрыты 11 волнами рефакторинга и смерджены в main коммитом `b33bdc1`.
- 📌 Ключевые блоки:
  - **Wave 1 (UI распил):** 10 монолитов >400 LoC разбиты на 70+ модулей ≤200 LoC (DisorderTable, HomeDashboard, SuperAdminTaskPanel, Timeline, AdminContent, CourseIntroEditor, GroupEditorModal, useContentSearch, WarmSprings2Page, routes.jsx → routes/). +78 unit/snapshot.
  - **Wave 2 (API распил):** 5 endpoints (papers, booking, assistant, books, lectures) с 3763 → 1195 LoC, +18 helper-модулей в `api/_lib/`. Общий `initFirebaseAdmin()` вместо 7 inline-копий.
  - **Wave 6 (`/api/books` security):** strict BYOK без env fallback, auth Bearer, rate-limit, CORS allowlist через `appOrigins`, BYOK usage counter в профиле через `aiUsageDaily/{uid}_{day}`.
  - **Wave 7 (guardrails):** ESLint покрывает ts/tsx через typescript-eslint v8, `no-console: error`, `check-console --all`, 50 runtime `console.*` → debug-helpers (плюс короткий whitelist для prod-error reporting).
  - **Wave 8 (H7 transcript-search):** keyword prefix-индекс через `searchTokens` array + `array-contains-any` query, full scan по 20k chunks убран. Backfill выполнен на prod до merge.
  - **Wave 9 (C1 booking auth-bypass):** `api/auth.ts` удалён целиком (с `loginByEmail`), оба пути входа через `sendSignInLinkToEmail`. Освобождена 1 Vercel function (9/12 → 8/12). Решение — Вариант 3 «email-link для всех» по [BOOKING_AUTH_C1_DECISION_2026-04-28.md](reports/BOOKING_AUTH_C1_DECISION_2026-04-28.md).
  - **Wave 10:** C2-admin (`api/admin/books.ts` → CORS allowlist), H4 (debug-routes под `import.meta.env.DEV`), M1 (`roleHelpers` в `src/lib/`), M3 (sync `routes.md` и `firestore-schema.md`), M5 (24 теста для admin/books).
  - **Wave 11 (M4):** `App.jsx` → `App.tsx`, `AppShell.jsx` → `AppShell.tsx` с типизацией; characterization-тест расширен до 5 кейсов.
- 🔧 Verification (pre-merge):
  - `npm run validate` ✅; `npm run test:integration` (Java 21) — 6/6 ✅; полный vitest unit-suite — 912 passed.
  - Vercel preview smoke по 15 страницам — 0 console errors.
  - C1 e2e подтверждён пользователем (silent login через email-link); CORS allowlist подтверждён на проде (`evil.com → нет Allow-Origin`; `academydom.com → точный origin + Vary`).
- 🔗 Открытые follow-up'ы (CI часть HP-1, HP-2 Playwright, CQ-7 рефакторинг, MR-3, MR-5, HM-4/5) — в [`docs/processes/audit-backlog.md`](../processes/audit-backlog.md).

> ℹ️ Полные версии планов доступны в истории git (перед архивацией). Если нужен оригинальный текст — используйте `git show` по предыдущим коммитам.

> Документ актуален по состоянию на `git commit refactor(core): phase 6 qa and coverage`. Обновляйте этот файл после каждой следующей фазы или аудита.

### Audit backlog — закрытые пункты (архивировано 2026-08-18)

> Перенесено из `docs/processes/audit-backlog.md` при чистке 2026-08-18: бэклог сократился 1253 → ~830 строк.
> Полные исходные формулировки — в истории git (`git show 4eb4eb0:docs/processes/audit-backlog.md`).

**Безопасность и доступ**
- **HR‑1. Защита `/api/books`** (волна 6, 2026-04-26, коммиты `0012100`, `2505b25`). `search`/`answer` — Firebase Bearer + strict BYOK (`X-Gemini-Api-Key` без env fallback, иначе `402 BYOK_REQUIRED`) + rate-limit 20/мин + CORS allowlist через `appOrigins.ts`; `list`/`snippet` публичны с лимитом 60/мин. Счётчик BYOK-usage — `aiUsageDaily/{uid}_{day}`, виден в профиле. Общий рантайм — `src/lib/api-server/sharedApiRuntime.ts`.
- **HR‑2. Booking email-login auth bypass** (волна 9, 2026-04-28). `api/auth.ts` удалён целиком (вместе с выдачей custom token по verified email и CORS-wildcard), оба пути входа — через `sendSignInLinkToEmail`. Освобождена 1 Vercel-функция (9/12 → 8/12). Решение — [BOOKING_AUTH_C1_DECISION_2026-04-28.md](reports/BOOKING_AUTH_C1_DECISION_2026-04-28.md). 28 существующих booking-пользователей не затронуты.
- **MR‑8. Catch-all в firestore.rules → deny-all** (2026-05-11). Legacy `match /{document=**} { allow read: if true }` отменял per-uid ограничения и ломал list-запросы (`/tests` показывал пустой экран). Добавлены явные match-блоки (`tests`, `admin`, `homeFeed`) и `false` для server-only коллекций (`videoTranscripts`, `lecture_*`, `books`, `book_chunks`, `studentEmailLists`, `opsRuntime` и др. — все ходят через Admin SDK). Теперь любая новая коллекция требует явного блока.
- **SEC‑1. `migrateAdmins`: публичный HTTP-endpoint без авторизации** (закрыта 2026-08-18). Удалены из кода и из прода (`firebase functions:delete migrateAdmins setRole --region us-central1`): `migrateAdmins` — v2 onRequest без какой-либо авторизации, переписывавший role-claims всем пользователям по коллекции admins (разовая миграция ролей выполнена в апреле 2026, вызовов в коде ноль); `setRole` — мёртвый callable (авторизационный гейт был, вызовов ноль — UI ходит в другую, живую `setUserRole`). Вместе с ними удалён мёртвый клиентский `src/lib/cloudFunctions.ts` (Proxy-обёртки seedAdmin/setRole) и его реэкспорт из `src/lib/index.ts`. **Поправка к дополнению 2026-07-12:** утверждение «у seedAdmin нет вызовов из UI» было ошибкой — `AdminArchive.tsx` зовёт её напрямую через `httpsCallable(getFunctions(), "seedAdmin")` в обход Proxy (поэтому греп по cloudFunctions.ts её не видел), маршрут `/admin/archive` жив (super-admin). `seedAdmin` защищена auth + одноразовым кодом из Secret Manager и оставлена сознательно — единственный аварийный bootstrap-путь первого админа.
- **HP‑3. CVE в контейнерных образах функций** (2026-02-06). `npm audit fix` в `functions/` + редеплой 17 функций: `qs`, `node-forge`, `jws`, `fast-xml-parser`, `@google-cloud/storage`, `express`. Остаток — Go stdlib на уровне buildpack (ждём Google). Детали: `docs/security/container-scanning-2026-02-01.md`. Не сделано: ежемесячный security-review как процесс.

**Производительность и данные**
- **LS‑2. Глобальный сплеш-гейт AppShell** (закрыта 2026-08-18, `709124c`). Гейт loading/error/empty перенесён из MainAppShell в `CourseDataBoundary` внутри AppRoutes и скоупится курсовыми страницами по-курсово: /home, /booking, /about и админка не ждут periods/clinical/general, ошибка одного курса не гасит остальные страницы. Курсовые страницы при загрузке показывают PageLoader (не заглушку «контент появится» и не NotFound), навигация и сайдбар — собственный индикатор. Попутно закрыт латентный баг: ErrorState получал `undefined` вместо текста ошибки usePeriods. Эффект (прод-замер 2026-08-18): /home LCP ~3,5 с → 1,4 с, FCP 0,4 с.
- **LS‑1. SWR-кэш курс-данных в localStorage** (закрыта 2026-08-18, `40b3cc3`). `src/lib/courseContentCache.ts`: версионированный envelope, maxAge 7 дней, битый JSON/чужая версия вычищаются; usePeriods и useCourseTopics рендерят из кэша сразу и ревалидируют фоном (ошибка ревалидации не перекрывает показанные данные); инвалидация из админ-сейвера по образцу invalidateCourses. usePeriods заодно переведён на published-only (раньше AppShell тянул неопубликованные периоды любому анониму — расходилось с clinical/general) и получил настоящий refresh вместо заглушки; `getAllPeriods` остался без runtime-потребителей (жив для integration-тестов). Эффект: повторный визит курсовой страницы LCP 0,32 с при цели ≤1,2 с — контент рисуется до первого Firestore-запроса. 11 юнит-тестов кэш-слоя.
- **MR‑1. Масштабирование `/api/transcript-search`** (волна 8 / H7, 2026-04-28, мердж `b33bdc1`). Keyword prefix-индекс `searchTokens: string[]` + `array-contains-any` вместо full scan: ~20 700 reads/запрос → ≤200. Backfill 20 693 chunks на prod выполнен до мержа, single-field index в `firestore.indexes.json`, latency по UI 355–873 мс.
- **MP‑6. Миграция «Психологии развития» на формат sections** (2025-11-19, `6ca0e14`, `bba4e1d`). 14 периодов + intro, backup `backups/periods-backup-2025-11-19*.json`, `convertLegacyToSections` удалена. Все 3 курса на едином формате.
- **MP‑5. Заглушка clinical/general** (2025-11-19, `f3ba86b`). Явный `placeholder_enabled === false` теперь показывает контент даже при пустых sections.

**Качество кода и тесты**
- **CQ‑6 / CQ‑5. TS lint + console guardrails** (волна 7, 2026-04-27, `9dac357..b4a47fc`; доделано 2026-08-17). ESLint покрывает ts/tsx через typescript-eslint v8, `no-console: error` + overrides, `check-console --all` в validate и `:staged` в pre-commit, 50 runtime `console.*` → debug-хелперы, whitelist для prod-error reporting (`api/assistant.ts`, `src/lib/errorHandler.ts`). 2026-08-17 добиты все 99 оставшихся warnings в ноль; `react-hooks/exhaustive-deps` осознанно оставлен warn.
- **CQ‑1/2/3. Январский аудит качества** (2026-01-08). Разбиты `common.ts` (605→96), `ThemePicker.tsx` (580→403), `tests.ts` (560→262); созданы `BaseModal`, `useClickOutside`, `shuffleArray`; `TimelineCanvas` обёрнут в `React.memo` + `useMemo`. Январские остаточные списки (CRUD-фабрики, functions-validators, мемоизация) с кодом не сверялись и устарели — Timeline и AdminContent с тех пор дважды крупно рефакторились (волна 1, MP‑1, BPT‑10).
- **MR‑2. `npm run test:ci`** (2026-04-27). `--runInBand` (снят в Vitest 4) → `--no-file-parallelism`, в `test:ci` и `test:integration`.
- **MR‑4. `authStore.test.ts`** (2026-04-27). Переписан под `UserRole = 'admin' | 'super-admin' | null`, убран удалённый `isStudent`, добавлен кейс role=null.
- **MR‑7. `AdminFeedFilters.test.tsx`** (2026-07-12). Фильтр «📅 События» сознательно убран из ленты в `89604ff` (события живут в календаре) — тест переписан под 3 фильтра + регрессия на отсутствие кнопки.
- **MR‑9. Functions Checks CI** (сверка 2026-07-11). `working-directory: functions` + `npm ci --include=dev` + локальный `vitest` в `functions/package.json`.
- **MP‑1. Изоляция хук-логики Timeline** (2026-04). 8 хуков в `src/pages/timeline/hooks/`, отдельный чанк `timeline-hooks`.

**Cloud Functions**
- **LP‑16. Миграция firebase-functions v1 → v2 (1st gen → 2nd gen)** — ЗАКРЫТА 2026-07-12 за 5 пачек. Все функции на 2nd gen + firebase-functions 7.2.5; 1st gen осознанно остался только у `onUserCreate` (в gen2 нет non-blocking `auth.onCreate`, нужен явный импорт `firebase-functions/v1`). Ключевые грабли: gen1→gen2 под тем же именем **не апгрейдится** — только `functions:delete` → deploy (окно недоступности ~3-4 мин на пачку); gen2 по умолчанию берёт compute default SA **без доступа к Secret Manager** — функциям с секретами/BigQuery/календарями нужен явный `serviceAccount: appspot SA` (`FUNCTIONS_SERVICE_ACCOUNT` в `lib/shared.ts`); в gen2 `cpu` по умолчанию 1 vCPU. Тактика tests-first (38 + 18 тестов на v1-поведение до миграции, зелёные после без правки ассертов) себя оправдала. Ручной триггер синка теперь: `gcloud scheduler jobs run firebase-schedule-syncGroupCalendars-us-central1 --location us-central1`. Подробности также в memory `project-firebase-functions-v1-migration`.
- **MR‑6. Orphan-функция `setStudentStream`** (2026-07-12). Удалена из прода (`firebase functions:delete`) при деплое канарейки LP‑16 — full `firebase:deploy:functions` разблокирован.

**Продукт и админка**
- **AD‑1. Admin events UX v2** (волна 5, 2026-04-26). `/admin/announcements` переписан под Google-Calendar-style: edit-модалки с фиксом `lastWriteSource` для GCal-экспорта, месячный grid + фильтруемый список, недельный вид, поиск, цветовая кодировка групп. 55 unit-тестов в 8 файлах.
- **AD‑2 / HM‑3. Редактор статических страниц** (2026-04-26). Контент `/about` переехал в `pages/about`, добавлены `/superadmin/pages`, `/superadmin/pages/about`, `/superadmin/pages/projects/:slug` (client SDK + rules, write — super-admin, read — публичный).
- **HM‑1. Continue-cards «актуальные курсы»** (волна 3). Поле `featuredCourseIds` (max 3) у `groups/{id}` и `users/{id}`, приоритет: личные → групповые → последний просмотренный → CTA-заглушка.
- **HM‑2. `/about` → вкладки + страницы проектов** (волна 3). 6 вкладок, шаблон `ProjectPage` / `DynamicProjectPage` в общей watercolor-палитре.
- **HM‑4. Чекбокс «не присылать email о бронях»** (сверка 2026-07-11). `EmailPreferencesSection` → `prefs.emailBookingConfirmations` через `updateMyEmailPreferences`; гейт `shouldSendBookingEmail()` в `api/_lib/bookingAuth.ts`. Другие уведомления не затронуты.
- **EX‑4. Уведомления о бронировании экзамена** (2026-05-10). Триггер `onExamSlotWrite`: переходы 0→≥1 / ≥1→≥1 / ≥1→0 создают, патчат и помечают «❌ ОТМЕНЕНО» событие в личном GCal преподавателя + шлют TG. Self-heal при потере `eventId` (использован для backfill 4 старых броней). Per-exam override отложен до появления второго преподавателя.

**AI / поиск**
- **RS‑1. Wikidata-перевод в обычном поиске** (2026-07-17). Реализовано не отдельной кнопкой «Глубокий поиск» (заглушка удалена), а fallback-переводом в `buildEnglishQuery`: словарь `RU_TO_EN_TERMS` → при остатке кириллицы Wikidata отдаёт английский лейбл концепта. Гибридные RU/EN строки в источники не уходят (давали мусор); EN и RU ищутся параллельно. Файлы: `api/papers.ts`, `api/_lib/papersWikidata.ts`, `api/_lib/papersTranslation.ts`.
- **BR‑1. Sentence-based chunking** (2025-12-25). Чанки по границам предложений (5-15 предложений / 1500-2500 символов), overlap в 2 предложения, fallback на character-based. Конфиг — `functions/src/lib/chunker.ts`.
- **LP‑3. Rate limiting для AI Assistant** — снято как неактуальное (2026-05-04, `d350a70`). После перехода на BYOK общая per-IP квота потеряла смысл: `enforceDailyQuota`/`enforceRateLimit` и `api/_lib/assistantQuota.ts` удалены. Distributed rate-limit (Vercel KV) не понадобился.
- **LP‑4. Fallback env vars в AI Assistant** — решено пропустить: `MY_GEMINI_KEY`/`GOOGLE_API_KEY`/`VITE_GEMINI_KEY` не мешают, работает `GEMINI_API_KEY`.

**Biography pipeline (BPT)**
- **BPT‑2 / BPT‑3 / BPT‑7 / BPT‑12.** Оркестрация сведена в единый `server/api/timelineBiographyPipeline.ts`; `biographyImport.ts` 843 → 313, `timelineBiographyRuntime.ts` 1098 → 226, `TimelineLeftPanel.tsx` 856 → 412. Упоминаний `two-pass-v5` в server-коде не осталось.
- **BPT‑8 / BPT‑9.** Решено через lite-профиль (3.1-flash-lite, в проде с 2026-07-11) с merged-вызовом разметки.
- **BPT‑10.** `branchId` — источник истины о принадлежности ветке (фазы 1–3, 2026-07-11).
- **BPT‑11.** Нормализованная ошибка в `biographyJobs` (2026-07-12, задеплоено).
- **BPT‑1.** Deprecated jobs endpoint удалён частично (2026-05-04).
- **BTP‑2 / BTP‑3** (старая секция two-pass-v5): баланс mainLine/branches поглощён бенчмарк-контуром (метрики в `scripts/lib/biographyBenchmarkMetrics.ts`), рендер timeline на canvas давно в проде.

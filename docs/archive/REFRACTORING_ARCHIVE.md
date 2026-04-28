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

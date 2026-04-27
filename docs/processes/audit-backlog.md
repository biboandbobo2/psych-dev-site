# Бэклог по результатам аудита (январь 2025)

> 🔔 **Легенда:** P — приоритет (H/M/L), E — оценка трудоёмкости (S/M/L).  
> ✅ Завершённые пункты перенесены в `docs/archive/REFRACTORING_ARCHIVE.md` (раздел *Audit backlog (январь 2025)*).  
> Ниже остаются только активные задачи, сгруппированные по приоритету.

## 📊 Priority board
| ID | Priority | Фокус | Ключевые deliverables |
|----|----------|-------|-----------------------|
| HP-1 | H (S) | Nightly интеграционные тесты (Firebase) — CI часть | Локальный прогон починен 2026-04-27 (6/6 зелёных, см. ниже). Осталось: GH Actions workflow + service account secret. |
| HP-2 | H (L) | Расширенное Playwright покрытие | Seed-данные, full auth flow, stress-тесты, отчётность |
| HP-3 | ✅ | Remediate container image vulnerabilities | NPM HIGH закрыты (2026-02-06), Go stdlib — buildpack-level |
| HR-1 | ✅ | Защита `/api/books` | Закрыта волной 6 (2026-04-26): strict BYOK без env fallback, auth Bearer на search/answer, public только list/snippet с rate-limit, CORS allowlist через appOrigins. Плюс счётчик BYOK-usage в профиле через aiUsageDaily/{uid}_{day}. |
| HR-2 | H (S-M) | Закрыть booking email-login auth bypass | Убрать custom-token login по одному email, заменить на настоящий email-link/password/challenge flow |
| CQ-6 | ✅ | Починить TS lint + console guardrails | Закрыта волной 7 (2026-04-27): ESLint покрывает ts/tsx через typescript-eslint v8, `no-console: error` + overrides, `check-console --all` для validate / `:staged` для pre-commit, api/ под покрытием. 50 runtime `console.*` → `debugLog/debugError/debugWarn` (или whitelist для prod-error reporting). |
| CQ-7 | M (L) | Рефакторинг новых монолитов и дублей | `DisorderTable`, API handlers, course-nav/API-runtime helpers |
| MP-1 | ✅ | Изоляция бизнес-логики Timeline (lazy-hooks) | Хуки вынесены в `src/pages/timeline/hooks/`, чанк `timeline-hooks` в vite.config.js (2026-04) |
| MP-2 | M (S) | Повторные Lighthouse/perf-замеры | Новые метрики в `docs/reference/perf-metrics.md` + README summary |
| MP-3 | M (M) | Static analysis + bundle monitoring | `npx madge`/import-order checks + CI guardrails на размеры чанков |
| MP-4 | M (S) | Документация и tooling вокруг тестов | Скрипт `ts:prune`, README policy, обновление lazy-docов и perf метрик |
| MR-1 | M (M) | Масштабирование `/api/transcript-search` | server-side retrieval без full collection scan |
| MR-2 | ✅ | Починить `npm run test:ci` | Закрыта 2026-04-27: `--runInBand` → `--no-file-parallelism` (Vitest 4 эквивалент) в `test:ci` и `test:integration`. |
| MR-3 | M (S) | Убрать `lessonRef as never` | типизированный payload dynamic course lessons |
| MR-4 | ✅ | Починить stale `authStore.test.ts` | Закрыта 2026-04-27: переписан под `UserRole = 'admin' \| 'super-admin' \| null`, убраны проверки удалённого `isStudent`, добавлен кейс role=null. 2/2 зелёных. |
| UX-1 | L (L) | Profile v2 — унификация с акварельной палитрой | ожидаем брендбук от дизайнера, после — полный редизайн Profile + вложенных секций |
| LP-1 | L (M) | Observability / telemetry | Базовый logger (Sentry/PostHog), описание процессов |
| LP-5 | L (S-M) | Firebase/GCP follow-ups | dependency review, cleanup policy, индексы, Telegram formatting |
| RS-1 | M (M) | Глубокий поиск через Wikidata | Кнопка + API параметр `deep=true`, расширение запроса через Wikidata |
| RS-2 | M (S) | Расширение словаря терминов | 500+ терминов RU→EN, словари для DE/FR/ES, JSON файлы |
| RS-3 | M (L) | Мультиязычный поиск (не фильтр) | Переключатель режима, перевод запроса на выбранные языки |
| CQ-1 | ✅ | Рефакторинг монолитов (>400 строк) | common.ts, ThemePicker.tsx, tests.ts разбиты (2026-01-08) |
| CQ-2 | ✅ | Устранение дублирования кода | BaseModal, useClickOutside, shuffleArray созданы (2026-01-08) |
| CQ-3 | ✅ | Оптимизация Timeline ре-рендеров | React.memo, useMemo добавлены в TimelineCanvas (2026-01-08) |
| CQ-4 | M (L) | Покрытие юнит-тестами stores/hooks | useAuthStore, useTestStore, testAccess — см. секцию TQ |
| CQ-5 | ✅ | Исправление console.* нарушений | Все заменены на debugLog/debugError (2026-01-08) |
| TQ-1 | M (M) | Юнит-тесты для утилит | theme.ts, sortNotes.ts, mediaUpload.ts и др. |
| BR-1 | ✅ | Sentence-based Chunking | Чанки по предложениям, overlap по предложениям |
| BR-2 | L (L) | Semantic Chunking | Определение глав/разделов, иерархия в метаданных |
| BR-3 | L (S) | Кэширование RAG-ответов | Firestore cache, TTL 7 дней |
| BR-4 | M (M) | Интеграция книг с заметками | Блок "Что говорят книги" в Notes |
| BR-5 | M (M) | Объяснения из книг после тестов | Кнопка "Узнать подробнее" при ошибке |
| BR-6 | M (M) | Семантический поиск по контенту | RAG для курсов (расширение Book RAG) |
| BR-7 | M (L) | Персональные книги пользователей | Свои PDF у студента (как заметки/таймлайн), privacy/quota, upload+ingestion, UI в Profile |
| AD-1 | ✅ | Admin events UX v2: edit modals + calendar grid + week view + search | Закрыт волной 5 (2026-04-26): /admin/announcements целиком переписан под Google-Calendar-style UX. Edit modals с GCal lastWriteSource fix (5.1), монт-grid + filtered list (5.2), week view + search + multi-group color-coding (5.3). 55 unit-тестов в 8 файлах. |
| AD-2 | ✅ | Admin-редактор страницы `/about` | Закрыт волной HM-3: контент `/about` в `pages/about`, редактор `/superadmin/pages/about` (2026-04-26) |
| HM-1 | ✅ | Continue-cards: настройка «актуальных» курсов | Поля `featuredCourseIds` у `groups/{id}` и `users/{id}` (max 3), волна 3 |
| HM-2 | ✅ | `/about` → вкладочная структура + страницы проектов | 6 вкладок, шаблон `<ProjectPage>` (волна 3) |
| HM-3 | ✅ | Супер-админский редактор статических страниц | `/superadmin/pages` + редакторы `/about` и `projectPages/{slug}` через client SDK + rules (2026-04-26) |
| HM-4 | L (S) | Чекбокс «не присылать email о бронях кабинетов» | Профиль студента → флаг → Cloud Function рассылки уважает флаг при подтверждении броней |
| HM-5 | L (S) | Vite dev overlay на `/booking`: «Cannot find module bookingCancellation.js» | Пред-существующая проблема (импорт в `api/booking.ts` появился в `8c53242`); прод-сборка работает, ломается только dev ESM-резолвер. Поправить vite/api dev-конфиг или alias |

---

## 🔴 High Priority

### HR‑2. Закрыть booking email-login auth bypass (P: H, E: S-M)
- **Источник:** code review `2026-04-27`, см. `docs/reports/CODE_REVIEW_MAIN_2026-04-27.md`.
- **Проблема:** `api/auth.ts?action=loginByEmail` выдаёт Firebase custom token по одному только verified email. Клиент `src/pages/booking/AuthModal.tsx` сразу вызывает `signInWithCustomToken`. Текущий тест `tests/api/booking-login.test.ts` закрепляет это поведение.
- **Риск:** зная email существующего verified пользователя, можно войти в его аккаунт без проверки владения почтой в момент входа.
- **Задачи:**
  - [ ] Убрать выдачу Firebase custom token по одному email.
  - [ ] Перевести booking email-вход на стандартный Firebase email-link/password flow или одноразовый server-side challenge.
  - [ ] Переписать `tests/api/booking-login.test.ts` под новую модель.
  - [ ] Обновить `docs/guides/booking-system.md`, где сейчас описан устаревший Email+password flow.
  - [ ] Прогнать `npm test -- --run tests/api/booking-login.test.ts tests/api/booking.test.ts`, `npm run typecheck:api`, `npm run typecheck:app`, `npm run validate`.

### CQ‑6. ✅ Починить TS lint + console guardrails — РЕШЕНО (волна 7, 2026-04-27)
- **Решение:** коммиты `9dac357..b4a47fc` в `feature/initial-setup-sergo`.
- **Что сделано:**
  - [x] `eslint.config.js`: блок `**/*.{ts,tsx}` через `typescript-eslint` v8 (без typed-rules для скорости). `no-console: error`, `no-unused-vars: warn` + базовые legacy-правила понижены до warn. Override-блок: `**/lib/debug.ts`, `scripts/`, `src/scripts/`, `tests/`, `**/*.test.*`, `timeline/utils/exporters/common.ts` → `no-console: off`.
  - [x] `scripts/check-console.cjs`: режим `--all` (full-repo), `TARGET_DIRS` расширен на `api/`, `ALLOWED_PREFIXES = ["src/scripts/"]` для CLI.
  - [x] `package.json`: `check-console` (--all, для validate), `check-console:staged` (pre-commit, быстрый).
  - [x] `.husky/pre-commit` переключен на `:staged`.
  - [x] 50 runtime `console.*` → `debugLog/debugError/debugWarn`.
  - [x] Whitelist для production-error reporting: `api/assistant.ts` (catch Gemini), `src/lib/errorHandler.ts` (центральный app-error reporter) — eslint-disable + ALLOWED + комментарий.
  - [x] `docs/architecture/guidelines.md`, `CLAUDE.md` синхронизированы с реальной конфигурацией.
- **Финал:** `npm run validate` зелёный (0 errors, ~79 pre-existing warnings unused-vars/react-hooks).

### HR‑1. ✅ Защита `/api/books` — РЕШЕНО (волна 6, 2026-04-26)
- **Решение:** `list` / `snippet` остались публичными (read-only из Firestore), но получили rate-limit 60 req/min на IP. `search` / `answer` теперь требуют:
  - Firebase Bearer ID token в заголовке Authorization (`verifyAuthBearer`).
  - **Strict BYOK Gemini ключ** через `X-Gemini-Api-Key` (`requireBYOKGeminiKey` без env fallback). Если ключа нет — `402 BYOK_REQUIRED` с подсказкой подключить ключ в профиле.
  - Rate-limit 20 req/min на IP.
  - CORS allowlist через `src/lib/appOrigins.ts` (academydom.com, vercel preview, localhost) — больше нет `Access-Control-Allow-Origin: *`.
- **Прод-ключ из env** удалён из user-facing path в `/api/books`. Singleton `genaiClient` убран; каждый запрос идёт под BYOK ключ. `GEMINI_API_KEY` в env остаётся только для server-side admin-функций (формирование новостей, ingestion, скрипты).
- **Бонус:** счётчик BYOK-usage в профиле. После каждого успешного search/answer записывается `aiUsageDaily/{uid}_{day}` с tokens (из `usageMetadata.totalTokenCount`) и requests. На `/profile` блок «Использование сегодня» показывает: «N / 1500 запросов» + «X токенов (оценка)». Read разрешён только владельцу через Firestore rules.
- **Helper в `src/lib/api-server/sharedApiRuntime.ts`** (не в `api/lib/`!) — общий код CORS/auth/BYOK/rate-limit/usage tracking, готов к переиспользованию в других AI-endpoints.
- **Коммиты:** `0012100` (основная реализация), `2505b25` (move helper для соблюдения Vercel 12-fn лимита).
- **Frontend:** `useBookAnswer` передаёт Authorization Bearer + X-Gemini-Api-Key, проверяет наличие ключа до запроса (показывает спец-ошибку с CTA в профиль). `GeminiKeySection` расширен пошаговой инструкцией «Как получить ключ» (4 шага, ссылка на aistudio.google.com/apikey, бесплатный лимит ~1500 RPD).

### HP‑1. Nightly интеграционные тесты (P: H, E: S — осталась CI часть)

**Локальный прогон — ✅ РЕШЕНО (2026-04-27).** До этого 4 эмулятор-зависимых теста не работали ни у кого: пути в `firebase.test.json` были битые, в `helper.ts` не было `storageBucket` для admin app, и Firebase JS SDK не подключался к эмуляторам. Сейчас одна команда `npm run test:integration` поднимает эмуляторы, прогоняет тесты, гасит — 6/6 зелёных.

Что починено:
- [x] `tests/integration/firebase.test.json`: пути `firestore.rules`/`storage.rules` относительно директории config-файла (раньше `tests/integration/...` от корня → firebase-tools резолвил в `tests/integration/tests/integration/...`).
- [x] `tests/integration/helper.ts:getAdminApp()`: `storageBucket` добавлен в `initializeApp()` — без него `admin.storage().bucket()` падал.
- [x] `tests/integration/helper.ts:setupIntegrationEnv()`: явный `connectFirestoreEmulator/connectAuthEmulator/connectStorageEmulator` для Firebase JS SDK — оно (в отличие от `firebase-admin`) не подхватывает `FIRESTORE_EMULATOR_HOST` из env.
- [x] `package.json`: `test:integration` через `firebase emulators:exec` (autoboot эмуляторов), `VITEST_INTEGRATION=1` для надёжной активации integration setup; добавлен `test:integration:watch` для разработки.
- [x] `docs/guides/testing-system.md`: integration-секция расширена требованиями (Java 11+, firebase-tools, порты), watch-сценарием, явной пометкой про бесплатность.

CI часть (осталась):
- [ ] GitHub Actions workflow `nightly-integration.yml`: cron-расписание, setup Java 21 + firebase-tools, прогон `npm run test:integration`, артефакты при падении.
- [ ] Service account secret для Firebase в GitHub Secrets (или demo project — эмуляторы не требуют реального).
- [ ] Нотификация при падении (Slack/email).
- [ ] Документировать «Как читать nightly-прогоны» в `docs/guides/testing-system.md`.

### HP‑2. Полное Playwright покрытие (P: H, E: L)
- [ ] Подготовить seed-данные (Firestore/Storage) для e2e сценариев с реальной авторизацией.  
- [ ] Добавить сценарии: login + просмотр периодов, прохождение теста с prerequisite, CRUD заметок + экспорт, работа таймлайна (создание/перемещение событие), админ-флоу (назначение ролей, редактирование контента).  
- [ ] Отдельно прогнать smoke на Slow 3G — убедиться в корректной работе fallback-компонентов.  
- [ ] Настроить нотификации (Slack/email) при падениях и расширить `docs/guides/testing-system.md` разделом про e2e (структура, команды, расположение traces).

#### HP‑2.A Text selection issue - ✅ РЕШЕНО (2025‑11‑15, Claude Sonnet 4.5)
- **Проблема:** текст на сайте не выделяется мышкой (Chrome/Safari), вместо выделения происходит "драг"
- **Корневая причина:** В `src/index.css` отсутствовали CSS правила `user-select: text` для обычных текстовых элементов (h1, p, div, span и т.д.)
- **Решение:**
  - Добавлены глобальные CSS правила в `src/index.css` (строки 55-100)
  - Добавлены стили `::selection` для визуального выделения (синий фон, 30% прозрачность)
  - Очищены артефакты от неудачной попытки Codex (`useDisableDrag.ts`, документация в README)
  - Сохранён Playwright тест `tests/text-selection.spec.ts` от Codex
- **Результат:** ✅ **РЕШЕНО** - текст выделяется на всех страницах, подтверждено пользователем
- **Полная документация:** См. `docs/archive/legacy/TEXT_SELECTION_ISSUE.md` для истории всех попыток и финального решения

---

### HP‑3. ✅ Уязвимости в контейнерных образах функций — ИСПРАВЛЕНО (2026-02-06)
- **Контекст:** Автоматическое сканирование Artifact Registry выявило у образов `send_feedback` и `toggle_user_disabled` уровень **HIGH** (без CRITICAL) по состоянию на **2026-02-01**.
- **Решение:** `npm audit fix` в `functions/` + `firebase deploy --only functions`
- **Обновлённые пакеты:**
  - `qs` 6.13.0 → 6.14.1 (CVE-2025-15284)
  - `node-forge` 1.3.1 → 1.3.3 (CVE-2025-12816, CVE-2025-66031)
  - `jws` 3.2.2/4.0.0 → 3.2.3/4.0.1 (CVE-2025-65945)
  - `fast-xml-parser` 4.5.3 → 5.3.4 (GHSA-37qj-frw5-hhjh)
  - `@google-cloud/storage` 7.17.2 → 7.19.0, `express` 4.21.2 → 4.22.1
- **Остаток:** Go stdlib CVEs (buildpack-level, ждём обновления от Google), `tar` (не в npm tree, в buildpack)
- **Документация:** `docs/security/container-scanning-2026-02-01.md`
- [x] Обновить зависимости — выполнено
- [x] Пересобрать и задеплоить — 17 функций задеплоены
- [x] Задокументировать итог — обновлено
- [ ] Перепроверить сканы через ~30 мин после деплоя
- [ ] Добавить процесс: ежемесячный security-review образов  

---

## ⚖️ Medium Priority

### MP‑1. ✅ Изоляция хук-логики Timeline — ВЫПОЛНЕНО (2026-04)
- [x] Хуки вынесены в отдельные файлы: `useTimelineCRUD`, `useTimelineDragDrop`, `useTimelineHistory`, `useTimelinePanZoom`, `useTimelineBranch`, `useTimelineBirth`, `useTimelineForm`, `useDownloadMenu`
- [x] Отдельный chunk `timeline-hooks` в `vite.config.js`
- [x] Экспорт через `src/pages/timeline/hooks/index.ts`

### MP‑2. Повторные Lighthouse/Perf измерения (P: M, E: S)
- [ ] Повторно запустить Lighthouse для `/`, `/tests`, `/timeline`, `/admin` после завершения ленивой миграции.  
- [ ] Обновить `docs/reference/perf-metrics.md` и кратко отразить результаты в README (Baseline vs Current).  
- [ ] Зафиксировать исходники отчётов (пути к JSON) в `docs/archive/legacy/lazy-loading-migration.md` или `logs/`.

### MP‑3. Static analysis + bundle monitoring (P: M, E: M)
- [ ] Добавить проверку циклических зависимостей (`npx madge --circular src`) в `npm run validate` или отдельный скрипт.  
- [ ] Ввести линт правил для порядка импортов и запрета «опасных» top-level вызовов (`export const foo = imported.bar()`), зафиксировать политику в `docs/architecture/guidelines.md`.  
- [ ] В CI проверять размеры чанков (`npm run build` + fail, если timeline chunk > 1 MB или любой другой > 500 KB).

### MP‑4. Документация и tooling (P: M, E: S)
- [ ] Добавить npm-скрипт `ts:prune` + инструкцию в README, как читать отчёт (`npx ts-prune`).
- [ ] Явно закрепить в README требование прочитать `docs/architecture/guidelines.md` и `docs/guides/testing-system.md` перед началом задач.
- [ ] Обновить ленивую документацию: описать политику добавления новых lazy-страниц и итоговые метрики в `docs/archive/legacy/lazy-loading-migration.md` / README, синхронизировать `docs/reference/perf-metrics.md` после завершения работ.

### MR‑1. Масштабирование `/api/transcript-search` (P: M, E: M)
- **Проблема:** клиентский preload уже убран, но `api/transcript-search.ts` по-прежнему делает `collectionGroup(...).get()` по всему transcript-search индексу на каждый запрос и фильтрует результаты в памяти.
- **Риск:** latency, cost и memory usage растут линейно от общего числа chunks; проблема больше не на клиенте, а на request path сервера.
- **Подтверждение:** review `2026-03-12`, см. `docs/reports/CODE_REVIEW_2026-03-12.md`; повторно подтверждено review `2026-04-27`, см. `docs/reports/CODE_REVIEW_MAIN_2026-04-27.md`.
- **Задачи:**
  - [ ] Убрать full collection scan из hot path `GET /api/transcript-search`.
  - [ ] Спроектировать индекс/lookup/sharding стратегию под query-time retrieval.
  - [ ] После правки smoke-проверить глобальный поиск по транскриптам и обновить docs по search pipeline.

### CQ‑7. Рефакторинг новых монолитов и дублей (P: M, E: L)
- **Источник:** code review `2026-04-27`, см. `docs/reports/CODE_REVIEW_MAIN_2026-04-27.md`.
- **Проблема:** после закрытых ранних CQ-задач в проекте снова появились крупные runtime-файлы и дубли helper-логики. На момент ревью: 57 runtime-файлов >300 строк, 13 >500, 2 >800. Крупнейшие: `src/pages/DisorderTable.tsx` (1315), `api/papers.ts` (1206), `src/pages/home/HomeDashboard.tsx` (797), `api/assistant.ts` / `api/lectures.ts` / `api/books.ts`.
- **Риск:** сложность ревью, высокая связность, локальные изменения чаще цепляют соседнее поведение.
- **Задачи:**
  - [ ] Разбить `src/pages/DisorderTable.tsx` на components/hooks: фильтры, модалки, comments, entry form, matrix view.
  - [ ] Свести course navigation helpers к одному canonical path (`AppShell.jsx`, `useCourseNavItems.ts`, `courseLessons.ts` сейчас частично дублируются).
  - [ ] Свести API runtime helpers: Firebase init, CORS, auth/BYOK/rate-limit без нарушения Vercel function limit.
  - [ ] Проверить и удалить устаревший дубль `api/lectureTranscriptFallback.ts`, если он действительно не используется.
  - [ ] Вернуть route-level lazy discipline для `PeriodPage` и `DynamicCoursePeriodPage` через `src/pages/lazy.ts`.
  - [ ] Синхронизировать `docs/reference/routes.md`, `docs/guides/booking-system.md`, `docs/reference/firestore-schema.md` после исправлений.

### MR‑2. ✅ Починить `npm run test:ci` — РЕШЕНО (2026-04-27)
- **Решение:** `--runInBand` снят в Vitest 4. Заменён на `--no-file-parallelism` (canonical эквивалент: последовательный прогон файлов в одном пуле). Применено и к `test:ci`, и к `test:integration` / `test:integration:watch`.
- **Что сделано:**
  - [x] `test:ci`: `vitest --runInBand` → `vitest --no-file-parallelism`.
  - [x] `test:integration`/`test:integration:watch`: тот же флаг.
  - [x] Smoke-прогон `npx vitest --no-file-parallelism run tests/integration/authStore.test.ts` — зелёный.

### MR‑3. Убрать `lessonRef as never` в dynamic course creation (P: M, E: S)
- **Проблема:** `src/hooks/useCreateCourse.ts` пишет lesson doc через `setDoc(lessonRef as never, ...)`, маскируя реальную проблему типизации payload/ref.
- **Риск:** type system не защищает от schema drift в dynamic lessons.
- **Подтверждение:** review `2026-03-12`, см. `docs/reports/CODE_REVIEW_2026-03-12.md`.
- **Задачи:**
  - [ ] Вынести явный тип lesson payload для dynamic course lessons.
  - [ ] Типизировать `getCourseLessonDocRef` и `setDoc` без `never`.
  - [ ] После правки прогнать `typecheck:app` и smoke создания нового курса.

### MR‑4. ✅ Починить устаревший `authStore.test.ts` — РЕШЕНО (2026-04-27)
- **Решение:** тест переписан под актуальную модель `UserRole = 'admin' | 'super-admin' | null`.
- **Что сделано:**
  - [x] Убраны ссылки на удалённый `store.isStudent` в `resetState` и обоих it-блоках.
  - [x] Тест-кейс «студент» переименован в «role=null» — проверяет, что `isAdmin/isSuperAdmin` сбрасываются в false при `setUserRole(null)` (студенты/гости — это `userRole === null`, фактическая роль вычисляется через `computeDisplayRole(userRole, courseAccess)` поверх).
  - [x] Не дублирует `roleHelpers.test.ts` — там тестируется чистая функция `computeDisplayRole`, здесь — собственно стор и derivation `isAdmin/isSuperAdmin` от `setUserRole`.
  - [x] 2/2 зелёных в локальном прогоне.

### UX‑1. Profile v2 — унификация с акварельной палитрой (P: L, E: L)
- **Проблема:** Profile.tsx оставлен в старой палитре: синий→фиолетовый градиент в hero-полосе, `bg-teal-*` / `bg-blue-*` / `bg-purple-*` / розово-фуксиевый gradient в `SuperAdminBadge`, `SearchHistorySection`, `GeminiKeySection`, `FeedbackButton variant="profile"`. Минимальная правка (hero max-w-4xl, role badges, avatar fallback) сделана в `9107e62`, остальное откладываем до получения брендбука от дизайнера.
- **Риск:** визуальный диссонанс при переходе между /home (акварельная палитра) и /profile. Не блокер релиза.
- **Как делать:**
  - [ ] Дождаться брендбука — цветовой системы, типографики, tone-of-voice.
  - [ ] Переработать hero-полосу (убрать синий→фиолетовый gradient).
  - [ ] `SuperAdminBadge.tsx`: заменить `bg-gradient-to-r from-purple-600 to-pink-600` на один токен акцента.
  - [ ] `FeedbackButton variant="profile"`: заменить teal→cyan gradient на нейтральный card/accent стиль.
  - [ ] `SearchHistorySection` (445 строк, крупнейший): табы, «Показать все», карточки истории — перевести на `bg-card` / `bg-accent-100` / `text-fg` / `text-muted`.
  - [ ] `GeminiKeySection`: пройтись точечно по `bg-blue-*` / `text-gray-*`.
  - [ ] По возможности — обернуть каждую вложенную секцию в общую `bg-card rounded-2xl border border-border shadow-brand p-5` (как на /home).

### AD‑1. Admin events UX v2: редактирование + календарь-центричный CRUD (P: M, E: M-L)
- **Проблема:** `/admin/announcements` позволяет только создавать и удалять события/объявления/задания. `updateGroupEvent` и `updateGroupAnnouncement` определены в `src/hooks/useGroupFeed.ts`, но UI их не вызывает — чтобы исправить время/ссылку/текст, админу приходится удалять и создавать заново. Сверху три отдельных формы, снизу три простых списка — с ростом числа событий (сейчас уже ~50 после импорта из GCal) такой UI становится неудобным.
- **Идея:** похожий на Google Calendar интерфейс для админа: основной блок — календарь-grid (месяц/неделя), клик по дню открывает модалку «Новое событие» с предзаполненной датой; клик по существующему событию — модалка редактирования. Снизу список событий с фильтрацией по группе/типу/периоду. Селектор группы перемещается в панель над календарём.
- **Варианты скоупа (выбрать при старте):**
  - **A (малый, ~2ч):** только кнопка «Редактировать» на карточках в текущих списках — переиспользуем `updateGroupEvent` / `updateGroupAnnouncement`. UI не перестраиваем. Закрывает главную ежедневную боль.
  - **B (1-2 дня):** полный календарь-центричный UI как в Google Calendar — grid + клики + drag?, список снизу с фильтром.
  - **C (~4-5ч):** промежуточный — формы сверху оставить, списки превратить в неделю-сетку с кликабельными событиями.
- **Что помнить:**
  - При edit event'а с `lastWriteSource='gcal'` нужно ставить `lastWriteSource='firestore'`, чтобы `onGroupEventWrite` триггернул export в GCal.
  - Booking (`WeekSchedule`) — неподходящий референс по коду: заточен под timeslot-grid кабинетов. Как визуальный образец — ок.
  - Events уже имеют `startAt`/`endAt` (точные) после BR-9 — сетку строить из них, а не из `dateLabel` regex.

### AD‑2. Admin-редактор страницы `/about` (P: M, E: M)
- **Проблема:** Сейчас контент страницы `/about` (миссия проекта + список партнёров) хранится хардкодом в `src/pages/AboutPage.tsx` — массивы `MISSION_PARAGRAPHS` и `PARTNERS`. Чтобы изменить текст или добавить нового партнёра, нужен релиз. По мере роста числа партнёров и обновлений миссии — это станет узким местом.
- **Идея:** перевести контент `/about` в Firestore (документ `pages/about` с полями `mission: string[]`, `partners: Partner[]`), а в супер-админке добавить редактор по образцу того, что используется для страниц «О курсе» (sections-формат, multi-paragraph редактирование). На фронтенде `/about` читает данные из Firestore, fallback — текущие константы.
- **Объём:**
  - Firestore: документ `pages/about`, миграционный скрипт для первичного заполнения текущим черновиком.
  - Backend: Cloud Function или прямые правила доступа (super-admin only на запись).
  - Client: хук `useAboutPageContent`, рефакторинг `AboutPage.tsx` на чтение из хука с fallback на константы.
  - Admin UI: страница `/admin/about-editor` (или встроенный редактор в существующей структуре админки) — переиспользует компоненты редактора курсовых страниц.
- **Что помнить:**
  - Посмотреть `docs/guides/multi-course.md` и реализацию редактора страниц «О курсе» — структура sections-формата, save/load паттерн.
  - В Firestore rules — write только для super-admin, read — публичный (страница `/about` доступна гостям).
  - Раздел партнёров уже спроектирован массивом `{ name, description, url?, logo? }` — миграция в Firestore прямолинейна.
  - При rollout — оставить fallback на хардкод (если документ ещё не создан).

### HM‑1. Continue-cards: настройка «актуальных» курсов (P: M, E: S)
- **Проблема:** Сейчас в блоке «продолжить курс» на `/home` показываются первые 2 курса из `useCourses()` без учёта реального фокуса студента. По мере роста каталога это перестаёт отражать «что я сейчас читаю».
- **Идея:**
  - Поле `featuredCourseIds: string[]` (max 3) в Firestore у `groups/{id}` и у `users/{id}`.
  - Логика выбора continue-cards (`primaryContinueCourses` в `HomeDashboard.tsx`):
    1. `users/{me}.featuredCourseIds` — приоритет 1.
    2. Иначе `groups/{myGroup}.featuredCourseIds`.
    3. Иначе — последний просмотренный курс (метка last-watched сохраняется всегда, даже если курс не «актуальный»).
    4. Иначе (нет просмотров и нет настроек) — текстовый блок-заглушка с CTA «Выберите актуальные курсы в профиле».
- **UI:**
  - Админка группы — мульти-селект курсов «Актуальные курсы группы» (max 3).
  - Профиль студента — мульти-селект курсов «Мои актуальные курсы» (max 3).
- **Что помнить:**
  - «Открытый» и «актуальный» — разные понятия. Открытые — на что есть доступ. Актуальные — что сейчас активно проходит.
  - Лимит карточек 3 уже выставлен в `HomeDashboard.tsx`.

### HM‑2. `/about` → вкладочная структура + страницы проектов (P: M, E: M)
- **Проблема:** `/about` сейчас одна простыня (миссия + партнёры). Нужно расширить под несколько разделов и архитектурно подготовить страницы под отдельные проекты академии.
- **Структура `/about` (вкладки на одной странице, раскрываются):**
  1. Проект «Академия» — главное о проекте.
  2. Команда сайта — кто разрабатывает платформу.
  3. Команда академии — преподаватели и кураторы.
  4. История сайта.
  5. Партнёры — сводный список партнёрских центров и проектов.
- **Страницы проектов академии:**
  - Каждый проект академии — отдельная страница в стилистике сайта (фото + текст), как уже сделана `WarmSprings2Page` («Тёплые ключи»). Это не лендинг, а контентная страница.
  - Нужен повторяемый шаблон, чтобы суперадмин (после HM‑3) мог быстро завести новый проект.
- **Что помнить:**
  - Не превращать страницы проектов в маркетинговые лендинги. Они часть сайта, в общей watercolor-палитре.
  - Партнёры приходят со своих сайтов — текст соберём из их источников и перепишем в стиле сайта.

### HM‑3. Супер-админский редактор статических страниц (P: M, E: L)
- **Расширение AD‑2.** Вместо одного редактора `/about` — общий редактор для нескольких страниц: `/about` (с вкладками HM‑2), страницы проектов, страница партнёров.
- **Идея:**
  - Коллекция `pages/{pageId}` в Firestore. Каждая страница — sections-формат (как у курсов).
  - В супер-админке — список страниц с быстрым переходом в редактор (по образцу того, как сделан редактор страниц «о курсе»).
  - Заведение новой страницы проекта — кнопкой «Новый проект» в админке: создаёт документ + регистрирует маршрут.
- **Что помнить:**
  - В rollout — fallback на хардкод-контент пока документ не создан в Firestore.
  - Firestore rules: write — только super-admin, read — публичный.

### HM‑4. Чекбокс «не присылать email-подтверждения броней» (P: L, E: S)
- **Проблема:** На каждое бронирование кабинета центра «Dom» прилетает отдельный email подтверждения. Постоянным клиентам это превращается в спам.
- **Идея:** Чекбокс в профиле студента «Не присылать email-подтверждения броней». Cloud Function, рассылающая подтверждения, читает флаг и пропускает рассылку для пользователей с включённым флагом.
- **Что не делать:** Не отключать другие email-уведомления (события групп, объявления) — только бронь.

### HM‑5. Vite dev overlay на `/booking`: «Cannot find module bookingCancellation.js» (P: L, E: S)
- **Симптом:** При открытии `/booking` на dev-сервере (`npm run dev`) поверх контента появляется красный overlay Vite с текстом «Cannot find module '/Users/.../src/lib/bookingCancellation.js' imported from .../api/booking.ts». Реальный контент за overlay рендерится корректно. На прод-сборке ошибки нет.
- **Контекст:** Импорт `import { canCancelBooking } from '../src/lib/bookingCancellation.js'` в [api/booking.ts](api/booking.ts) появился в коммите `8c53242` (давно на main). Аналогичный по стилю импорт `appOrigins.js` из того же `src/lib/` работает без overlay — значит дело не в `.js`-расширении как таковом, а в node ESM-резолвере, которого касается `vite-config.js.timestamp-...`.
- **Идея:** Поправить Vite/api dev-конфиг — либо алиасом, либо плагином/`resolveExtensions`. Возможно нужен SSR-friendly импорт или явная конфигурация в `vite.config.js` для api-роутов.
- **Что помнить:** Не блокирует прод и не связан с волнами 1-2 (импорт вне их). Симптом найден при смоук-тесте Smoke A (2026-04-26).

### MP‑5. ✅ Исправление заглушки для clinical/general курсов - РЕШЕНО (2025-11-19)
- **Проблема:** Заглушка показывалась даже когда `placeholder_enabled = false` если sections были пустыми
- **Решение:** Изменена логика в `PeriodPage.tsx:84`:
  - Было: `placeholderEnabled || (!hasSections && placeholderMessage.length > 0)`
  - Стало: `placeholderEnabled === true || (placeholderEnabled !== false && !hasSections && placeholderMessage.length > 0)`
- **Результат:** Если `placeholder_enabled` явно `false`, контент показывается даже если sections пустые
- **Коммит:** `f3ba86b`

### MP‑6. ✅ Миграция данных Психологии развития на формат sections - РЕШЕНО (2025-11-19)
- **Выполнено:**
  - ✅ Создан backup: `backups/periods-backup-2025-11-19T12-44-40.json`
  - ✅ Написан скрипт миграции: `scripts/migrate-periods-to-sections.cjs`
  - ✅ Мигрированы все 14 периодов + intro на sections формат
  - ✅ Удалена функция `convertLegacyToSections` из `PeriodPage.tsx`
  - ✅ Исправлен `usePeriods.ts` для приоритизации sections из Firestore
  - ✅ Добавлен фиксированный порядок секций (`SECTION_ORDER`) в `PeriodSections.tsx`
- **Результат:** Все 3 курса используют единый sections формат
- **Коммиты:** `6ca0e14`, `bba4e1d`

---

## 💤 Low Priority

### LP‑1. Observability / Telemetry (P: L, E: M)
- [ ] Выбрать и внедрить базовый инструмент (Sentry, Firebase Analytics, PostHog).
- [ ] Логировать критические события: ошибки авторизации, проваленные загрузки, неуспешные записи Firestore.
- [ ] Добавить в документацию раздел «Observability»: как читать алерты, где искать логи, кто on-call.

### LP‑2. Рефакторинг HomePage на компоненты (P: L, E: S)
- **Проблема:** Файл `src/pages/HomePage.tsx` составляет 364 строки — близко к порогу 🟡 (400 строк)
- **Триггер:** Если файл вырастет > 400 строк, необходимо разбить на компоненты
- **Текущий статус:** 🟡 Приемлемо (364 строки), но следует мониторить рост
- **Задачи:**
  - [ ] Вынести render-функции секций в отдельные компоненты:
    - `src/components/home/CTASection.tsx`
    - `src/components/home/HeroSection.tsx`
    - `src/components/home/EssenceSection.tsx`
    - `src/components/home/StructureSection.tsx`
    - `src/components/home/PeriodsSection.tsx`
    - `src/components/home/OrganizationSection.tsx`
    - `src/components/home/InstructorsSection.tsx`
    - `src/components/home/FormatSection.tsx`
  - [ ] Создать barrel export `src/components/home/index.ts`
  - [ ] Обновить `HomePage.tsx` для использования новых компонентов
  - [ ] Проверить что размер файла < 200 строк после рефакторинга
- **Файлы:** `src/pages/HomePage.tsx` (364 строки)

### LP‑3. Улучшение Rate Limiting для AI Assistant (P: L, E: S)
- **Проблема:** In-memory rate limiting в `api/assistant.ts` не работает корректно на Vercel Serverless (каждый инстанс имеет свою память)
- **Текущий статус:** 🟡 Работает для легкой нагрузки, но не масштабируется
- **Решение:** Использовать Upstash Redis или Vercel KV для распределенного rate limiting
- **Задачи:**
  - [ ] Выбрать провайдер (Upstash Redis / Vercel KV)
  - [ ] Реализовать distributed rate limiting
  - [ ] Обновить документацию и env vars
- **Файлы:** `api/assistant.ts` (строки 39-58)

### LP‑4. Очистка fallback env vars в AI Assistant (P: L, E: S) - ✅ МОЖНО ПРОПУСТИТЬ
- **Проблема:** В `api/assistant.ts:178` есть fallback на несколько env var имён (MY_GEMINI_KEY, GOOGLE_API_KEY, VITE_GEMINI_KEY)
- **Контекст:** Добавлено при отладке, когда Vercel Dashboard не сохранял env vars
- **Решение:** Сейчас работает GEMINI_API_KEY, остальные можно удалить
- **Статус:** 🟢 Не критично — fallbacks не мешают, но добавляют шум в код

### LP‑5. Firebase/GCP follow-ups (P: L, E: S-M)
- **Контекст:** миграция с `functions.config()` уже закрыта 2026-03-09 (`seedAdmin` переведён на Secret Manager, runtime guard блокирует новые legacy-конфиги). Ниже оставлены только активные follow-up задачи.

#### 1. Firebase Functions dependency review
- **Проблема:** `functions/package.json` сейчас использует `firebase-functions@^5.0.0`; зависимость нужно регулярно сверять с release notes перед следующими platform upgrades.
- **Решение:**
  - [ ] Проверить актуальность ветки `firebase-functions` перед следующим deploy-циклом.
  - [ ] Если потребуется upgrade, прогнать `cd functions && npm test && npm run build` и smoke критических функций.
  - [ ] Обновить changelog/docs по деплою при смене major/minor policy.
- **Предупреждение:** ⚠️ Возможны breaking changes
- **Оценка:** 30-90 минут

#### 1.A Telegram Markdown escaping cleanup
- **Проблема:** `escapeMarkdown` в weekly transcript report экранирует не весь набор специальных символов Telegram Markdown, из-за чего будущие error/message строки могут ломать форматирование уведомления.
- **Решение:**
  - [ ] Выбрать и зафиксировать один режим форматирования (`Markdown` vs `MarkdownV2`) для Telegram-уведомлений
  - [ ] Доработать helper экранирования под выбранный режим и покрыть его unit-тестами
  - [ ] Прогнать smoke weekly report после правки
- **Приоритет:** 🟢 Низкий
- **Оценка:** 20-40 минут

#### 2. Container Images Cleanup Policy (europe-west1)
- **Проблема:** Нет cleanup policy для Docker образов Cloud Functions в region `europe-west1`
- **Влияние:** Небольшой месячный счёт (~$1-5/месяц) из-за накопления старых образов
- **Решение (опция 1):** Автоматическая настройка при деплое
  ```bash
  firebase deploy --only functions --force
  ```
- **Решение (опция 2):** Ручная настройка
  ```bash
  firebase functions:artifacts:setpolicy
  ```
- **Решение (опция 3):** Через GCP Console
  - Artifact Registry → Repositories → gcf-artifacts (europe-west1) → Cleanup Policies
  - Создать политику: Keep last 10 images, delete older than 30 days
- **Приоритет:** 🟢 Низкий (только деньги, не функциональность)
- **Оценка:** 15 минут
- **Статус:** 🟡 Можно сделать при следующем деплое с `--force`

#### 3. Firestore Composite Indexes Missing
- **Проблема:** Нет composite индексов для adjacent chunks queries в `book_chunks`
- **Ошибка:** `9 FAILED_PRECONDITION: The query requires an index`
- **Нужные индексы:**
  1. `book_chunks`: `bookId` (ASC) + `pageEnd` (DESC) + `__name__` (ASC)
  2. `book_chunks`: `bookId` (ASC) + `pageStart` (ASC) + `__name__` (ASC)
- **Решение:**
  - [x] Обновлён `firestore.indexes.json` с индексами
  - [ ] Создать индексы через Firebase Console (ссылка в ошибке)
  - [ ] Альтернатива: `firebase deploy --only firestore:indexes --force`
- **Ссылка из ошибки:** https://console.firebase.google.com/v1/r/project/psych-dev-site-prod/firestore/indexes?create_composite=Cldwcm9qZWN0cy9wc3ljaC1kZXYtc2l0ZS1wcm9kL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9ib29rX2NodW5rcy9pbmRleGVzL18QARoKCgZib29rSWQQARoLCgdwYWdlRW5kEAIaDAoIX19uYW1lX18QAg
- **Приоритет:** 🔴 Высокий (блокирует функцию "раскрыть цитату")
- **Оценка:** 5 минут (клик в консоли, индексация 2-10 минут)
- **Статус:** ⏳ В процессе (индексы создаются)

---

## 🔬 Research Search (Научный поиск)

### RS‑1. Глубокий поиск через Wikidata (P: M, E: M)
- **Описание:** Реализовать кнопку "Глубокий поиск" с использованием Wikidata для автоматического расширения запроса
- **Как работает:**
  1. Пользователь вводит запрос (напр. "депрессия")
  2. Wikidata находит концепт (Q42844) и извлекает переводы/синонимы на все языки
  3. Поиск выполняется по всем вариантам параллельно
- **Задачи:**
  - [ ] Активировать существующий код Wikidata в `api/papers.ts` (wdSearch, wdGetEntities, buildQueryVariants)
  - [ ] Добавить параметр `deep=true` в API для включения Wikidata-расширения
  - [ ] Обновить UI кнопки "Глубокий поиск" для вызова API с `deep=true`
  - [ ] Показывать пользователю найденные варианты запроса (из meta.queryVariantsUsed)
- **Файлы:** `api/papers.ts`, `src/pages/ResearchPage.tsx`
- **Статус:** 🟡 Кнопка добавлена как заглушка

### RS‑2. Расширение словаря RU→EN терминов (P: M, E: S)
- **Описание:** Подгрузить качественные словари психологических терминов для перевода
- **Текущее состояние:** ~50 терминов в `RU_TO_EN_TERMS` (api/papers.ts:127-167)
- **Задачи:**
  - [ ] Найти/создать словарь психологических терминов RU→EN (500+ терминов)
  - [ ] Добавить словари для других языков (DE→EN, FR→EN, ES→EN)
  - [ ] Вынести словари в отдельные JSON файлы (`src/features/researchSearch/dictionaries/`)
  - [ ] Добавить механизм нормализации падежей (стемминг или лемматизация)
- **Источники словарей:**
  - Психологический словарь Мещерякова-Зинченко
  - APA Dictionary of Psychology
  - Wikidata labels/aliases для психологических концептов
- **Файлы:** `api/papers.ts`

---

## 📚 Book RAG (Поиск по книгам)

### BR‑1. ✅ Sentence-based Chunking (P: M, E: S) - РЕАЛИЗОВАНО (2025-12-25)
- **Описание:** Замена character-based chunking на sentence-based для лучших семантических границ
- **Реализация:**
  - Текст разбивается на предложения (regex с поддержкой RU/EN пунктуации)
  - Предложения группируются в чанки (5-15 предложений, 1500-2500 символов)
  - Overlap на уровне предложений (2 последних предложения → следующий чанк)
  - Fallback на character-based при очень длинных предложениях
- **Конфиг:** `functions/src/lib/chunker.ts` — `DEFAULT_CHUNK_CONFIG`
- **Результат:** Чанки заканчиваются на границах предложений, overlap семантически целостный

### BR‑2. Semantic Chunking (P: L, E: L)
- **Описание:** Полноценное семантическое разбиение с учётом структуры документа
- **Отличие от sentence-based:**
  - Sentence-based: разбивает по предложениям, но не учитывает главы/разделы
  - Semantic: определяет заголовки, параграфы, списки, цитаты — и разбивает по смыслу
- **Как реализовать:**
  1. **Извлечение структуры PDF** (2-3 дня):
     - Использовать `pdf-lib` или `pdfjs-dist` для получения стилей текста (размер шрифта, жирность)
     - Определять заголовки по размеру шрифта > среднего + жирность
     - Альтернатива: LLM-based определение структуры (дороже, но точнее)
  2. **Иерархический chunking** (1-2 дня):
     - Разбивать по главам, затем по разделам, затем по параграфам
     - Сохранять иерархию: `{ chapter: "Глава 3", section: "3.2 Методология", subsection: null }`
     - Не разрывать списки, таблицы, цитаты посередине
  3. **Изменение схемы Firestore** (1 день):
     - Добавить поля в `book_chunks`: `chapterTitle`, `sectionTitle`, `hierarchy`
     - Обновить индексы для фильтрации по главам
  4. **UI улучшения** (1 день):
     - Показывать главу/раздел в цитатах
     - Группировка результатов по главам
- **Библиотеки:**
  - `pdfjs-dist` — для стилей текста (но тяжёлая)
  - `pdf-parse` + регулярки для заголовков (проще, менее точно)
  - Gemini API для определения структуры (точно, но $)
- **Оценка:** 5-7 дней, ~70% улучшение качества по сравнению с sentence-based
- **Файлы:** `functions/src/lib/chunker.ts`, `functions/src/lib/pdfParser.ts`, `api/books.ts`
- **Статус:** 🔵 В бэклоге, ждёт приоритизации

### BR‑3. Кэширование RAG-ответов (P: L, E: S)
- **Описание:** Сохранять ответы на популярные вопросы для мгновенных ответов
- **Реализация:**
  - Коллекция `book_answer_cache` в Firestore
  - Ключ: SHA256(query + sorted(bookIds))
  - TTL: 7 дней, инвалидация при переиндексации книги
- **Выигрыш:** 50мс вместо 3-5с для повторных запросов
- **Файлы:** `api/books.ts`

### BR‑4. Интеграция книг с заметками (P: M, E: M)
- **Описание:** При написании заметки показывать релевантные фрагменты из книг
- **Реализация:**
  - В Notes добавить блок "Что говорят книги"
  - При выборе темы → автоматический поиск по книгам
  - Кнопка "Вставить цитату" в заметку
- **Файлы:** `src/pages/Notes.tsx`, `src/features/bookSearch/`

### BR‑5. Объяснения из книг после тестов (P: M, E: M)
- **Описание:** После неправильного ответа показывать объяснение из книг
- **Реализация:**
  - Кнопка "Узнать подробнее" при ошибке
  - RAG-запрос по теме вопроса
  - Показ релевантного фрагмента с источником
- **Файлы:** `src/pages/TestsPage.tsx`, `src/pages/DynamicTest.tsx`

### BR‑7. Персональные книги пользователей (P: M, E: L)
- **Описание:** Превратить общую RAG-библиотеку в персональное хранилище у каждого студента — по аналогии с заметками и таймлайном. Студент видит и ищет только свои книги + общие (admin-залитые).
- **Мотивация:** Пользовательский запрос (диалог 2026-04-22): «кнопочку books в профиль, она является частью хранилища каждого конкретного студента».
- **Текущее состояние:** Все книги глобальные, доступны всем. Кнопка «📚 Books» в `/admin/content` ведёт на `/admin/books`. Поиск через `api/books` возвращает все чанки всех книг.
- **Необходимые изменения (оценка 12–18 ч):**
  1. **Firestore schema:** добавить `ownerId?: string` в `books` и `book_chunks` (null → общая, uid → персональная).
  2. **Security Rules:** read — `ownerId == null || ownerId == request.auth.uid || isAdmin()`; write — только свои + админ.
  3. **Cloud Function `ingestBook`:** прокидывать `ownerId` в чанки при сохранении.
  4. **API (в существующих файлах — 12/12 впритык):**
     - `/api/books`: фильтрация выдачи по `ownerId ∈ {null, uid}` с проверкой auth.
     - Новые actions для user-uploads: `createMyBook`, `myUploadUrl`, `startMyIngestion`, `deleteMyBook` — в `/api/books` или `/api/admin/books`.
  5. **UI:** секция «Мои книги» в `/profile` (список со статусом, progress загрузки, удаление) + форма upload (переиспользовать компоненты `/admin/books`).
  6. **Поиск:** помечать результаты «Моя / Общая», опционально переключатель области.
  7. **Лимиты (критично для бюджета):** N книг на юзера, M MB на книгу, rate limit на ingestion, квота на Gemini embeddings.
- **Риски:**
  - Стоимость embeddings пользовательских книг (оплачивает владелец сайта).
  - Abuse: нелегальный контент / PII / спам — нужны модерация и админская возможность удалять чужие.
  - Rate limits Gemini + Firestore quota.
- **Связь:** смежная с HR-1 (защита `/api/books`). Реализовывать HR-1 перед или вместе с BR-7.
- **Приоритет реализации:** после мёржа `feature/initial-setup-sergo` в main.
- **Файлы:** `api/books.ts`, `api/admin/books.ts`, `functions/src/ingestBook.ts`, `firestore.rules`, `src/pages/Profile.tsx`, `src/pages/admin/books/`, `src/features/bookSearch/`.
- **Дата добавления:** 2026-04-22.

### BR‑6. Семантический поиск по контенту сайта (P: M, E: M)
- **Описание:** Расширить Book RAG инфраструктуру для семантического поиска по всему контенту курсов
- **Текущее состояние:** Реализован простой клиентский поиск (`src/features/contentSearch/`)
- **Улучшение:** Использовать embeddings для семантического поиска (понимает смысл запроса)
- **Как работает:**
  1. При обновлении периода/темы → создаём embeddings через Gemini
  2. Сохраняем в `content_chunks` коллекцию (аналогично `book_chunks`)
  3. При поиске: создаём embedding запроса → vector search → ранжируем результаты
  4. Опционально: AI-ответ на основе найденного контента
- **Реализация:**
  - [ ] Cloud Function `ingestContent` (аналог `ingestBook`) для создания embeddings
  - [ ] Коллекция `content_chunks` в Firestore
  - [ ] Обновить `ContentSearchDrawer` для использования семантического поиска
  - [ ] Fallback на простой поиск если embeddings не готовы
- **Выигрыш:**
  - Семантический поиск: "как развивается речь" найдёт "речевое развитие", "овладение языком"
  - AI-ответы с цитированием контента курсов
  - Интеграция с Book RAG для единого поиска
- **Стоимость:** ~$5-10/мес (Gemini embeddings + generation)
- **Файлы:** `functions/src/`, `src/features/contentSearch/`, `api/content.ts` (новый)
- **Статус:** 🔵 В бэклоге (ждёт приоритизации)
- **Дата добавления:** 2026-01-09

---

### RS‑3. Мультиязычный поиск (не фильтрация) (P: M, E: L)
- **Описание:** Сейчас кнопки языков фильтруют результаты по языку статьи. Нужен режим поиска ПО языкам
- **Проблема:** Запрос "агрессия" с фильтром "только English" даёт 0 результатов, потому что:
  1. Запрос переводится в "aggression"
  2. Но OpenAlex фильтрует по `language:en` — только англоязычные статьи
  3. Статьи про агрессию на русском помечены как `language:ru`
- **Решение:**
  - [ ] Добавить переключатель режима: "Фильтр" vs "Поиск на языках"
  - [ ] В режиме "Поиск": переводить запрос на выбранные языки и искать без языкового фильтра
  - [ ] Показывать из какого языкового варианта пришёл каждый результат
- **Файлы:** `api/papers.ts`, `src/pages/ResearchPage.tsx`, `src/features/researchSearch/hooks/useResearchSearch.ts`

---

## 🔍 Code Quality Audit (январь 2026)

> **Дата аудита:** 2026-01-08
> **Статистика:** ~31,500 строк в src/, ~2,100 строк в functions/, 7 тест-файлов (~7% покрытие критичных модулей)

### CQ‑1. ✅ Рефакторинг монолитов >400 строк — ВЫПОЛНЕНО (2026-01-08)

**Разбитые файлы:**

| Файл | Было | Стало | Выделено |
|------|------|-------|----------|
| `common.ts` | 605 | 96 | `svgRenderer.ts` (340), `pdfBuilder.ts` (132) |
| `ThemePicker.tsx` | 580 | 403 | `GradientEditor.tsx` (112), `themePickerUtils.ts` (90) |
| `tests.ts` | 560 | 262 | `testsNormalization.ts` (343) |

**Остались (не критично):**
- `Timeline.tsx` (502) — можно вынести в TimelineContext
- `AdminContent.tsx` (479) — можно выделить секции

---

### CQ‑2. Устранение дублирования кода (P: H, E: M)

> **~1,150+ строк** можно консолидировать

#### A. Wrapper-хуки (22 строки)
**Проблема:** `useClinicalTopics`/`useGeneralTopics` дублируют вызов `useCourseTopics`
```typescript
// ❌ Дублирование
export function useClinicalTopics() {
  return useCourseTopics<ClinicalTopic>('clinical-topics', 'Clinical topics');
}
```
**Решение:** Использовать `useCourseTopics` напрямую или создать фабрику хуков

#### B. CRUD паттерны в хуках (200+ строк)
**Файлы:** `useCreateLesson.ts`, `useReorderLessons.ts`, `useTopics.ts`
**Повторяется:** try/catch/finally с loading state, error handling, debugLog
**Решение:**
- [ ] Создать `src/hooks/useFirestoreCRUD.ts` — generic хук-фабрика для CRUD операций
- [ ] Создать `src/lib/withErrorHandling.ts` — обёртка для async операций

#### C. Структура модалей (400+ строк)
**Файлы:** `NoteModal`, `CreateLessonModal`, `LoginModal`, `AddAdminModal`
**Повторяется:** JSX layout (header, footer, overlay), состояния loading/error
**Решение:**
- [ ] Создать `src/components/ui/BaseModal.tsx` с переиспользуемым layout
- [ ] Рефакторить существующие модали на использование BaseModal

#### D. Cloud Functions обработка ошибок (300+ строк)
**Файлы:** `functions/src/index.js`, `courseAccess.ts`, `verify.ts`
**Повторяется:** auth проверка, super-admin проверка, валидация параметров, error wrapping
**Решение:**
- [ ] Создать `functions/src/lib/validators.ts` — validateAuth, validateSuperAdmin, validateString
- [ ] Создать `functions/src/lib/errors.ts` — withErrorHandling wrapper

#### E. useClickOutside паттерн
**Файлы:** `ExportNotesButton.tsx` и другие dropdown-компоненты
**Решение:**
- [ ] Создать `src/hooks/useClickOutside.ts`

---

### CQ‑3. Оптимизация Timeline ре-рендеров (P: H, E: S)

#### Критические проблемы:

1. **JSON.parse/stringify в undo/redo** (`useTimelineHistory.ts`)
   - Блокирует UI при больших объёмах данных
   - [ ] Использовать Immer или Web Worker для глубокого копирования

2. **N+1 запросы при проверке тестов** (`TestsPage.tsx`)
   - O(n) запросов в Firebase для каждого теста
   - [ ] Добавить batch запросы или кэширование в store

3. **40+ props без мемоизации** (`Timeline.tsx`)
   - Любое изменение state → ре-рендер всех дочерних компонентов
   - [ ] Обернуть `TimelineCanvas`, `TimelineLeftPanel`, `TimelineRightPanel` в `React.memo()`
   - [ ] Создать `TimelineContext` для часто меняющихся значений

4. **Фильтрация в render без useMemo** (`TimelineCanvas.tsx`)
   ```typescript
   // ❌ Создаёт новый массив на каждый render
   {edges.filter(...).map(...)}
   ```
   - [ ] Обернуть в `useMemo` с правильными зависимостями

5. **Race conditions** (`useTimelineState.ts`)
   - Два `setTimeout(_, 100)` могут создавать race conditions
   - [ ] Консолидировать логику в один useEffect

#### Средний приоритет:
- [ ] Мемоизировать `adaptiveRadius`, `ageLabels` в TimelineCanvas
- [ ] Вынести `shuffleArray()` в `src/utils/array.ts` (дублируется в DynamicTest и TestQuestionScreen)
- [ ] Градиенты в `TestCard.tsx` — обернуть в useMemo
- [ ] `buildTestChains` — заменить O(n²) поиск на индекс зависимостей

---

### CQ‑4. Покрытие юнит-тестами (P: M, E: L)

> **Текущее покрытие:** 7 тест-файлов, ~7% критичных модулей

**Покрыто тестами:**
- `SaveNoteAsEventButton`, `UserMenu.research`, `useResearchSearch`
- `ProfileStats`, `testAppearance`, `testChainHelpers`
- `functions/ensureAdmin`

**Критично нужны тесты:**

| Модуль | Приоритет | Обоснование |
|--------|-----------|-------------|
| `useAuthStore.ts` | 🔴 HIGH | Централизованный auth flow, роли, курс-доступ |
| `useTestStore.ts` | 🔴 HIGH | Логика тестирования, reveal-policy, подсчёт баллов |
| `firestoreHelpers.ts` | 🔴 HIGH | Legacy ID mapping, нормализация периодов |
| `testAccess.ts` | 🔴 HIGH | Логика prerequisite, unlock conditions |
| `testResults.ts` | 🟡 MED | Сохранение/загрузка результатов |
| `useNotes.ts` | 🟡 MED | Real-time синхронизация, фильтрация |
| `useTimeline.ts` | 🟡 MED | Сохранение/загрузка таймлайна |
| `courseAccess.ts` (functions) | 🔴 HIGH | Granular access control |
| `verify.ts` (functions) | 🟡 MED | Reconcile операции |

**Задачи:**
- [ ] Написать тесты для `useAuthStore` (auth flow, роли, инициализация)
- [ ] Написать тесты для `useTestStore` (состояния ответов, reveal policy, подсчёт)
- [ ] Написать тесты для `firestoreHelpers` (canonicalizePeriodId, getPeriodDocWithAliases)
- [ ] Написать тесты для `testAccess` (isTestUnlocked, percentage checks)
- [ ] Написать тесты для Cloud Functions (courseAccess CRUD, валидация)

---

### CQ‑5. Исправление console.* нарушений (P: M, E: S)

> Согласно CLAUDE.md: ❌ ЗАПРЕЩЕНО использовать `console.*` напрямую

**Файлы с нарушениями:**
- [ ] `src/hooks/useTopics.ts` (строки 55-56, 76-77, 97) — `console.error`, `console.log`
- [ ] `src/components/SaveNoteAsEventButton.tsx` (строки 50, 64, 68) — `console.error`
- [ ] `src/hooks/useTestProgress.ts` — `console.error`

**Решение:** Заменить на `debugLog`, `debugError`, `debugWarn` из `@/lib/debug`

---

### 📊 Общая оценка качества (обновлено 2026-01-08)

| Аспект | Оценка | Комментарий |
|--------|--------|-------------|
| Архитектура | 8/10 | 3 из 5 монолитов разбиты, остались Timeline (502) и AdminContent (479) |
| Code splitting | 8/10 | Lazy loading настроен правильно |
| DRY | 7/10 | Созданы BaseModal, useClickOutside, shuffleArray |
| Производительность | 7/10 | TimelineCanvas обёрнут в React.memo + useMemo |
| Тестирование | 5/10 | 310 тестов в 25 файлах (было 144 в 20) |
| Соблюдение стандартов | 9/10 | console.* нарушения исправлены |

**Сильные стороны:**
- ✅ Barrel exports используются правильно
- ✅ Lazy loading страниц настроен
- ✅ Custom hooks для переиспользуемой логики
- ✅ Pre-commit хуки для проверок
- ✅ Переиспользуемые компоненты (BaseModal)

---

## 🧪 Test Queue (TQ) — Ненаписанные тесты

> **Текущее покрытие:** 310 тестов в 25 файлах
> **Написаны тесты:** testsNormalization (58), color (37), firestoreHelpers (32), removeUndefined (22), transliterate (17), themePickerUtils (24)

### TQ-1. Утилиты (P: M, E: S)

| Файл | Строк | Что тестировать |
|------|-------|-----------------|
| `theme.ts` | 148 | deriveTheme, gradientToCss, getButtonTextColor |
| `sortNotes.ts` | 62 | Сортировка по периодам, датам |
| `mediaUpload.ts` | 160 | validateImageFile, extractYouTubeVideoId |
| `notesExport.ts` | 77 | generateNotesMarkdown, generateNotesText |
| `topicParser.ts` | 34 | parseTopicsText, previewTopics |
| `contentHelpers.ts` | 27 | shouldShowPlaceholder, hasContent |

### TQ-2. Бизнес-логика (P: H, E: M)

| Файл | Строк | Что тестировать |
|------|-------|-----------------|
| `testResults.ts` | 115 | groupResultsByTest, расчёт средних |
| `testAccess.ts` | 86 | isTestUnlocked, getTestLockInfo |

### TQ-3. Хуки (P: M, E: L)

| Файл | Строк | Сложность |
|------|-------|-----------|
| `useAnswerValidation.ts` | 105 | Средняя (state machine) |
| `useNotes.ts` | 221 | Высокая (Firebase mock) |

### TQ-4. Cloud Functions (P: M, E: M)

| Файл | Что тестировать |
|------|-----------------|
| `courseAccess.ts` | CRUD операции, валидация |
| `verify.ts` | Reconcile логика |

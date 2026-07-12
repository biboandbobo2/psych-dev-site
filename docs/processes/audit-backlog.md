# Бэклог по результатам аудита (январь 2025)

> 🔔 **Легенда:** P — приоритет (H/M/L), E — оценка трудоёмкости (S/M/L).  
> ✅ Завершённые пункты перенесены в `docs/archive/REFRACTORING_ARCHIVE.md` (раздел *Audit backlog (январь 2025)*).  
> Ниже остаются только активные задачи, сгруппированные по приоритету.
>
> 🔄 **Актуализация 2026-07-11:** полная сверка активных пунктов с кодом (main, после мёржа benchmark + branchId). Помечены ✅ фактически выполненные (MR-9, HM-4, BPT-3, BPT-7, BPT-12, BTP-3, operator-steps MR-1, части CQ-7), исправлены устаревшие цифры и пути к файлам.

## 📊 Priority board
| ID | Priority | Фокус | Ключевые deliverables |
|----|----------|-------|-----------------------|
| HP-1 | H (S) | Nightly интеграционные тесты (Firebase) — CI часть | Локальный прогон починен 2026-04-27 (6/6 зелёных, см. ниже). Осталось: GH Actions workflow + service account secret. |
| HP-2 | H (L) | Расширенное Playwright покрытие | Seed-данные, full auth flow, stress-тесты, отчётность |
| HP-3 | ✅ | Remediate container image vulnerabilities | NPM HIGH закрыты (2026-02-06), Go stdlib — buildpack-level |
| HR-1 | ✅ | Защита `/api/books` | Закрыта волной 6 (2026-04-26): strict BYOK без env fallback, auth Bearer на search/answer, public только list/snippet с rate-limit, CORS allowlist через appOrigins. Плюс счётчик BYOK-usage в профиле через aiUsageDaily/{uid}_{day}. |
| HR-2 | ✅ | Закрыть booking email-login auth bypass | Закрыта 2026-04-28 (wave-9, C1 + часть C2): `api/auth.ts` удалён целиком, AuthModal использует только `sendSignInLinkToEmail`. Освобождена 1 Vercel function (9/12 → 8/12). |
| CQ-6 | ✅ | Починить TS lint + console guardrails | Закрыта волной 7 (2026-04-27): ESLint покрывает ts/tsx через typescript-eslint v8, `no-console: error` + overrides, `check-console --all` для validate / `:staged` для pre-commit, api/ под покрытием. 50 runtime `console.*` → `debugLog/debugError/debugWarn` (или whitelist для prod-error reporting). |
| CQ-7 | M (M) | Рефакторинг новых монолитов и дублей | Большая часть закрыта (сверка 2026-07-11). Осталось: state-хуки `DisorderTable` (766 строк, 30 useState) + `sharedApiRuntime` для booking/papers/automation |
| MP-1 | ✅ | Изоляция бизнес-логики Timeline (lazy-hooks) | Хуки вынесены в `src/pages/timeline/hooks/`, чанк `timeline-hooks` в vite.config.js (2026-04) |
| MP-2 | M (S) | Повторные Lighthouse/perf-замеры | Новые метрики в `docs/reference/perf-metrics.md` + README summary |
| MP-3 | M (M) | Static analysis + bundle monitoring | `npx madge`/import-order checks + CI guardrails на размеры чанков |
| MP-4 | M (S) | Документация и tooling вокруг тестов | Скрипт `ts:prune`, README policy, обновление lazy-docов и perf метрик |
| MR-1 | ✅ | Масштабирование `/api/transcript-search` | Закрыта 2026-04-28 (H7), мерджено в main коммитом `b33bdc1`: keyword prefix-индекс через `searchTokens` array + `array-contains-any` query. Full scan убран. Backfill 20 693 chunks на prod выполнен до merge. UI smoke на preview подтвердил latency 355–873мс. |
| MR-2 | ✅ | Починить `npm run test:ci` | Закрыта 2026-04-27: `--runInBand` → `--no-file-parallelism` (Vitest 4 эквивалент) в `test:ci` и `test:integration`. |
| MR-3 | M (S) | Убрать `lessonRef as never` | типизированный payload dynamic course lessons |
| MR-4 | ✅ | Починить stale `authStore.test.ts` | Закрыта 2026-04-27: переписан под `UserRole = 'admin' \| 'super-admin' \| null`, убраны проверки удалённого `isStudent`, добавлен кейс role=null. 2/2 зелёных. |
| MR-5 | M (S-M) | Синхронизировать `firestore.indexes.json` с БД и починить vector-deploy | 2026-07-11: vector-индексы `book_chunks`/`lecture_chunks` уже в файле. Осталось: прод-сверка (4 missing composite) + проверить, что deploy проходит (CLI bug с `__name__`). |
| UX-1 | L (L) | Profile v2 — унификация с акварельной палитрой | ожидаем брендбук от дизайнера, после — полный редизайн Profile + вложенных секций |
| LP-1 | L (M) | Observability / telemetry | Базовый logger (Sentry/PostHog), описание процессов |
| LP-5 | L (S-M) | Firebase/GCP follow-ups | dependency review, cleanup policy, индексы, Telegram formatting |
| LP-6 | L (M) | Разбить `functions/src/billingExport.ts` на модули | 810 строк → queries / runner / discovery / archive / aggregator / index |
| LP-7 | L (S-M) | Юнит-тесты для billing fallback и SQL builders | Покрыть `safeRunQuery`, `fetchArchiveSummary`, `getBillingSummaryData` ветки live/archive |
| LP-8 | L (M-L) | Миграция `*-automation` функций в Cloud Functions | `timeline-biography-automation`, `*-extractor-automation` → Cloud Functions с Pub/Sub trigger; снимет 60s Vercel limit |
| LP-9 | L (S) | Auth + per-user квота на `/api/transcript-search` | По образцу `/api/books` (HR-1): Bearer auth + лимит N запросов/день. Защита от ботов, фигачащих публичный endpoint. |
| LP-10 | L (S-M) | Auto-disconnect Firestore listeners при бездействии | Page Visibility API + idle timer (~15 мин): отписка от `onSnapshot` в DisorderTable / GroupsFeed для забытых открытых вкладок. |
| LP-11 | L (S) | Pagination/cache для `useCourses` при росте курсов | Триггер: курсов > 30. Сейчас free tier покрывает, но при росте `getDocs(courses)` × N пользователей = много reads. |
| LP-12 | L (M-L) | Детальная статистика Firestore Read Ops в админке | Виджет «по фичам/коллекциям/дням». Фаза 1: Cloud Monitoring API → график агрегата. Фаза 2: instrumented client wrapper + Cloud Logging sink → BQ → разбивка по hooks/fea. |
| LP-13 | L (S-M) | API proxy для `videoTranscripts` metadata вместо public read | Сейчас `videoTranscripts/{videoId}` открыт на чтение (`allow read: if true`), потому что клиентский `useVideoTranscript` ходит напрямую. Альтернатива: `/api/transcript-metadata?videoId=...` через Admin SDK, тогда rules можно вернуть в `read: if false`. Стоит делать только если упрёмся в реальный сценарий злоупотребления или захотим rate-limit. Цена: +1 Vercel function (сейчас 11/12, лимит впритык) + правка хука. |
| LP-15 | L (S) | Закрепить версию Node для проекта | `.nvmrc` и `engines.node` требуют Node 22, но глобально стоит Node 25.2.0 (зафиксировано 2026-05-14). Поставить fnm/nvm + auto-switch по `.nvmrc`. До этого — потенциальный источник тонких багов в Vite/Firebase/Functions, которые не воспроизводятся в CI. |
| LP-14 | M (M-L) | `weeklyTranscriptRefresh` не работает из-за блокировки GCP-IP на YouTube | Cloud Function (us-central1) стабильно получает `TRANSCRIPT_NOT_AVAILABLE` от `youtube-transcript-plus` даже для видео, у которых captions реально есть — YouTube блокирует автоматические запросы с IP датацентров. Тот же код, запущенный локально (residential IP), получает captions нормально. **Временно отключено** через `WEEKLY_TRANSCRIPT_REFRESH_DISABLED = true` в `functions/src/weeklyTranscriptRefresh.ts` (2026-05-11) — функция остаётся задеплоенной, но при срабатывании cron'а делает early return с WARN-логом, не пытаясь дергать YouTube. Импорт делается локально через `scripts/importVideoTranscripts.ts` или `scripts/importManualTranscript.ts`. Варианты долгосрочного фикса: (а) добавить residential HTTP-proxy внутрь fetcher'а; (б) перенести задачу с GCP на не-GCP runner; (в) переключиться на YouTube Data API v3 с OAuth (там captions доступны через каноничный endpoint). Включить обратно — убрать константу и редеплоить функцию. |
| LP-16 | M (L) | Миграция `firebase-functions` v1 → v2 (1st gen → 2nd gen) | **Состояние 2026-05-18:** проект на `firebase-functions ^5.0.0`, последняя 7.2.5. 19 файлов на v1 API (`functions.https.onCall`, `functions.pubsub.schedule`, `functions.https.HttpsError`) — пересчитано 2026-07-11; 4 файла уже на v2 (`biographyImport`, `ingestBook`, `ingestLectureRag`, `biography/helpers`). При деплое функций Firebase CLI выдаёт warning `package.json indicates an outdated version of firebase-functions`. **Дедлайны на 2026-05-18:** жёсткого EOL для 1st gen Google не объявлял. Единственный связанный hard-дедлайн — `functions.config()` API → март 2027, но мы его не используем (`grep functions.config functions/src` = 0). GCR shutdown март 2025 уже прошёл, Firebase автоматически перевёл проект на Artifact Registry (иначе свежий деплой `weeklyTranscriptRefresh` не уехал бы). **Объём:** ~16 v1-функций × правка обёртки `(data, context)` → `(request)`, `functions.pubsub.schedule()` → `onSchedule()`, `functions.https.HttpsError` → импорт из `firebase-functions/v2/https`. **Покрытие тестами:** есть unit-тесты бизнес-логики у 10 из 16 (`coAdmin`, `courseAccess`, `examNotifications`, `exams`, `groups`, `makeAdmin`, `onUserCreate`, `userPreferences`, `users`, `billingBudgetAlert`). Без тестов и риск выше: `gcalSync` (самый сложный — двусторонний синк, anti-echo), `sendFeedback`, `verify`, `billingSummary`, `bulkEnrollment`, `weeklyTranscriptRefresh` (безопаснее всего — выключен флагом). **Что тесты НЕ ловят:** правильный endpoint в проде (2nd gen — Cloud Run URL вместо cloudfunctions.net), IAM/permissions Cloud Run, корректное переключение Cloud Scheduler job на новый pubsub-trigger. Обязателен smoke в проде после каждой пачки. **Биллинг:** Cloud Run free tier (~2M req/мес) **отдельный** от Functions 1st gen free tier — если сейчас бесплатно, должно остаться бесплатным. Появятся 1-2 копеечные строки за Artifact Registry (хранение Docker-образов, ~$0.10/GB/мес) и возможно Eventarc. Cloud Scheduler одинаково тарифицируется для v1/v2 (free 3 jobs/мес). **Ловушка:** в 2nd gen `cpu` по умолчанию 1 vCPU (1st gen умел 0.2). Явно ставить `{ cpu: 1, memory: "256MiB" }` при миграции callable, не выкручивать ресурсы вверх. **Рекомендованный порядок:** (1) `weeklyTranscriptRefresh` как канарейка — нулевой риск, отрабатываем паттерн `onSchedule`. (2) Callable с тестами (coAdmin, courseAccess, makeAdmin, users, userPreferences). (3) Callable без тестов (billingSummary, bulkEnrollment, verify) — пока ходим, подкручиваем тесты. (4) `sendFeedback`, `examNotifications`. (5) `gcalSync` — последним, с обязательным локальным прогоном anti-echo перед deploy. Один targeted deploy на пачку + smoke в админке после каждого. Альтернатива «по одной за раз при касании» — растягивать на месяцы; стратегия одного дня — 1-2 дня сплошной работы. **Прогресс 2026-07-12 (ветка chore/functions-v2-migration):** канарейка `weeklyTranscriptRefresh` (onSchedule) + пачка 2 — 9 callable в 5 файлах (coAdmin, makeAdmin, users, userPreferences, courseAccess) — на v2 В ПРОДЕ, смоук пройден (setMyFeaturedCourses + updateMyEmailPreferences e2e, логи чистые). Процедура отработана: gen1→gen2 под тем же именем НЕ апгрейдится — только functions:delete → deploy (для callable окно недоступности ~3-4 мин на пачку). **Пачка 3 В ПРОДЕ (2026-07-12, ветка chore/functions-v2-migration-wave2):** 6 callable (getBillingSummary, getStudentEmailLists, saveStudentEmailList, bulkEnrollStudents, runVerify, runReconcile) на v2; хелперы `lib/shared.ts` на v2-сигнатуре (`ensureAdmin` перенесён из index.ts — единственным потребителем был verify.ts, цикл verify↔index разорван). Tests-first: 38 тестов на v1-поведение до миграции, после — зелёные без изменения ассертов (292/292 всего). Смоук: functions:list все 6 v2, анонимные вызовы дают UNAUTHENTICATED/PERMISSION_DENIED (не INTERNAL — v2 HttpsError сериализуется правильно). **Пачка 4 В ПРОДЕ (2026-07-12):** 15 функций на v2 (12 callable + migrateAdmins onRequest + billingBudgetAlert onMessagePublished + onExamSlotWrite onDocumentWritten); onUserCreate — навсегда 1st gen через явный `firebase-functions/v1` (gen2 без non-blocking auth.onCreate). Два инцидента при деплое: Eventarc Service Agent первичная инициализация (ретрай) и **gen2 = compute default SA без доступа к Secret Manager** — фикс: `serviceAccount: appspot SA` (FUNCTIONS_SERVICE_ACCOUNT в lib/shared.ts) у функций с секретами/BigQuery/календарями; sendFeedback e2e в TG подтверждён. Осталось: бамп firebase-functions 5.x→7.x отдельным коммитом (v6: root=v2 → gcalSync/secrets/telegram на явные импорты; v7: drop Node 16, удалён functions.config() — не используем), затем пачка 5 — `gcalSync` (2 функции, anti-echo прогон, ОБЯЗАТЕЛЬНО serviceAccount: календари расшарены на appspot SA). Уже задеплоенные v2 остаются на 5.x-сборках до следующего редеплоя — не страшно. |
| SEC-1 | H (S) | `migrateAdmins`: публичный HTTP-endpoint без авторизации | Одноразовая миграция ролей (апрель 2026, выполнена), но функция до сих пор задеплоена и **не имеет никакой авторизации**: любой, кто узнает URL, перезапишет role-claims всем пользователям (super-admin/admin/student по admins-коллекции). Замечено при LP-16 пачке 4 (2026-07-12); Алексей решил пока оставить и задеплоить v2-версию, вопрос об удалении отложен. Варианты: (а) удалить файл+экспорт+тесты и `functions:delete migrateAdmins` — рекомендуется; (б) оставить, но добавить гейт (secret в заголовке / ensureSuperAdmin через Bearer). Тесты поведения уже есть (`migrateAdmins.test.ts`) — удаление/гейт делается безопасно. |
| RS-1 | M (M) | Глубокий поиск через Wikidata | Кнопка + API параметр `deep=true`, расширение запроса через Wikidata |
| RS-2 | M (S) | Расширение словаря терминов | 500+ терминов RU→EN, словари для DE/FR/ES, JSON файлы |
| RS-3 | M (L) | Мультиязычный поиск (не фильтр) | Переключатель режима, перевод запроса на выбранные языки |
| CQ-1 | ✅ | Рефакторинг монолитов (>400 строк) | common.ts, ThemePicker.tsx, tests.ts разбиты (2026-01-08) |
| CQ-2 | ✅ | Устранение дублирования кода | BaseModal, useClickOutside, shuffleArray созданы (2026-01-08) |
| CQ-3 | ✅ | Оптимизация Timeline ре-рендеров | React.memo, useMemo добавлены в TimelineCanvas (2026-01-08) |
| CQ-4 | M (L) | Покрытие юнит-тестами stores/hooks | useAuthStore, useTestStore, testAccess — см. секцию TQ |
| CQ-5 | ✅ | Исправление console.* нарушений | Все заменены на debugLog/debugError (2026-01-08) |
| TQ-1 | M (M) | Юнит-тесты для утилит | theme.ts, sortNotes.ts, mediaUpload.ts и др. |
| TQ-5 | M (M) | Расширить integration-coverage | `notes` CRUD + listener, prerequisite-цепочка для `tests` (поверх рабочей emulators-инфры) |
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
| HM-4 | ✅ | Чекбокс «не присылать email о бронях кабинетов» | Выполнено (подтверждено сверкой 2026-07-11): `EmailPreferencesSection` в профиле → `prefs.emailBookingConfirmations`, гейт `shouldSendBookingEmail` в `api/_lib/bookingAuth.ts` → `api/booking.ts` |
| HM-5 | L (S) | Vite dev overlay на `/booking`: «Cannot find module bookingCancellation.js» | Пред-существующая проблема (импорт в `api/booking.ts` появился в `8c53242`); прод-сборка работает, ломается только dev ESM-резолвер. Поправить vite/api dev-конфиг или alias |
| LP-17 | L (S-M) | Fan-out подписок `useLessonScopedDocs` → `in`-запросы | 2×(G+1) листенеров на страницу занятия → 4. Только с rules-тестом на эмуляторе (per-doc get()-membership vs `in`-query) |

---

## 🔴 High Priority

### HR‑2. ✅ Закрыть booking email-login auth bypass — РЕШЕНО (wave-9, 2026-04-28)
- **Решение:** Вариант 3 «email-link для всех» (после консультации с хозяином помещения, см. [BOOKING_AUTH_C1_DECISION_2026-04-28.md](../archive/reports/BOOKING_AUTH_C1_DECISION_2026-04-28.md)). Endpoint `POST /api/auth?action=loginByEmail` удалён вместе с файлом — выдача custom token по verified email больше невозможна.
- **Что сделано:**
  - [x] `api/auth.ts` удалён целиком. Освобождена 1 Vercel function (9/12 → 8/12).
  - [x] CORS wildcard в этом файле исчез вместе с ним — закрывается часть C2.
  - [x] `src/pages/booking/AuthModal.tsx`: tabs «Вход»/«Регистрация» объединены в один экран. Оба пути используют `sendSignInLinkToEmail`. Импорт `signInWithCustomToken` удалён.
  - [x] `BookingLayout.tsx:30-40` уже умел `signInWithEmailLink` для регистрации — теперь обслуживает оба сценария без изменений.
  - [x] `tests/api/booking-login.test.ts` удалён (тестировал удалённый endpoint).
  - [x] `docs/guides/booking-system.md` обновлён: новый flow описан, custom-token упоминание убрано, добавлена ссылка на decision document.
  - [x] `npm run validate` зелёный.
- **Совместимость:** все 28 существующих booking-пользователей сохраняют свои Firebase user records и текущие сессии. Ничего не ломается. При следующем входе с нового устройства увидят новый flow «получить ссылку на почту» — тот же что раньше использовался для регистрации.

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
- [x] ~~Перепроверить сканы через ~30 мин после деплоя~~ — окно давно истекло, неактуально (2026-07-11)
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
- [ ] Добавить npm-скрипт `ts:prune` + инструкцию в README, как читать отчёт (`ts-prune` уже в devDependencies — осталась только обёртка-скрипт; сверка 2026-07-11).
- [x] README уже требует прочитать `docs/architecture/guidelines.md` перед изменениями (README:56).
- [ ] Обновить ленивую документацию: описать политику добавления новых lazy-страниц и итоговые метрики в `docs/archive/legacy/lazy-loading-migration.md` / README, синхронизировать `docs/reference/perf-metrics.md` после завершения работ.

### MP‑7. Timeline UX follow-ups (P: M, E: S-M)
- [x] ✅ Удаление дополнительных холстов в multi-canvas timeline (2026-05-04, коммит `157f664`). «×» в выпадающем списке + confirm-модалка; последний холст удалить нельзя.
- [x] ✅ Адаптивный экспорт `PDF`/`PNG` (2026-05-04). `computeExportTopAge` берёт `max(currentAge, latest node, latest edge.endAge) + 5`-летний буфер, clamp к `ageMax`. `renderSvgToCanvas({ topAge })` обрезает viewBox сверху, поэтому пустые декады в будущее в файл не попадают.
- [x] ✅ `Очистить всё` приводит холст к empty-canvas state (purpose-fixed PR #65 через `onAfterClearAll` в Timeline.tsx — сбрасывает `birthDetails`/`selectedPeriodization`/`currentAge`/`ageMax`). Регрессионный тест на инвариант `hasTimelineContent` зафиксирован 2026-05-04.

### MP‑8. Biography import richness follow-up (P: M, E: M)
- **Контекст:** facts-first каскад уже умеет approximate ages, high-salience facts и theme-ветки, но legacy fallback и часть heuristic labels всё ещё периодически выдают generic события вроде `Учёба`/`Ссылка` и недобирают theme branches на sparse inputs.
- **Сверка 2026-07-11:** generic labels живы (`timelineBiographyHeuristics.ts:400` `'Ссылка'`, `:405` `'Учёба в ...'`). Fixtures теперь 16 subjects (не только Пушкин), но выделенных sparse-coverage тестов на theme-ветки по-прежнему нет — пункт актуален.
- **Задачи:**
  - [ ] Дожать generic-label cleanup в legacy path, чтобы при деградации quality не откатывалась к старым заглушкам.
  - [ ] Расширить sparse-biography coverage tests для theme branches (`friends`, `romance`, `travel`, `losses`) на нескольких не-пушкинских fixture’ах.
  - [ ] Решить, какие metrics из локального `timeline:eval` стоит поднимать в API-meta/UI для быстрой диагностики без CLI.

### MR‑1. ✅ Масштабирование `/api/transcript-search` — РЕШЕНО (2026-04-28, H7)
- **Решение:** keyword prefix-индекс. В каждый chunk добавлено поле `searchTokens: string[]` — массив префиксов слов длиной ≥ 3 (lowercased, без stop-words). Endpoint использует `where('searchTokens', 'array-contains-any', queryWords)` вместо full scan.
- **Что сделано:**
  - [x] `shared/videoTranscripts/searchIndex.ts`: helper `buildSearchTokens` + общий `TRANSCRIPT_STOP_WORDS` set + 9 unit-тестов.
  - [x] `VideoTranscriptSearchChunkDocShape`: добавлено опциональное поле `searchTokens?: string[]` (опциональное для совместимости с до-миграционными chunks).
  - [x] `buildTranscriptSearchChunkDocs`: новые chunks получают `searchTokens` автоматически.
  - [x] `scripts/backfillTranscriptSearchTokens.ts`: идемпотентный backfill (cursor pagination, batch 400, dry-run/--apply).
  - [x] `firestore.indexes.json`: single-field collection-group index `searchChunks.searchTokens` (`arrayConfig: CONTAINS`).
  - [x] `api/transcript-search.ts`: `where('searchTokens', 'array-contains-any', tokens)` + filter в коде (AND-семантика). Cap 30 tokens (Firestore limit).
  - [x] `tests/api/transcript-search.test.ts`: 6 тестов (empty query, query construction, 30-cap, stop-words, AND-filter, scoring).
  - [x] `npm run validate` зелёный, integration 6/6.
- **Ожидаемый эффект:** ~20 700 reads/запрос → ≤200 reads (зависит от популярности слов). Замер до/после после prod-запуска backfill.
- **Operator-steps — ✅ выполнены (отмечено при сверке 2026-07-11):**
  - [x] Backfill 20 693 chunks на prod выполнен до merge (см. closure-note выше).
  - [x] Index `searchChunks.searchTokens` (arrayConfig CONTAINS) в `firestore.indexes.json` и в БД.
  - [x] Smoke H7 в `qa-smoke-log.md` (2026-04-28): latency 355–873мс через UI, full-scan убран.

### CQ‑7. Рефакторинг новых монолитов и дублей (P: M, E: M — сужен сверкой 2026-07-11)
- **Источник:** code review `2026-04-27`, см. `docs/archive/reports/CODE_REVIEW_MAIN_2026-04-27.md`.
- **Актуализация 2026-07-11:** цифры ревью устарели, большая часть уже сделана. Текущие размеры: `DisorderTable.tsx` 766 (было 1315, компоненты вынесены в `src/pages/disorderTable/`), `api/papers.ts` 229 (было 1206, контур в `api/_lib/papers*.ts`), `HomeDashboard.tsx` 381 (было 797), `api/assistant.ts` 250 / `api/lectures.ts` 271 / `api/books.ts` 171.
- **Выполнено (подтверждено по коду):**
  - [x] Course navigation helpers централизованы: `useCourseNavItems.ts` → `src/lib/courseNavItems.ts` + `courseLessons.ts`, дублей нет.
  - [x] `api/lectureTranscriptFallback.ts` не существует, 0 вызовов.
  - [x] ~~Вернуть lazy для `PeriodPage`/`DynamicCoursePeriodPage`~~ — снято: eager зафиксирован как сознательное решение в CLAUDE.md (быстрый отклик), пункт противоречил ему.
- **Осталось:**
  - [ ] `DisorderTable.tsx`: вынести state-логику контейнера в хуки (30 useState: фильтры, выбор ячеек, модалки, поиск) — компоненты уже вынесены, осталась state-каша.
  - [ ] Свести на `sharedApiRuntime.ts` оставшиеся API: `api/booking.ts` (свои CORS+init ×3), `api/papers.ts`-контур, оба `api/timeline-biography-*-automation.ts`. Без нарушения Vercel function limit.
  - [ ] Синхронизировать `docs/reference/routes.md`, `docs/guides/booking-system.md`, `docs/reference/firestore-schema.md` после исправлений.

### BPT. Biography Pipeline tech debt (P: M, E: L)
- **Источник:** ревью после squash-merge `feature/video-study-notes` (PR #65, 2026-05-03). Pipeline функционально работает, но 4 файла стали монолитами, есть дубли legacy-кода и пробелы в test coverage.
- **Размеры файлов** (CLAUDE.md лимит < 400 строк; актуализировано 2026-07-11):

  | Файл | Строк | Статус |
  |---|---|---|
  | `server/api/timelineBiographyPipeline.ts` | 789 | 🟡 единый shared-модуль оркестрации (итог BPT-2), большой но живой |
  | `src/pages/Timeline.tsx` | 743 | 🟡 был 1125 → 771 → 743, остаток по желанию (BPT-4) |
  | `timelineBiographyFacts.ts` / `Lint.ts` / `Heuristics.ts` | 636 / 548 / 515 | 🟡 см. BPT-6 (опционально) |
  | `src/pages/timeline/components/TimelineLeftPanel.tsx` | 412 | ✅ было 856, BPT-3 закрыт |
  | `functions/src/biographyImport.ts` | 313 | ✅ было 843, ужат BPT-2 |
  | `server/api/timelineBiographyRuntime.ts` | 226 | ✅ было 1098, ужат BPT-2 |

- **Задачи (рекомендованный порядок):**

  **BPT-1. ✅ Удалить deprecated jobs endpoint — ВЫПОЛНЕНО ЧАСТИЧНО (2026-05-04)**
  - [x] Удалить `api/timeline-biography.ts` (258 строк) + `tests/api/timeline-biography.test.ts` — UI на CF, jobs flow никем не вызывался. Vercel functions count -1.
  - [x] Сохранить `api/timeline-biography-automation.ts` и `extractor-automation.ts` — используются CLI-бенчмарками.
  - **`server/api/timelineBiographyRuntime.ts` (1098 строк) НЕ deprecated:** оба automation endpoint'а импортируют из него `runBiographyImport`, `runBiographyFactExtraction`, `validateBiographyImportRequest` через barrel `server/api/timelineBiography.ts`. Если нужна декомпозиция runtime — отдельной задачей (BPT-1b), но она не «удалить целиком», а «разделить по ответственностям» вроде BPT-2.

  **BPT-2. ✅ Выполнено иначе (2026-07-08, audit/biography-import-bench)**
  - Вместо декомпозиции на step-файлы оркестрация вынесена в ЕДИНЫЙ shared-модуль
    `server/api/timelineBiographyPipeline.ts` (транспорт-агностичный: callModel/
    onProgress/onStage/onTokens callbacks). CF 630→313 строк (auth + Firestore +
    BYOK), Runtime 1101→226 (инжекция клиента + payload). Парсеры канонизированы
    в `timelineBiographyParsers.ts`. Мёртвый step-API `runBiographyStep1..4`
    удалён (~300 строк, 0 вызовов). Эквивалентность доказана реплеем бенчмарка
    из кэша (0 cache-miss) + построчной сверкой CF независимым verifier'ом.

  **BPT-2-старое. Декомпозиция `functions/src/biographyImport.ts` (P: M, E: M) — неактуально, см. выше**
  - Cel: 843 → ~150 строк handler + 6 шагов по ~100 строк
  - Структура `functions/src/biography/`:
    - `index.ts` — Cloud Function handler + verifyAuth (~50 строк)
    - `pipeline.ts` — orchestration (~80)
    - `step1-wikipedia.ts`, `step2-extraction.ts`, `step3-gap-filling.ts`, `step4-annotation.ts`, `step5-redaktura.ts`, `step6-composition.ts`
    - `helpers.ts` — `callGeminiWithRetry`, `extractGeminiTokens`, `recordBiographyByokUsage`, `collectGeminiResultText`
    - `parsers.ts` — `parseSimpleJsonFacts`, `parseAnnotationResponse`, `parseRedakturaResponse`, `normalizeError`
  - Бонус: каждый шаг легче покрыть unit-тестом (см. BPT-5)

  **BPT-3. ✅ Закрыт (подтверждено сверкой 2026-07-11)**
  - Файл 412 строк (было 856, цель ~400 достигнута). Debug-инструментация удалена (`fa28832`): grep `leftPanelSignalCounts|showDebugPopover|biographyDiagnostics|onBiographyUiSignal` по `src/pages/timeline/` пуст. Импорт биографии вынесен в модалки `BiographyImportFormModal` / `BiographyImportModal` (`e515d39`).

  **BPT-4. Дофинишировать `Timeline.tsx` (P: L, E: S — сужен сверкой 2026-07-11)**
  - [x] `useTimelineExport` вынесен (`src/pages/timeline/hooks/useTimelineExport.ts`).
  - [x] Остатки `recordBiographyUiSignal`/`appendBiographyDiagnostic` удалены (grep по `src/` пуст).
  - [ ] Файл всё ещё 743 строки (в основном оркестрация/прокидка props, 6 useState) — дальнейшее дробление по желанию, форсировать цифру ~400 не обязательно.

  **BPT-5. Test coverage gap (P: M, E: M) — частично закрыто 2026-07-08**
  - ✅ Ядро pipeline тестируемо через инжекцию клиента: `tests/api/timeline-biography-runtime.test.ts` (фейковый Gemini: слайсинг, post-death фильтр, gap-параметры, строгость к падению слайса), `functions/src/biography/parsers.test.ts` (канонические парсеры), + CI quality gates на кэше реальных ответов.
  - ✅ Сверка 2026-07-11 — закрыто больше, чем помечено:
    - [x] Hook `useBiographyImport` — тесты есть: `src/pages/timeline/hooks/__tests__/useBiographyImport.test.ts`.
    - [x] Death detection regression — есть: `tests/api/timeline-biography-composer.test.ts` (кейс BPT-5a «relative death before subject is 15»).
    - [x] Пин прод-тюнинга CF: `functions/src/biographyImport.test.ts` (`BIOGRAPHY_IMPORT_TUNING`).
  - Осталось (единственный реальный gap):
    - [ ] Тонкая CF-обёртка `functions/src/biographyImport.ts`: Firestore-прогресс и BYOK-учёт (`recordBiographyByokUsage` с mocked Firestore) — без unit-тестов. Step-файлы из исходного плана неактуальны (шаги живут в едином pipeline, см. BPT-2).

  **BPT-6. Опционально разбить `timelineBiographyFacts/Lint/Heuristics.ts` (P: L, E: S)**
  - По логическим единицам (parsing, normalization, dedup, baseline, salience). Делать только если кто-то начнёт активно править эти файлы.

  **BPT-7. ✅ Закрыт (подтверждено сверкой 2026-07-11)**
  - Замер B6 (2026-07-08): redaktura покрывала 22–73% фактов — `maxOutputTokens: 16384` съедался thinking-токенами. Фикс применён: `maxOutputTokens: 65536` во всех вызовах `timelineBiographyPipeline.ts`, включая redaktura и merged-markup; значения 16384 в коде больше нет.

  **BPT-8. ✅ Решено иначе через lite-профиль (2026-07-10, в проде с 2026-07-11)**
  - Исходный замер: 1.07M из 1.88M токенов pipeline — thinking. Вместо тюнинга
    thinkingBudget у 2.5-flash сделан `tuningProfile: 'lite'` (gemini-3.1-flash-lite,
    non-thinking модель): 0 thinking-токенов, 12–25× дешевле за импорт. Для дефолтного
    2.5-flash пути thinkingBudget не трогали — путь остаётся байт-в-байт.
  - Прод: CF `biographyImport` передаёт `BIOGRAPHY_IMPORT_TUNING` (lite-модель +
    профиль), пин `functions/src/biographyImport.test.ts`, реплей-гейт прод-конфига
    в `tests/benchmark/biographyPipelineQuality.test.ts`. Бонус: прод переживает
    retirement 2.5-flash (2026-10-16) без экстренной миграции.

  **BPT-9. ✅ Сделано в составе lite-профиля (2026-07-10)**
  - `markupBiographyFactsMerged` в `timelineBiographyPipeline.ts`: annotation+redaktura
    одним вызовом (JSON responseSchema, `MERGED_MARKUP_RESPONSE_SCHEMA`). Включается
    флагом `mergedMarkup` или lite-профилем; −1 вызов на импорт (важно при квоте 20/день).
    Дефолтный путь не тронут (TSV, два вызова). Замерено на 7 статьях lite: разметка 100%.

  **BPT-13. Плотность вторичных фактов lite на длинных RU-статьях (P: M, E: M, live-перемер)**
  - Остаточный зазор lite vs 2.5-flash: yearSentenceCoverage 52–71% против 80–87% на
    длинных RU (vygotsky, freud). Критические/даты/структура — без потерь. Следующий
    рычаг: более мелкая нарезка слайсов (`factExtractSlices`) — короче слайс, полнее
    извлечение у non-thinking модели. Менять только с live-перемером.

  **BPT-14. Lite на EN-статьях: кросс-языковые дубли фактов (P: M, E: S, live-перемер)**
  - Замер lite-final-remeasure (rogers): модель вернула часть фактов по-английски,
    dedup не матчит межъязыковые пары → в таймлайне RU+EN дубли одного события
    («Получил награду АПА…» + «Received Award… from the APA»), lint `duplicate-main-event`,
    EN-текст в notes виден пользователю. Кандидаты: усилить языковую дисциплину в
    lite-emphasis («все факты — только по-русски», меняет кэш-ключ → перемер) и/или
    dedup-эвристика по (year, category, sphere) при разных языках текста.

  **BPT-15. Риски гардов фабрикации дат (P: L, E: XS, наблюдение)**
  - `stripFabricatedYearClusters` (кластер ≥10 и >20% фактов одного года) теоретически
    может срезать легитимный «переломный год» короткой биографии — деградация видна
    через `manualFixReasons: yearsFabricated=N` в бенчмарке, в проде факты уходят в
    undated (не теряются). `minFacts` в lite-emphasis (`sliceChars/400`, минимум 60)
    не имеет верхнего потолка — на гигантском слайсе может запросить нереалистичное
    число фактов. Оба — наблюдать по прогонам, чинить при первом реальном срабатывании.

  **BPT-10. ✅ Закрыто 2026-07-11: `branchId` — источник истины о принадлежности (фазы 1–3)**
  - Первопричина класса структурных багов (Д-B1/Д-B4/Д-B7 + Д5): связь `node.parentX === edge.x` кодировала принадлежность пикселем. Реализовано по RFC `docs/plans/timeline-branch-id-rfc.md`: фаза 1 (аддитивное поле + досев, `f9d85b7`), фазы 2–3 (`f612363`, ветка `feature/timeline-branch-id-phase2`): дерево group-by по ссылке, normalize-лечение битых ссылок, все писатели проставляют branchId, drag — чистая презентация. Координатные walk'и сохранены как презентация (см. RFC «Итог реализации»). Д5 закрыт для всех данных со ссылкой; legacy-документы досеиваются на загрузке.

  **BPT-11. ✅ Закрыто 2026-07-12: нормализованная ошибка в biographyJobs (задеплоено)**
  - Free tier (2026-07) даёт 20 запросов/день/проект на 2.5-flash; импорт = 5–7 вызовов → ~3 импорта в день. При 429 пользователь видит невнятную ошибку. Нужно: человеческое сообщение о дневной квоте BYOK-ключа (и, возможно, предупреждение до старта).
  - С переходом прода на flash-lite (2026-07-11) квота заметно щедрее и приоритет ниже, но 429-кейс остаётся (исчерпанный ключ, ключ без доступа к модели — ср. 404 «model not available» на одном из платных ключей).
  - Уточнение по коду (сверка 2026-07-11): Vercel-путь уже нормализует 429 в человеческое сообщение (`timelineBiographyRuntime.ts:91-95`), но прод-UI идёт через CF, а `functions/src/biographyImport.ts` писал в job **raw** `error.message`.
  - **Сделано (2026-07-12):** catch-блок CF пишет в `job.error` нормализованное сообщение (`normalizeError`), сырой текст сохраняется в `job.rawError` для диагностики. 251/251 functions-тестов, build ✅. CF `biographyImport` передеплоена вместе с LP-16 канарейкой.

  **BPT-12. ✅ Закрыт (подтверждено сверкой 2026-07-11)**
  - Бенчмарк теперь видит composition-fallback: `scripts/lib/biographyBenchmarkMetrics.ts` помечает `manualFixReasons: compositionFallback` (edges=0 при nodes>20), `runBiographyBenchmarkSuite.ts` считает такой замер мусорным.

### MR‑8. ✅ Закрыто 2026-05-11: catch-all заменён на deny-all
- **Что было:** legacy catch-all `match /{document=**} { allow read: if true }` отменял per-uid ограничения для `biographyJobs` и пускал любого аутентифицированного к любой коллекции без явного match-блока. Дополнительно, после переписи catch-all в коммите `9cd609c` (05.05.2026) на форму с `document.size()/document[N]` Firestore стал отказывать в **list-запросах** для коллекций без своего match-блока — из-за этого `/tests` и админка тестов показывали пустые экраны (`PERMISSION_DENIED` на list).
- **Что сделано:**
  1. Audit всех клиентских коллекций через `grep -rohE '(collection|doc|collectionGroup)\(db,'` по `src/` + Cloud Functions + scripts.
  2. Добавлены явные `match`-блоки: `tests` (read public, write admin), `admin` (admin only), `homeFeed` (read public, write admin), и `false` для server-only коллекций: `videoTranscripts`, `videoTranscriptSearch/searchChunks`, `transcriptJobs/runs`, `lecture_sources`, `lecture_chunks`, `lecture_ingestion_jobs`, `books`, `book_chunks`, `ingestion_jobs`, `studentEmailLists`, `opsRuntime`. Все они идут через Admin SDK (`firebase-admin/firestore` в `api/*` и `functions/*`), который обходит rules.
  3. Catch-all заменён на `match /{document=**} { allow read, write: if false; }` — любая новая коллекция в будущем требует явного `match`-блока.
  4. Деплой: `firebase deploy --only firestore:rules --project psych-dev-site-prod` (2026-05-11). Подтверждено: `/tests` и `/tests-lesson` показывают реальные тесты из Firestore.

### MR‑9. ✅ Functions Checks CI — РЕШЕНО (подтверждено сверкой 2026-07-11)
- Job `Functions Checks` в `.github/workflows/ci.yml` работает с `working-directory: functions` + `npm ci --include=dev`; `vitest ^1.0.0` добавлен в `functions/package.json` devDependencies. Причина падения (подхват root-конфига без локального vitest) устранена.

### MR‑7. ✅ Починить AdminFeedFilters.test.tsx — РЕШЕНО (2026-07-12)
- **Причина:** фильтр «📅 События» сознательно убран из ленты в `89604ff` (события живут в календаре выше), `FeedFilterKind` сужен до `'all' | 'announcement' | 'assignment'`, тест не обновили.
- **Решение:** тест переписан под актуальные 3 фильтра + регрессионная проверка, что кнопка «📅 События» ОТСУТСТВУЕТ. 4/4 зелёных, typecheck чистый. `validate:full` больше не тащит «те же 3 pre-existing падения».

### MR‑6. ✅ Удалить orphan Cloud Function setStudentStream — ВЫПОЛНЕНО (2026-07-12)
- `firebase functions:delete setStudentStream --region us-central1` выполнен при деплое LP-16 канарейки. `firebase:deploy:functions` (full) разблокирован.

#### Исходное описание (для истории)
- **Контекст:** обнаружена при попытке `npm run firebase:deploy:functions` 2026-05-03. Firebase abort'ит full deploy потому что функция в проде, но её нет в локальном коде.
- **История:** добавлена коммитом `2374c98` (11 апреля), удалена из репо коммитом `8781443` (24 апреля, post-migration cleanup), но `firebase functions:delete` не выполнялся.
- **Безопасность:** 0 callers в активном коде (`grep -rn "setStudentStream"` пусто), миграция streams→groups завершена в апреле, поле `users.studentStream === 'none'` для всех пользователей.
- **Команда:** `firebase functions:delete setStudentStream --region us-central1 --project psych-dev-site-prod`
- **Эффект:** `firebase:deploy:functions` снова работает без targeted-only режима.

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

### MR‑5. Синхронизировать `firestore.indexes.json` с БД и починить vector-deploy (P: M, E: S-M)
- **Источник:** замечено 2026-04-28 при попытке `firebase deploy --only firestore:indexes` для wave-8 (H7).
- **Симптом 1 — vector-deploy ломается:**
  ```
  Error: ... book_chunks/indexes had HTTP Error: 400, No valid order or array
  config provided: field_path: "__name__"
  ```
  CLI 14.22.0 при пересоздании composite index с `vectorConfig` (например
  `book_chunks: bookId + embedding`) неявно добавляет `__name__` поле без
  `order`/`array_config`, Firestore API это режектит. Известный баг
  firebase-tools, нет надёжного фикса в актуальной версии.
- **Симптом 2 — рассинхрон:**
  ```
  firestore: there are 4 indexes defined in your project that are not
  present in your firestore indexes file.
  ```
  4 composite индекса на проде созданы вне файла (через Firebase Console UI
  или auto-предложением Firestore при failing query). Файл не source of
  truth — `firestore.indexes.json` (11 записей) расходится с БД (~15).
- **Риск:** runtime не страдает (existing индексы работают), но
  `firebase deploy --only firestore:indexes` неисполним. Любое будущее
  изменение индексов требует workaround через gcloud/REST API/Console.
- **Workaround сейчас (использован для wave-8):**
  ```bash
  TOKEN=$(gcloud auth print-access-token)
  curl -X PATCH \
    "https://firestore.googleapis.com/v1/projects/PROJECT/databases/(default)/collectionGroups/COLL_GROUP/fields/FIELD?updateMask=indexConfig" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"indexConfig":{"indexes":[{"queryScope":"COLLECTION_GROUP","fields":[...]}]}}'
  ```
- **Задачи:**
  - [ ] Синхронизировать `firestore.indexes.json` с реальной БД — добавить 4 missing composite indexes (см. вывод `firebase deploy` без `--force`).
  - [ ] Решить судьбу vector index в файле: либо вынести vector indexes из файла и держать только на сервере (создавать через `gcloud`/Console), либо дождаться фикса firebase-tools и обновить CLI.
  - [ ] Прогнать `firebase deploy --only firestore:indexes` без ошибок.
  - [ ] Документировать в `docs/architecture/guidelines.md` или `docs/development/testing-workflow.md`: «Firestore index workflow — где создаём через файл, где через gcloud/Console».

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

### HM‑4. ✅ Чекбокс «не присылать email-подтверждения броней» — ВЫПОЛНЕНО (подтверждено сверкой 2026-07-11)
- Чекбокс: `src/components/profile/EmailPreferencesSection.tsx` → `prefs.emailBookingConfirmations` через `updateMyEmailPreferences` (`functions/src/userPreferences.ts`).
- Гейт рассылки: `shouldSendBookingEmail()` в `api/_lib/bookingAuth.ts` читает флаг (default true) → `api/booking.ts` передаёт `notifyByEmail` в `handleBook`. Другие email-уведомления не затронуты.

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

### LP‑3. ✅ Улучшение Rate Limiting для AI Assistant — НЕ АКТУАЛЬНО (2026-05-04)
- **Контекст:** Закрыто 2026-05-04 (commit `d350a70`): in-memory `enforceDailyQuota` и `enforceRateLimit` удалены из `api/assistant.ts` целиком, файл `api/_lib/assistantQuota.ts` удалён. После полного перехода на BYOK Gemini key per user общая per-IP квота потеряла смысл — каждый пользователь сам отвечает за расходы своего ключа. Distributed rate-limit инфраструктура (Vercel KV) осталась нереализованной за ненадобностью; если в будущем понадобится для другого endpoint'а — открыть новую задачу.

### LP‑4. Очистка fallback env vars в AI Assistant (P: L, E: S) - ✅ МОЖНО ПРОПУСТИТЬ
- **Проблема:** В `api/assistant.ts:178` есть fallback на несколько env var имён (MY_GEMINI_KEY, GOOGLE_API_KEY, VITE_GEMINI_KEY)
- **Контекст:** Добавлено при отладке, когда Vercel Dashboard не сохранял env vars
- **Решение:** Сейчас работает GEMINI_API_KEY, остальные можно удалить
- **Статус:** 🟢 Не критично — fallbacks не мешают, но добавляют шум в код

### LP‑6. Разбить `functions/src/billingExport.ts` на модули (P: L, E: M)
- **Проблема:** Файл вырос до 810 строк после добавления archive fallback и available-months. Превышает проектный норматив `< 400`.
- **Триггер:** Любое следующее расширение billing-логики (например, drill-down по resource из detailed export, графики тренда, отдельный SQL для labels).
- **Решение:** Разбить на:
  - `billingExport/queries.ts` — все SQL builders (live + archive + available months)
  - `billingExport/runner.ts` — `getAccessToken`, `runBigQueryQuery`, `safeRunQuery`, `fetchBigQueryJson`
  - `billingExport/discovery.ts` — `discoverBillingExportTable`, `pickBillingExportTable`, `listDatasets/Tables`
  - `billingExport/archive.ts` — `fetchArchiveSummary`, `getArchiveTablePath`, `fetchAvailableMonths`
  - `billingExport/aggregator.ts` — `groupBillingServiceRows`, `decodeBigQueryRows`
  - `billingExport/index.ts` — `getBillingSummaryData` + публичные типы (~150 строк)
- **Без поведенческих изменений**, безопасно.
- **Файлы:** `functions/src/billingExport.ts` (810 строк)

### LP‑7. Юнит-тесты для billing fallback и SQL builders (P: L, E: S-M)
- **Контекст:** После добавления archive fallback покрытие осталось на двух старых тестах (`pickBillingExportTable`, `groupBillingServiceRows`). Новая логика не покрыта.
- **Что покрыть:**
  - [ ] SQL builders: `buildArchiveServiceSkuQuery`, `buildArchiveDailyTrendQuery`, `buildArchiveMetadataQuery`, `buildArchiveAvailableMonthsQuery`, `buildLiveAvailableMonthsQuery` — snapshot-проверки на параметризацию.
  - [ ] `safeRunQuery` — возвращает null при error от `runBigQueryQuery` (мок).
  - [ ] `fetchArchiveSummary` — возвращает null если archive table 404; возвращает payload при наличии.
  - [ ] `fetchAvailableMonths` — корректно объединяет live + archive, dedup, sort DESC.
  - [ ] `getBillingSummaryData` ветки:
    - live есть → используется live.
    - live пуст → fallback в archive.
    - оба пусты → пустой summary с availableMonths.
    - ничего нет → ok:false.
    - invalid invoiceMonth → ok:false с message.
- **Подход:** мокать `fetch` (через `vi.mock` глобально или `vi.spyOn(globalThis, 'fetch')`). `BigQueryQueryResponse` собирать руками.
- **Оценка:** ~150-200 строк тестов на 8-10 кейсов.
- **Файлы:** `functions/src/billingExport.test.ts` (49 строк → ~250)

### LP‑8. Миграция `timeline-biography-*-automation` в Cloud Functions с Pub/Sub trigger (P: L, E: M-L)
- **Контекст:** Сейчас на Vercel 10/12 функций (Hobby лимит). Два automation endpoint'а (`api/timeline-biography-automation.ts`, `api/timeline-biography-extractor-automation.ts`) — admin/cron-only, не пользовательские. Vercel maxDuration=60s часто граничит для тяжёлых LLM-задач (см. `vercel.json`).
- **Триггер:** Если упрёмся в 12-функциональный лимит Vercel **или** automation начнёт упираться в 60s.
- **Что сделать:**
  - [ ] Создать pair Cloud Functions (`functions/src/timelineBiographyAutomation.ts` + extractor) с `pubsub.topic(...).onPublish` trigger и runtime до 540s (1st gen) или 9 min (2nd gen).
  - [ ] Перенести логику из `api/*-automation.ts` (учитывая, что там `server/api/timelineBiographyRuntime.ts` уже изолирован — миграция в основном про trigger обвязку).
  - [ ] Заменить HTTP-вызов с админки на `pubsub.publish` (через client SDK `firebase/functions` callable wrapper или прямой Pub/Sub).
  - [ ] Удалить старые `api/*-automation.ts` после прогона на проде.
  - [ ] Освободит 2 слота на Vercel + снимет 60s ограничение.
- **Риски:** cold-start Cloud Functions 1.5-3s — для admin-only / cron не критично.
- **Файлы:** `api/timeline-biography-automation.ts`, `api/timeline-biography-extractor-automation.ts`, `server/api/timelineBiographyRuntime.ts`, новые `functions/src/timelineBiography*.ts`

### LP‑9. Auth + per-user квота на `/api/transcript-search` (P: L, E: S)
- **Проблема:** Endpoint публичный (без auth), читает Firestore (`videoTranscriptSearchChunks`). Бот, фигачащий запросы циклом, может за час сжечь дневной free-tier read quota.
- **Текущая защита:** keyword prefix-индекс (MR-1, 2026-04-28) уже сильно сократил cost per query. Глобального rate-limit нет.
- **Решение (по образцу HR-1 для `/api/books`):**
  - [ ] Требовать Bearer ID token в headers, проверять через `verifyAuthBearer`.
  - [ ] Лимит ~100 запросов/день на uid (хранение в Firestore: `aiUsageDaily/{uid}_{day}` — переиспользовать существующую коллекцию, action `transcript:search`).
  - [ ] Возвращать 401 для гостей, 429 при превышении квоты.
  - [ ] Опциональный публичный fallback: если для гостей нужен анонимный доступ — выдать строгий per-IP лимит (5/час) + отдельный flag в response.
- **Триггер на действие:** если в Cloud Logging увидим >10k req/day с одного IP **или** Firestore Read Ops внезапно вырастут в 2-3×.
- **Файлы:** `api/transcript-search.ts`, `src/lib/api-server/sharedApiRuntime.ts` (recordByokUsage уже подходит).

### LP‑10. Auto-disconnect Firestore listeners при бездействии (P: L, E: S-M)
- **Проблема:** `onSnapshot` listeners в DisorderTable (3 параллельных: students/entries/comments), GroupsFeed, AuthStore остаются активными в забытых открытых вкладках. Каждое изменение в коллекции = read с каждой такой вкладки.
- **Триггер:** активных пользователей > 50 одновременно **или** Firestore Read Ops > $5/мес.
- **Решение:**
  - [ ] Создать общий хук `useIdleAwareSnapshot(ref, callback, { idleMs: 15*60*1000 })`.
  - [ ] Использовать Page Visibility API + `setTimeout` на bestilg для отписки.
  - [ ] При возврате фокуса: `onSnapshot` пере-подключается, делает один initial read.
  - [ ] Применить в `useDisorderTable*`, `useMyGroupsFeed`, `useAllGroups`.
- **Файлы:** `src/hooks/useIdleAwareSnapshot.ts` (новый), все hooks с `onSnapshot`.

### LP‑11. Pagination/cache для `useCourses` при росте курсов (P: L, E: S)
- **Проблема:** `getDocs(collection(db, 'courses'))` в `useCourses.ts` тянет все курсы целиком. При 10 курсах × 100 пользователей в час = 1000 reads/час. При 100 курсах = 10 000.
- **Триггер:** курсов > 30 **или** активных пользователей > 50/час.
- **Решение:**
  - [ ] Pagination через `limit(20)` + cursor.
  - [ ] Альтернатива: TanStack Query / SWR для shared cache между компонентами с TTL 5-10 мин.
  - [ ] Server-side кэш: один Cloud Function `listCourses` с in-memory кэшем 60 сек (всё ещё дешевле, чем prod-Firestore reads).
- **Файлы:** `src/hooks/useCourses.ts`, потенциально новый `functions/src/listCourses.ts`.

### LP‑12. Детальная статистика Firestore Read Ops в админке (P: L, E: M-L)
- **Цель:** Видеть в `/admin` сколько reads сделала каждая фича за день/неделю — чтобы поймать всплеск до того, как он превратится в счёт.
- **Что доступно out-of-the-box:**
  - **Cloud Monitoring** уже считает `firestore.googleapis.com/document/read_count` с разбивкой по `op_type` (LOOKUP/QUERY) и `database`. Прямо сейчас можно открыть [Cloud Console → Monitoring → Dashboards → Firestore](https://console.cloud.google.com/monitoring) — будет график и breakdown.
  - НЕТ встроенной разбивки «какая фича / коллекция читала».
- **Фаза 1 (быстро, ~2-3 ч): Embed Cloud Monitoring данных в админку.**
  - [ ] Cloud Function `getFirestoreReadStats({rangeDays})`: вызов Cloud Monitoring API (`monitoring.timeSeries.list`) для метрики `document/read_count`, group by day.
  - [ ] Виджет в `/admin` с графиком read_count по дням (последние 7/14/30).
  - [ ] Breakdown по `op_type` (LOOKUP vs QUERY) — намекает где жгут.
  - [ ] Минус: не покажет «какой хук виноват».
- **Фаза 2 (среднее, ~6-10 ч): Custom инструментирование клиента.**
  - [ ] Тонкий wrapper над `firebase/firestore`: `instrumentedGetDocs(ref, { feature: 'disorderTable.entries' })`.
  - [ ] Wrapper отправляет structured log в Cloud Logging (бесплатно до 50 GiB/мес): `{ feature, opType, collection, count, uid, ts }`.
  - [ ] Cloud Logging sink → BigQuery dataset `firestore_metrics` (free tier).
  - [ ] Расширить наш существующий `getBillingSummary` callable новым параметром `view: 'firestore_breakdown'` — query по этому BQ датасету, breakdown по feature.
  - [ ] Отдельный виджет в админке «Топ-10 фич по reads».
- **Альтернатива (Фаза 0, ~30 мин): просто открыть [Cloud Monitoring Firestore dashboard](https://console.cloud.google.com/monitoring/dashboards)** прямо в Cloud Console — Google уже всё посчитал, отдельный код не нужен. Минус: нет интеграции в нашу админку, надо помнить ходить туда.
- **Связь:** общий вектор с LP-1 (Observability/Telemetry).

### LP‑17. Свести fan-out подписок `useLessonScopedDocs` к `in`-запросам (P: L, E: S-M)
- **Источник:** code review семинарского контура 2026-07-12 (efficiency-finding).
- **Проблема:** хук открывает по одному `onSnapshot` на каждую группу студента + один «свой» → страница занятия держит `2×(G+1)` живых листенеров (вопросы + конспекты). Студент в 8 группах = 18 листенеров и 18 initial-запросов на каждое открытие занятия; каждый initial-запрос биллится отдельно даже при 0 документов.
- **Решение:** `where('groupId', 'in', groupIds)` (лимит Firestore — 30 значений, хватает с запасом) + один `authorUid`-запрос → 4 листенера на страницу вместо `2×(G+1)`.
- **⚠️ Обязательная проверка:** rules используют per-doc `get(groups/{groupId}).memberIds` — перед переходом на `in`-запрос доказать на эмуляторе (rules-тест в `tests/integration/firestoreRules.test.ts`), что list-запрос с `in` проходит проверку членства для всех веток. Если rules-движок не докажет — не делать, оставить fan-out.
- **Файлы:** `src/hooks/useLessonScopedDocs.ts`, `tests/integration/firestoreRules.test.ts`.

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
- **Задачи (пути актуализированы 2026-07-11 — контур отрефакторен в `api/_lib/papers*.ts`):**
  - [ ] Подключить существующий Wikidata-код: `api/_lib/papersWikidata.ts` (`searchEntities`/`getEntities`) + `buildQueryVariants` из `api/_lib/papersTranslation.ts` — сейчас `api/papers.ts` их не вызывает.
  - [ ] Добавить параметр `deep=true` в API для включения Wikidata-расширения
  - [ ] Обновить UI кнопки "Глубокий поиск" — сейчас это `alert('…в разработке')` в `src/pages/ResearchPage.tsx`
  - [ ] Показывать пользователю найденные варианты запроса (из meta.queryVariantsUsed)
- **Файлы:** `api/papers.ts`, `api/_lib/papersWikidata.ts`, `api/_lib/papersTranslation.ts`, `src/pages/ResearchPage.tsx`
- **Статус:** 🟡 Кнопка добавлена как заглушка (alert)

### RS‑2. Расширение словаря RU→EN терминов (P: M, E: S)
- **Описание:** Подгрузить качественные словари психологических терминов для перевода
- **Текущее состояние (2026-07-11):** ~83 термина в `RU_TO_EN_TERMS` (`api/_lib/papersTranslation.ts:15`); словарей DE/FR/ES и лемматизации нет
- **Задачи:**
  - [ ] Найти/создать словарь психологических терминов RU→EN (500+ терминов)
  - [ ] Добавить словари для других языков (DE→EN, FR→EN, ES→EN)
  - [ ] Вынести словари в отдельные JSON файлы (`src/features/researchSearch/dictionaries/`)
  - [ ] Добавить механизм нормализации падежей (стемминг или лемматизация)
- **Источники словарей:**
  - Психологический словарь Мещерякова-Зинченко
  - APA Dictionary of Psychology
  - Wikidata labels/aliases для психологических концептов
- **Файлы:** `api/_lib/papersTranslation.ts`

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
  - Stale-формулировка: «embeddings оплачивает владелец сайта» — переписать через **BYOK Gemini key пользователя**: ingestion и embedding запросы для персональных книг идут через ключ владельца книги (как уже сделано для chat-assistant). Тогда финансовый риск с владельца сайта снимается полностью.
  - Abuse: нелегальный контент / PII / спам — нужны модерация и админская возможность удалять чужие.
  - Rate limits Gemini + Firestore quota.
- **Возможная BYOG-оптимизация storage (опционально):** хранить сами PDF в **Google Drive пользователя** через OAuth scope `drive.file` (как сделано для AI assistant — BYOK pattern). Тогда не платим за Storage. Но **vector search всё равно остаётся в нашем Firestore** — embeddings и текстовые чанки физически в нашей БД, иначе vector search невозможен. Чистого «всё на пользователя» не получится; реалистично — embeddings via BYOK + опционально PDF в Drive.
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
- **Файлы (актуализировано 2026-07-11):** `api/papers.ts`, `api/_lib/papersSources.ts` (языковой фильтр `language:` здесь), `api/_lib/papersTranslation.ts`, `src/pages/ResearchPage.tsx`, `src/features/researchSearch/hooks/useResearchSearch.ts`

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

### CQ‑2. ✅ Устранение дублирования кода — закрыто по board (2026-01-08)

> Примечание сверки 2026-07-11: board помечает CQ-2 выполненным (BaseModal, useClickOutside, shuffleArray созданы). Секция ниже — исходный январский план; оставшиеся в нём кандидаты (CRUD-фабрики, functions-validators) с кодом не сверялись — при желании открывать отдельным пунктом.

> **~1,150+ строк** можно консолидировать (оценка января 2026)

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

### CQ‑3. ✅ Оптимизация Timeline ре-рендеров — закрыто по board (2026-01-08)

> Примечание сверки 2026-07-11: board помечает CQ-3 выполненным (React.memo + useMemo в TimelineCanvas). Секция ниже — исходный январский список; его «средний приоритет» с кодом не сверялся. Timeline с тех пор дважды крупно рефакторился (MP-1 хуки, branchId BPT-10) — при возврате к теме исходить из свежего кода, не из этого списка.

#### Критические проблемы (январь 2026):

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

**Задачи (сверка 2026-07-11):**
- [x] Тесты для `useAuthStore` — есть: `src/stores/useAuthStore.test.ts` (переписан в MR-4).
- [x] Тесты для `firestoreHelpers` — есть: 32 теста (см. сводку TQ ниже).
- [ ] Написать тесты для `useTestStore` (состояния ответов, reveal policy, подсчёт)
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

### TQ-5. Расширить integration-coverage (P: M, E: M)

**Контекст:** wave-7 (2026-04-27) починил локальный прогон integration-тестов — сейчас `npm run test:integration` поднимает Firebase эмуляторы (`firebase emulators:exec`) и за ~3 секунды прогоняет 6 baseline-тестов. Инфраструктура работает, можно безопасно расширять покрытие.

**Критерий что тест должен быть integration, а не unit:**
- Зависит от специфичной Firestore query semantics (`where + orderBy` с индексами, `collectionGroup`, transactions, batch writes).
- Multi-document или multi-collection взаимодействия (одна операция меняет N документов).
- Timestamp/Date round-trip.
- Регрессия дорого стоит (потеря данных, blocked feature).

**Кандидаты:**

| Файл/область | Объём | Что покрыть |
|---|---|---|
| `notes` CRUD + listener (`src/hooks/useNotes.ts`, `src/lib/notes.ts`) | M | createNote (lectureNote / manualNote / eventNote — три разных пути), updateNote, deleteNote, getLectureNote (специфичная query `userId + lectureId`), `onSnapshot` listener round-trip. Timestamp конверсия. **Регрессия = потеря заметок пользователей**. |
| Расширить `tests/integration/testsWorkflow.test.ts` | S | Полная prerequisite-цепочка `A → B → C` с каскадным unlock через `isTestUnlocked`. Edge-cases percentage threshold (точно 70%, 69.99%, 100%). |

**Что НЕ нужно integration-тестировать (вынесено отдельно):**
- `courseAccess` matrix → unit с mocked Firestore (быстрее, проще). См. TQ-2.
- `bookings` (alteg.io API) → требует HTTP-mock через `nock`/`msw`, не Firestore.
- `lectures` RAG / AI endpoints → платные Gemini-вызовы, недопустимо в тестах.
- Cloud Functions integration → отдельный scope (functions emulator, его сейчас нет в `tests/integration/firebase.test.json`).

**Задачи:**
- [ ] `tests/integration/notes.test.ts` — три create-paths, update, delete, getLectureNote query, snapshot round-trip.
- [ ] Расширить `tests/integration/testsWorkflow.test.ts` блоком про полную prerequisite-цепочку и edge-cases threshold.
- [ ] Прогон `npm run test:integration` — все зелёные.
- [ ] Обновить список покрытия в `docs/guides/testing-system.md` под Integration Tests.

---

## 🕰️ Biography Timeline Pipeline (BTP) — секция времён two-pass-v5, в основном устарела

> ⚠️ **Актуализация 2026-07-11:** секция написана до унификации pipeline (BPT-2) и бенчмарк-контура (BPT-7..15). Оркестрация теперь в `server/api/timelineBiographyPipeline.ts`; упоминаний `two-pass-v5` в server-коде нет.

### BTP-1. Батчевание annotation/redaktura для длинных биографий (P: L, E: S — trigger-based)
- **Статус 2026-07-11:** батчевания в едином pipeline нет (`Promise.allSettled` не используется). Триггер прежний: биография с >300 фактами и покрытием <90%. До срабатывания триггера не делать; для lite-профиля разметка идёт merged-вызовом (BPT-9), картина может отличаться.

### BTP-2. ⚠️ Поглощён бенчмарк-контуром
- Баланс mainLine/branches теперь измеряется бенчмарком (метрики branches/coverage в `scripts/lib/biographyBenchmarkMetrics.ts`), качественные зазоры lite-профиля трекаются в BPT-13/BPT-14. Отдельно не вести.

### BTP-3. ✅ Рендер timeline на canvas — давно в проде
- `tmp/render-composition.ts` не существует; composition-результат рендерится в `TimelineCanvas` штатным путём импорта биографий.

### BTP-4. shortLabel длина >25 символов (P: L, E: S)
- **Проблема:** ~12% лейблов превышают 25 символов. Не критично — UI обрезает через CSS.
- **Триггер:** Если при рендере на canvas появятся визуальные артефакты из-за длинных лейблов.
- **Решение:** Runtime обрезка по слову до 25 + «…» или CSS text-overflow.

---

## 🎓 Exam Booking (EX)

> **Гид:** [docs/guides/exam-booking.md](../guides/exam-booking.md)
> **Тесты:** `functions/src/exams.test.ts` (16), `src/lib/exams/__tests__/` (9), `src/pages/admin/exams/__tests__/` (6).

### EX-1. Smoke с двумя реальными аккаунтами разных потоков (P: M, E: S)
- **Что не покрыто live:** multi-group user error (`bookExamSlot` отказывает, если юзер в нескольких из `exam.groupIds`), попытка повторной брони у существующего юзера (`already-exists`), приватность чужого эссе через прямой `getDoc(/essays/{otherUid})` (rules должен вернуть permission-denied). Все три ветки покрыты unit-тестами `functions/src/exams.test.ts`, но в проде с реальной Firebase Auth/Rules не проверены.
- **Триггер:** Когда появятся два студента с реальной комбинацией ролей в разных потоках.
- **Решение:** Pass через Playwright под двумя сессиями.

### EX-2. Поддержка нескольких активных экзаменов одновременно в /home календаре (P: L, E: S)
- **Проблема:** `HomeDashboard` мерджит в общий календарь только бронь первого active экзамена (`exams[0]`). Если у юзера будет несколько одновременно (например, общая + клиническая), вторая бронь не видна в `MiniWeekCalendar`/`EventsCalendarModal`. Карточки в `MyExamsSection` отображаются все.
- **Решение:** multi-subscription хук `useMyExamCalendarEvents()`, который собирает броней по всем `useActiveExamsForMe` через collectionGroup query или массив подписок.

### EX-3. Архив экзаменов и перенос слотов в UI (P: L, E: S)
- **Что есть:** Хелпер `rescheduleSlot` в `src/lib/exams/examsFirestore.ts`, поле `status='archived'` в БД.
- **Что нет:** UI-страницы списка архивных, кнопки «Перенести слот» в `SlotDetailsModal`.
- **Решение:** `/superadmin/exams/archive` + extra кнопка с datetime-local пикером в SlotDetailsModal.

### EX-4. ✅ Уведомления о бронировании/отмене — РЕШЕНО (2026-05-10)
- **Решение:** Firestore-trigger `onExamSlotWrite` в `functions/src/examNotifications.ts`. На каждый переход числа броней в слоте создаёт/обновляет событие в личном GCal-календаре преподавателя (calendar ID — секрет `personal-gcal-id`) и шлёт сообщение в существующий Telegram chat (`telegram-chat-id`, тот же что для feedback).
- **Переходы:** 0→≥1 — insertEvent + 🟢 TG, ≥1→≥1 — patchEvent (update description) + 🟢/🔵 TG, ≥1→0 — patchEvent с «❌ ОТМЕНЕНО» и `transparency=transparent` + 🔴 TG.
- **Self-heal:** если cnt>0 без eventId и bookings/время не менялись — создаётся event без TG. Использовано для backfill 4 старых броней (20.05, 21.05, 22.05, 25.05) при первом деплое; остаётся как защита от потери eventId.
- **Per-exam override (`Exam.notifyCalendarId` / `notifyTelegramChatId`)** не реализован сознательно — отложен до момента, когда экзамены начнёт проводить второй преподаватель.

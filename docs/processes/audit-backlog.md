# Бэклог по результатам аудита (январь 2025)

> 🔔 **Легенда:** P — приоритет (H/M/L), E — оценка трудоёмкости (S/M/L).  
> ✅ Завершённые пункты перенесены в `docs/archive/REFRACTORING_ARCHIVE.md` (разделы *Audit backlog (январь 2025)* и *Audit backlog — закрытые пункты (архивировано 2026-08-18)*).  
> Ниже остаются только активные задачи, сгруппированные по приоритету.
>
> 🔄 **Актуализация 2026-07-11:** полная сверка активных пунктов с кодом (main, после мёржа benchmark + branchId). Помечены ✅ фактически выполненные (MR-9, HM-4, BPT-3, BPT-7, BPT-12, BTP-3, operator-steps MR-1, части CQ-7), исправлены устаревшие цифры и пути к файлам.
>
> 🧹 **Чистка 2026-08-18:** 32 закрытые секции + 10 закрытых BPT-подпунктов + 20 ✅-строк board вынесены в архив (1253 → ~830 строк). AD‑1, AD‑2, HM‑1, HM‑2, HM‑3, CQ‑5 были помечены закрытыми только в board — их фактическое выполнение подтверждено сверкой с кодом перед переносом.

## 📊 Priority board
| ID | Priority | Фокус | Ключевые deliverables |
|----|----------|-------|-----------------------|
| HP-2 | L (S) | Ролевой e2e-стенд: остатки | Стенд реализован 2026-08-29 (`npm run smoke:roles`: вход под любой ролью без OAuth, сид, песочницы, 16 сценариев кабинета автора — testing-system.md «Ролевой стенд»). Тем же днём добавлен `--with-functions`: реальный контур выдачи прав (makeUserAdmin / setAdminEditableCourses / removeAdmin) на эмуляторе Cloud Functions. Осталось: e2e-job в CI, stress-тесты |
| CQ-7 | M (M) | Рефакторинг новых монолитов и дублей | State-хуки DisorderTable закрыты 2026-07-17 (766→397, 7 хуков). Осталось: `sharedApiRuntime` для booking/papers/automation |
| CQ-8 | L (—) | Легаси-список светофора размеров (6 файлов) | Рефакторинг по мере касания зоны; список в `scripts/check-file-sizes.cjs`, гейт подсказывает удаление |
| PT-1 | L (S) | Ретеншн телеметрии `feature_events` | Основная часть закрыта 2026-08-23 (события + rules + сводка `/superadmin/telemetry`, с 2026-08-29 ещё `/admin/telemetry` по курсам). Остался ретеншн — ждёт первых данных |
| MP-2 | M (S) | Повторные Lighthouse/perf-замеры | Новые метрики в `docs/reference/perf-metrics.md` + README summary |
| MP-3 | M (M) | Static analysis + bundle monitoring | `npx madge`/import-order checks + CI guardrails на размеры чанков |
| MP-4 | M (S) | Документация и tooling вокруг тестов | Скрипт `ts:prune`, README policy, обновление lazy-docов и perf метрик |
| MR-3 | M (S) | Убрать `lessonRef as never` | типизированный payload dynamic course lessons |
| MR-5 | M (S-M) | Синхронизировать `firestore.indexes.json` с БД и починить vector-deploy | 2026-07-11: vector-индексы `book_chunks`/`lecture_chunks` уже в файле. Осталось: прод-сверка (4 missing composite) + проверить, что deploy проходит (CLI bug с `__name__`). |
| UX-1 | L (L) | Profile v2 — унификация с акварельной палитрой | ожидаем брендбук от дизайнера, после — полный редизайн Profile + вложенных секций |
| UX-2 | L (S) | Тёмная тема LoginModal в режиме конспекта | После этапов B/C редизайна (2026-08-25) из оверлея исчезли «Спросить лектора» и «Поделиться конспектом» — остался только светлый LoginModal поверх тёмного fullscreen; нужен variant='dark' или токены |
| ST-1 | L (S) | Полный выпил легаси `sharedLectureNotes` | Этап C заменил share-контур живыми открытыми конспектами (`notes.visibility`); коллекция не пополняется, но остались: показ/удаление на `/admin/questions`, rules-блок коллекции, типы. Когда старые записи станут не нужны лекторам — выпилить всё и добавить открытые конспекты в `/admin/questions` |
| AG-1 | L (M) | Роль «agent» — вход Claude на сайт под своим аккаунтом | Firebase-аккаунт агента + custom claim, вход через `signInWithCustomToken` (без Google OAuth), матрица прав, фиксированный uid для аудита. С 2026-08-29 e2e-смоук больше НЕ блокирует (ролевой стенд HP-2 покрывает вход под любой ролью локально); остаётся полезным только для агентских проверок на реальных прод-данных |
| AC-1 | L (S-M) | Хвосты кабинета автора | `research_search`/`book_rag_question` без `courseId` (не видны админу курса), нет модели «ответа» на вопрос студента (rules `tests` сужены до `canEditCourse` 2026-08-29) |
| LP-1 | L (M) | Observability / telemetry | Базовый logger (Sentry/PostHog), описание процессов |
| LP-5 | L (S-M) | Firebase/GCP follow-ups | dependency review, cleanup policy, индексы, Telegram formatting |
| LP-6 | L (M) | Разбить `functions/src/billingExport.ts` на модули | 810 строк → queries / runner / discovery / archive / aggregator / index |
| LP-7 | L (S-M) | Юнит-тесты для billing fallback и SQL builders | Покрыть `safeRunQuery`, `fetchArchiveSummary`, `getBillingSummaryData` ветки live/archive |
| LP-8 | L (M-L) | Миграция `*-automation` функций в Cloud Functions | `timeline-biography-automation`, `*-extractor-automation` → Cloud Functions с Pub/Sub trigger; снимет 60s Vercel limit |
| LP-9 | L (S) | Auth + per-user квота на `/api/transcript-search` | По образцу `/api/books` (HR-1): Bearer auth + лимит N запросов/день. Защита от ботов, фигачащих публичный endpoint. |
| LP-10 | L (S-M) | Auto-disconnect Firestore listeners при бездействии | Page Visibility API + idle timer (~15 мин): отписка от `onSnapshot` в DisorderTable / GroupsFeed для забытых открытых вкладок. |
| LP-11 | L (S) | Дедуп/кэш для `useCourses` при росте курсов | Шаг 1 — промис-дедуп одновременных `getDocs` (без устаревания). Триггеры: курсов > 30, юзеров > 50/час, reads `courses` > ~20k/день. |
| LP-12 | L (M-L) | Детальная статистика Firestore Read Ops в админке | Виджет «по фичам/коллекциям/дням». Фаза 1: Cloud Monitoring API → график агрегата. Фаза 2: instrumented client wrapper + Cloud Logging sink → BQ → разбивка по hooks/fea. |
| LP-13 | L (S-M) | API proxy для `videoTranscripts` metadata вместо public read | Сейчас `videoTranscripts/{videoId}` открыт на чтение (`allow read: if true`), потому что клиентский `useVideoTranscript` ходит напрямую. Альтернатива: `/api/transcript-metadata?videoId=...` через Admin SDK, тогда rules можно вернуть в `read: if false`. Стоит делать только если упрёмся в реальный сценарий злоупотребления или захотим rate-limit. Цена: +1 Vercel function (сейчас 11/12, лимит впритык) + правка хука. |
| LP-15 | L (S) | Закрепить версию Node для проекта | `.nvmrc` и `engines.node` требуют Node 22, но глобально стоит Node 25.2.0 (зафиксировано 2026-05-14). Поставить fnm/nvm + auto-switch по `.nvmrc`. До этого — потенциальный источник тонких багов в Vite/Firebase/Functions, которые не воспроизводятся в CI. |
| LP-14 | M (M-L) | `weeklyTranscriptRefresh` не работает из-за блокировки GCP-IP на YouTube | Cloud Function (us-central1) стабильно получает `TRANSCRIPT_NOT_AVAILABLE` от `youtube-transcript-plus` даже для видео, у которых captions реально есть — YouTube блокирует автоматические запросы с IP датацентров. Тот же код, запущенный локально (residential IP), получает captions нормально. **Временно отключено** через `WEEKLY_TRANSCRIPT_REFRESH_DISABLED = true` в `functions/src/weeklyTranscriptRefresh.ts` (2026-05-11) — функция остаётся задеплоенной, но при срабатывании cron'а делает early return с WARN-логом, не пытаясь дергать YouTube. Импорт делается локально через `scripts/importVideoTranscripts.ts` или `scripts/importManualTranscript.ts`. Варианты долгосрочного фикса: (а) добавить residential HTTP-proxy внутрь fetcher'а; (б) перенести задачу с GCP на не-GCP runner; (в) переключиться на YouTube Data API v3 с OAuth (там captions доступны через каноничный endpoint). Включить обратно — убрать константу и редеплоить функцию. |
| RS-2 | M (S) | Расширение словаря терминов | 500+ терминов RU→EN, словари для DE/FR/ES, JSON файлы |
| RS-3 | M (L) | Мультиязычный поиск (не фильтр) | Переключатель режима, перевод запроса на выбранные языки |
| CQ-4 | M (L) | Покрытие юнит-тестами stores/hooks | useAuthStore, useTestStore, testAccess — см. секцию TQ |
| TQ-1 | M (M) | Юнит-тесты для утилит | theme.ts, sortNotes.ts, mediaUpload.ts и др. |
| TQ-5 | M (M) | Расширить integration-coverage | `notes` CRUD + listener, prerequisite-цепочка для `tests` (поверх рабочей emulators-инфры) |
| BR-2 | L (L) | Semantic Chunking | Определение глав/разделов, иерархия в метаданных |
| BR-3 | L (S) | Кэширование RAG-ответов | Firestore cache, TTL 7 дней |
| BR-4 | M (M) | Интеграция книг с заметками | Блок "Что говорят книги" в Notes |
| BR-5 | M (M) | Объяснения из книг после тестов | Кнопка "Узнать подробнее" при ошибке |
| BR-6 | M (M) | Семантический поиск по контенту | RAG для курсов (расширение Book RAG) |
| BR-7 | M (L) | Персональные книги пользователей | Свои PDF у студента (как заметки/таймлайн), privacy/quota, upload+ingestion, UI в Profile |
| MKT-1 | M (S) | Ревью маркетинг-контекста `.agents/product-marketing.md` | Пройти опросник `.agents/product-marketing-review.md` (цели, verbatim-язык студентов, конкуренты, прайс/оффер переподготовки), вписать ответы в док (бамп v2 + changelog), закоммитить оба файла. Черновик v1 автосгенерирован из кодовой базы 2026-07-17; поля «уточнить» без ответов Алексея не закрыть. Контекст читают все 10 маркетинг-скиллов (~/.claude/skills). |
| HM-5 | L (S) | Vite dev overlay на `/booking`: «Cannot find module bookingCancellation.js» | Пред-существующая проблема (импорт в `api/booking.ts` появился в `8c53242`); прод-сборка работает, ломается только dev ESM-резолвер. Поправить vite/api dev-конфиг или alias |
| LP-17 | L (S-M) | Fan-out подписок занятия → `in`-запросы | После этапа C (2026-08-25): `useLessonScopedDocs` остался только у вопросов (G+1), плюс открытые конспекты `useOpenLectureNotes` (G) и свои вопросы «?» (1) — листенеры gated по isOpen оверлея. Свёртка в `in`-запросы — только с rules-тестом на эмуляторе (per-doc get()-membership vs `in`-query) |

---

## 🔴 High Priority

### LS. Скорость загрузки сайта (группа задач, baseline 2026-07-20)

> **Сектор закрыт целиком:** LS-1/LS-2 — 2026-08-18, LS-5/LS-7/LS-3/LS-6/LS-4 — 2026-08-23.
> Записи с фактами реализации — `docs/archive/REFRACTORING_ARCHIVE.md`, раздел «Производительность и данные».
> Журнал перезамеров и методика — `docs/reference/perf-metrics.md`. Итог: гостевой /home LCP 3,5 → 1,3 с, стартовый JS 540 → ~350 КБ gzip, внешних хостов в критическом пути 0, шторка занятий не зависает.

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
- [ ] **Проверить деплой на firebase-tools 15.** Бамп 14.20 → 15.28 сделан 2026-08-29 ради эмулятора функций (в 14.x рантайм зовёт удалённый `functions.config()` и не поднимает ни одной функции). Локально проверены `smoke:roles`, `smoke:roles --with-functions`, `test:integration` (125/125); деплой (`npm run deploy:functions`, `deploy:rules`) НЕ прогонялся. В breaking changes 15.0.0 из релевантного — строгая валидация timeout'ов функций и минимальная Java 21 для эмуляторов. Первый деплой после бампа делать глазами.

## ⚖️ Medium Priority

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
- [ ] **Возможное (2026-08-11, по итогам импорта Iggy Pop/Bowie; без нового повода не делать):**
  - **C2.** Перетаскивание линии ветки мышью (горизонтальный drag). Кнопки
    «Влево/Вправо» в Редакторе ветки (`moveBranch`) уже закрывают задачу;
    drag — полировка с риском конфликтов жестов (drag событий, resize ветки,
    панорамирование). Делать, только если кнопки будут раздражать на практике.
  - **A3.** Динамическая ширина мира холста от контента (сейчас 4000px,
    рост только вправо в `worldWidth` Timeline.tsx). После ограничения
    раскладки веток (`MAX_BRANCH_X_OFFSET`) и динамических X-bounds экспорта
    (`computeExportXRange`) сценария-оправдания нет; вернуться, если реальные
    импорты упрутся в тесноту 15+ веток.

### MP‑8. Biography import richness follow-up (P: M, E: M)
- **Контекст:** facts-first каскад уже умеет approximate ages, high-salience facts и theme-ветки, но legacy fallback и часть heuristic labels всё ещё периодически выдают generic события вроде `Учёба`/`Ссылка` и недобирают theme branches на sparse inputs.
- **Сверка 2026-07-11:** generic labels живы (`timelineBiographyHeuristics.ts:400` `'Ссылка'`, `:405` `'Учёба в ...'`). Fixtures теперь 16 subjects (не только Пушкин), но выделенных sparse-coverage тестов на theme-ветки по-прежнему нет — пункт актуален.
- **Задачи:**
  - [ ] Дожать generic-label cleanup в legacy path, чтобы при деградации quality не откатывалась к старым заглушкам.
  - [ ] Расширить sparse-biography coverage tests для theme branches (`friends`, `romance`, `travel`, `losses`) на нескольких не-пушкинских fixture’ах.
  - [ ] Решить, какие metrics из локального `timeline:eval` стоит поднимать в API-meta/UI для быстрой диагностики без CLI.

### CQ‑7. Рефакторинг новых монолитов и дублей (P: M, E: M — сужен сверкой 2026-07-11)
- **Источник:** code review `2026-04-27`, см. `docs/archive/reports/CODE_REVIEW_MAIN_2026-04-27.md`.
- **Актуализация 2026-07-11:** цифры ревью устарели, большая часть уже сделана. Текущие размеры: `DisorderTable.tsx` 766 (было 1315, компоненты вынесены в `src/pages/disorderTable/`), `api/papers.ts` 229 (было 1206, контур в `api/_lib/papers*.ts`), `HomeDashboard.tsx` 381 (было 797), `api/assistant.ts` 250 / `api/lectures.ts` 271 / `api/books.ts` 171.
- **Выполнено (подтверждено по коду):**
  - [x] Course navigation helpers централизованы: `useCourseNavItems.ts` → `src/lib/courseNavItems.ts` + `courseLessons.ts`, дублей нет.
  - [x] `api/lectureTranscriptFallback.ts` не существует, 0 вызовов.
  - [x] ~~Вернуть lazy для `PeriodPage`/`DynamicCoursePeriodPage`~~ — снято: eager зафиксирован как сознательное решение в CLAUDE.md (быстрый отклик), пункт противоречил ему.
- **Осталось:**
  - [x] `DisorderTable.tsx`: state-логика вынесена в 7 хуков (`src/pages/disorderTable/hooks/`) + PageHeader — 766→397 строк (2026-07-17, ветка `chore/architecture-gates`).
  - [ ] Свести на `sharedApiRuntime.ts` оставшиеся API: `api/booking.ts` (свои CORS+init ×3), `api/papers.ts`-контур, оба `api/timeline-biography-*-automation.ts`. Без нарушения Vercel function limit.
  - [ ] Синхронизировать `docs/reference/routes.md`, `docs/guides/booking-system.md`, `docs/reference/firestore-schema.md` после исправлений.

### CQ‑8. Легаси-список светофора размеров (P: L, E: по мере касания)
- **Контекст:** гейт `scripts/check-file-sizes.cjs` (2026-07-17) блокирует новые файлы >500 строк в pre-commit и validate; легаси-список заморожен. Из стартовых 9 файлов три разобраны в тот же день (billingExport 810→388, timelineBiographyPipeline 900→341, DisorderTable 766→397), осталось 6.
- **Политика:** это НЕ кампания. Файл рефакторится при следующем содержательном касании его зоны; после — удалить запись из `LEGACY` в скрипте (гейт сам подсказывает, когда файл похудел).
- **Осталось (6):**
  - [ ] Timeline-зона — трогать при следующей работе над Timeline, не под ногами у живого редизайна: `src/pages/Timeline.tsx` (743), `src/pages/timeline/components/TimelineCanvas.tsx` (568), `src/pages/timeline/utils/exporters/svgRenderer.ts` (548)
  - [ ] Biography-зона — при следующем заходе в контур: `server/api/timelineBiographyFacts.ts` (636), `server/api/timelineBiographyLint.ts` (548), `server/api/timelineBiographyHeuristics.ts` (515)

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

  **BPT-16. Composition lifespan использует неверифицированный death-факт (P: L, E: S, наблюдение)**
  - Контекст (2026-08-11, кейс Iggy Pop): модель пометила `category='death'` смерть
    коллеги (Скотт Эштон, 2014) → post-death фильтр вырезал реальные события 2025+.
    Починено на уровне pipeline: `confirmDeathYearAgainstLead` (timelineBiographyFacts.ts)
    подтверждает год смерти по lead статьи, иначе фильтр не применяется.
  - Остаток: `resolveCompositionLifespan` (composer, используется composition-промптом
    и рендером) по-прежнему берёт `findDeathFact` без верификации — для живой персоны
    с ложным death-фактом заголовок промпта может врать («1947–2014») и сдвигается
    `legacyThreshold`. Данные НЕ теряются (фильтра там нет). Прокидывать верифицированный
    deathYear в композицию — только если появятся реальные артефакты в прогонах.
  - Туда же: 2026-08-10 composition на Iggy Pop (BYOK-ран) упала парсингом JSON
    (объект + хвост) → fallback без веток. Починено `parseCompositionJsonResponse`;
    если fallback продолжит всплывать в логах — смотреть уже на responseSchema
    для composition (как у merged markup).

### MR‑3. Убрать `lessonRef as never` в dynamic course creation (P: M, E: S)
- **Проблема:** `src/hooks/useCreateCourse.ts` пишет lesson doc через `setDoc(lessonRef as never, ...)`, маскируя реальную проблему типизации payload/ref.
- **Риск:** type system не защищает от schema drift в dynamic lessons.
- **Подтверждение:** review `2026-03-12`, см. `docs/reports/CODE_REVIEW_2026-03-12.md`.
- **Задачи:**
  - [ ] Вынести явный тип lesson payload для dynamic course lessons.
  - [ ] Типизировать `getCourseLessonDocRef` и `setDoc` без `never`.
  - [ ] После правки прогнать `typecheck:app` и smoke создания нового курса.

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

### UX‑2. Тёмная тема модалок режима конспекта (P: L, E: S)
- **Контекст (2026-08-24, редизайн study-mode):** режим конспекта полностью тёмный, но модалки внутри него — «Спросить лектора» (`AskLectureQuestionModal`), «Поделиться конспектом» (`ShareLectureNoteModal`), `LoginModal` — рендерятся светлым `BaseModal` (белый фон, серые тексты, нативные синие контролы). Стилевой разрыв заметен, но не блокирует функциональность; отложено при редизайне, чтобы не раздувать диф.
- **Как делать:** `variant?: 'light' | 'dark'` в `BaseModal` (фон/тексты/бордеры контейнера, header, footer) + условные классы внутри двух модалок (они используются и со светлой страницы занятия — variant прокидывать от вызывающего). Кнопкам `ModalCancelButton`/`ModalSaveButton` хватит нейтральных токенов.

### HM‑5. Vite dev overlay на `/booking`: «Cannot find module bookingCancellation.js» (P: L, E: S)
- **Симптом:** При открытии `/booking` на dev-сервере (`npm run dev`) поверх контента появляется красный overlay Vite с текстом «Cannot find module '/Users/.../src/lib/bookingCancellation.js' imported from .../api/booking.ts». Реальный контент за overlay рендерится корректно. На прод-сборке ошибки нет.
- **Контекст:** Импорт `import { canCancelBooking } from '../src/lib/bookingCancellation.js'` в [api/booking.ts](api/booking.ts) появился в коммите `8c53242` (давно на main). Аналогичный по стилю импорт `appOrigins.js` из того же `src/lib/` работает без overlay — значит дело не в `.js`-расширении как таковом, а в node ESM-резолвере, которого касается `vite-config.js.timestamp-...`.
- **Идея:** Поправить Vite/api dev-конфиг — либо алиасом, либо плагином/`resolveExtensions`. Возможно нужен SSR-friendly импорт или явная конфигурация в `vite.config.js` для api-роутов.
- **Что помнить:** Не блокирует прод и не связан с волнами 1-2 (импорт вне их). Симптом найден при смоук-тесте Smoke A (2026-04-26).

### AG‑1. Роль «agent» — вход Claude на сайт под своим аккаунтом (P: M, E: M)
- **Идея (2026-08-18, Алексей):** завести на сайте отдельную роль/аккаунт «агент», под которым заходит Claude, и явно определить его права.
- **Зачем:** сейчас агент не может выполнить ни один UI-сценарий под реальной сессией (вход только Google OAuth + сессия в IndexedDB — Playwright `storageState` её не переносит). Из-за этого smoke создания курса, прав админов и студенческих сценариев остаются ручными.
- **Предлагаемый механизм входа:** НЕ OAuth, а `signInWithCustomToken`: агент локально генерит custom token через service account (Admin SDK) для фиксированного uid `agent`, инжектит в страницу через `page.evaluate`. Токен короткоживущий, на сайте ничего не хранится. Альтернатива — session-vault с refresh-токеном Алексея через tsm (задизайнен 2026-07-17, не реализован) — хуже: даёт полный супер-админ-доступ.
- **Права (обсудить перед реализацией):**
  - [ ] База: студенческие (read published) + доступ к выделенному тест-курсу (`courseAccess`), чтобы CRUD-смоуки не трогали реальные курсы.
  - [ ] Опционально: `role: 'admin'` + `editableCourses: ['agent-test-course']` — админ-смоуки строго в песочнице.
  - [ ] Явно исключить: чтение PII других пользователей (полный admin-read `users` нежелателен), запись в чужие курсы, супер-админские операции.
- **Аудит:** фиксированный uid агента виден в `promotedBy`/`updatedBy`-полях; при желании — отдельный лог действий.
- **Rules:** новые кейсы в `tests/integration/firestoreRules.test.ts` на границы роли agent — до деплоя.

### AC‑1. Хвосты кабинета автора (P: L, E: S-M)
- **Контекст:** этапы A–C кабинета автора закрыты 2026-08-29 (`docs/plans/author-cabinet.md`, раздел «Кабинет автора» в [multi-course.md](../guides/multi-course.md)). Ниже — то, что осознанно осталось за рамками.
- [ ] **События без `courseId`.** `research_search` (глобальный поисковый дровер из `UserMenu`) и `book_rag_question` (вопрос по книгам) пишутся без курса, поэтому в сводку админа курса не попадают — их видит только super-admin. Прокидывать курс имеет смысл, только если появится контекст курса в самом дровере; брать `useCourseStore.currentCourse` нельзя — persist-значение не отражает контекст поиска.
- [ ] **Нет модели «ответа» на вопрос студента.** В `lectureQuestions` ответ нигде не помечается (лекторский чат живёт в оверлее), поэтому кабинет показывает «всего вопросов» и «новых за неделю» вместо «без ответа» из первоначального ТЗ. Если метрика долга нужна — понадобится поле/подколлекция ответа.
- [x] **Коллекция `tests` в rules гейтилась только `isAdmin()`** — ✅ 2026-08-29. Запись сужена до курса теста: `create` — `canEditCourse(request.resource.data.course)`, `update` — права на старый И новый курс (перенос между курсами), `delete` — по `resource.data.course`; `content/{id}` — по курсу родительского теста через `get()`. Документ без строкового `course` пишет только super-admin. Чтение осталось публичным. +19 кейсов в `tests/integration/firestoreRules.test.ts` (124 зелёных) — единственное покрытие этого контура: ролевой стенд `smoke:roles` документы `tests` не сидит и запись в них не проверяет (его 24/24 — регрессия соседних сценариев, не доказательство; `--with-functions` проверяет запись только в `courses/{id}/lessons`). **Rules ещё не задеплоены** — выкатить `firestore.rules` вместе со следующим деплоем.
- [ ] **Сценарии `--with-functions` сужения/снятия прав не claim-чувствительны.** В `functions-admin.spec.ts` claims реально доказывает только сценарий `makeUserAdmin` (запись занятия упирается в rules → токен); `setAdminEditableCourses` и `removeAdmin` маскируются пересечением claim∩зеркало в `resolveEditableCourses` и гейтом `RequireAdmin` по зеркалу: функция может перестать писать claims — тесты останутся зелёными, а снятый админ по rules сохранит запись. Дешёвая починка: в обоих сценариях после действия повторять попытку записи занятия и ждать отказ/успех от rules.
- [ ] **Футган `seedAdmin`** (`functions/src/index.ts`): `setCustomUserClaims(uid, { role: "admin" })` БЕЗ merge — прогон по действующему автору сотрёт его `editableCourses` и `coAdmin` из claims (зеркало в Firestore не тронет), и после сужения rules `tests` он не сможет записать ни один тест. Починка: merge с существующими claims, как в `makeAdmin.ts`.
- [x] **Смоук под ролями admin/super-admin** — ✅ 2026-08-29 закрыт ролевым стендом `npm run smoke:roles` (вход без OAuth, AG‑1 для смоука больше не нужен).

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

### LP‑11. Дедуп/кэш для `useCourses` при росте курсов (P: L, E: S)
- **Проблема:** `getDocs(collection(db, 'courses'))` в `useCourses.ts` тянет все курсы целиком, и каждый экземпляр хука делает собственное чтение. Экземпляров на страницу 2–3 (сайдбар + страница; с 2026-08-28 ещё LectureSelector в ИИ-дровере), плюс REST-префетч LS-4 может дублировать SDK-запрос — то есть одна навигация = до ~4–6 полных чтений коллекции. При 10 курсах × 100 пользователей в час = единицы тысяч reads/час; free tier (50k/день) пока покрывает с запасом.
- **Как понять, что пора (любой из сигналов):**
  - курсов в коллекции > 30;
  - активных пользователей > 50/час;
  - в Cloud Monitoring (`firestore.googleapis.com/document/read_count`, см. LP-12 Фаза 0) reads устойчиво > ~20k/день — близко к free tier;
  - строка Firestore reads появилась в billing (> $1/мес).
- **Решение — по нарастающей, не перепрыгивать шаги:**
  - [ ] **Шаг 1 (предпочтительный первый): промис-дедуп одновременных запросов.** Пока один `getDocs` в полёте, все монтирующиеся экземпляры ждут его же промис. Убирает реальное дублирование (2–3 экземпляра монтируются на одной странице одновременно), устаревания не создаёт — каждый новый заход позже читает свежее. Учесть: гонку REST-префетча против SDK (LS-4), флаг `includeUnpublished` (дедупить сырые доки до фильтрации), не кэшировать rejected-промис, сброс модульного состояния в тестах.
  - [ ] Шаг 2 (только при дальнейшем росте): shared cache с TTL 5–10 мин (SWR/TanStack Query). **Минус, из-за которого не делать раньше времени:** список замораживается в долгоживущих вкладках — `invalidateCourses()` сбрасывает кэш только в той вкладке, где менял админ; студенты с открытыми сутками вкладками не увидят новый/переименованный курс до перезагрузки.
  - [ ] Шаг 3 (при курсах > 30): pagination `limit(20)` + cursor либо server-side кэш (Cloud Function `listCourses`, in-memory 60 сек).
- **Контекст решения (2026-08-28):** обсуждено при фиксе транслита названий в LectureSelector — сам фикс добавил +1 экземпляр хука, удорожание оценено как копеечное (см. обсуждение), полный кэш на сессию отвергнут из-за минуса устаревания, дедуп отложен как преждевременный при текущем трафике.
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

## 📈 Продуктовая телеметрия

### PT‑1. События использования фич + админ-сводка (P: M, E: M)
- **Мотивация:** фич на платформе больше, чем понимания их использования (поиск статей, book RAG, лекционный AI, конспект-режим, selection-меню, timeline, тесты) — данных о том, что из этого студенты реально трогают, нет. Гипотеза «студенты идут в глубину» проверяется только данными; заодно узнаем долю мобильных сессий (конспект и selection-меню сейчас desktop-only). Дополняет LP-1: там ошибки/observability, здесь продуктовые события.
- **Принципы:**
  - Агрегаты, не слежка: uid хешировать, тексты запросов/заметок не сохранять.
  - Никакого нового файла в `api/` (инвариант Vercel = 12 функций): запись напрямую в Firestore с клиента.
  - Fire-and-forget: сбой телеметрии никогда не влияет на UX.
- **Статус: ✅ основная часть закрыта 2026-08-23** — события + rules + сводка. Гайд: `docs/guides/product-telemetry.md`.
- **Задачи:**
  - [x] ✅ Схема `feature_events` (`hashedUid` = усечённый SHA-256, `event`, `courseId?`/`periodId?`, `platform`, `createdAt` = serverTimestamp) + rules (create — авторизованным с валидацией ключей/длин, read — только админ, update/delete — никому) + регрессионные rules-тесты (блок в `tests/integration/firestoreRules.test.ts`) + `docs/reference/firestore-schema.md` (2026-08-23).
  - [x] ✅ `src/lib/telemetry.ts`: `trackFeatureEvent(event, meta?)` — fire-and-forget, дедуп `event+meta` в рамках сессии, запись только с прода и только авторизованным; юнит-тесты `src/lib/telemetry.test.ts` (2026-08-23).
  - [x] ✅ Размечено 8 точек / 9 событий: конспект-режим, транскрипт, selection «Объяснить»/«Статьи», research-поиск, book-RAG, лекционный AI, тест начат («Начать» на интро) / завершён (2026-08-23).
  - [x] ✅ Админ-сводка `/superadmin/telemetry` (lazy, чтение Firestore напрямую): события × недели, split mobile/desktop, уникальные hashedUid (2026-08-23).
  - [ ] Ретеншн (ждёт первых данных): месячная агрегация `feature_events_monthly` + чистка сырых событий шагом существующего weekly job (`functions/src/weeklyTranscriptRefresh.ts` — functions deploy, отдельное одобрение) **или** Firestore TTL-политика на `createdAt` (консоль/gcloud, без кода).
  - [x] ✅ QA-лог + заметка «куда смотреть и как читать цифры»: `docs/guides/product-telemetry.md` (2026-08-23).
- **Критерий успеха:** через 2–4 недели данных можно ответить — какие 3 фичи используются чаще всего, какие не используются вовсе, и какая доля учебных сессий мобильная.

---

## 🔬 Research Search (Научный поиск)

### RS‑3. ⏳ Ждём API-ключ Semantic Scholar (P: M, E: XS)
- **Состояние (2026-07-17):** без ключа SS отвечает 429 почти на каждый запрос — источник фактически выключен. Код готов: `fetchSemanticScholar` шлёт `x-api-key` из env `SEMANTIC_SCHOLAR_API_KEY` + один retry на 429 (`api/_lib/papersSources.ts`).
- **Заявка:** форма https://www.semanticscholar.org/product/api#api-key-form заполнена 2026-07-17 с адреса `aleksey@academydom.com` (Cloudflare Email Routing → пересылка на gmail; заведён именно под это — форма не принимает gmail). Сроки ответа SS не публикует, по опыту 1–3 недели; коммерческим заявкам дольше, могут и не ответить.
- **Когда придёт ключ:**
  - [ ] Добавить `SEMANTIC_SCHOLAR_API_KEY` в Vercel env (Production) — код подхватит сам, деплой не нужен (env-изменение потребует redeploy кнопкой)
  - [ ] Смоук: `sourcesUsed` в meta ответа `/api/papers` должен стабильно содержать `semanticscholar`
- **Если через месяц тишина:** перезаполнить форму или оставить SS выключенным (OpenAlex+OpenAIRE покрывают выдачу)

### RS‑4. Dev-middleware /api/* падает на NodeNext-импортах (P: L, E: S)
- **Симптом (2026-07-17):** на `npm run dev` запрос `/api/papers` → 500 + Vite error overlay: `Cannot find module '.../api/_lib/papersAllowList.js'`. `wrapApiMiddleware` в `vite.config.js` грузит `api/*.ts` плоским `import()`, который не резолвит NodeNext-импорты `./_lib/*.js` → `.ts`. Сломано со времён переименования `api/lib → api/_lib` (2026-04-27), на прод не влияет (Vercel собирает сам).
- **Затронуто:** все обёрнутые роуты — `/api/papers`, `/api/booking`, `/api/assistant`.
- **Фикс-кандидат:** в middleware использовать `server.ssrLoadModule()` вместо `import()` — Vite сам резолвит `.js`→`.ts`.
- **Файл:** `vite.config.js` (`wrapApiMiddleware`)

### RS‑2. Пополнение словаря RU→EN как кэша (P: L, E: S)
- **Описание:** После RS-1 большой словарь (500+) не нужен — термины вне словаря покрывает Wikidata. Словарь остаётся быстрым кэшем частотных терминов (без сетевого запроса).
- **Осталось (опционально):**
  - [ ] Пополнять `RU_TO_EN_TERMS` частотными терминами из реальных запросов (история поиска)
  - [ ] Лемматизация не планируется: падежи покрыты формами в словаре + стоп-словами
- **Файлы:** `api/_lib/papersTranslation.ts`

---

## 📚 Book RAG (Поиск по книгам)

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

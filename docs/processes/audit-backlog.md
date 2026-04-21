# Бэклог по результатам аудита (январь 2025)

> 🔔 **Легенда:** P — приоритет (H/M/L), E — оценка трудоёмкости (S/M/L).  
> ✅ Завершённые пункты перенесены в `docs/archive/REFRACTORING_ARCHIVE.md` (раздел *Audit backlog (январь 2025)*).  
> Ниже остаются только активные задачи, сгруппированные по приоритету.

## 📊 Priority board
| ID | Priority | Фокус | Ключевые deliverables |
|----|----------|-------|-----------------------|
| HP-1 | H (M) | Nightly интеграционные тесты (Firebase) | GH Actions job + артефакты прогонов |
| HP-2 | H (L) | Расширенное Playwright покрытие | Seed-данные, full auth flow, stress-тесты, отчётность |
| HP-3 | ✅ | Remediate container image vulnerabilities | NPM HIGH закрыты (2026-02-06), Go stdlib — buildpack-level |
| HR-1 | H (M) | Защита `/api/books` | auth/quota contract, rate limit, restricted CORS, security tests |
| MP-1 | ✅ | Изоляция бизнес-логики Timeline (lazy-hooks) | Хуки вынесены в `src/pages/timeline/hooks/`, чанк `timeline-hooks` в vite.config.js (2026-04) |
| MP-2 | M (S) | Повторные Lighthouse/perf-замеры | Новые метрики в `docs/reference/perf-metrics.md` + README summary |
| MP-3 | M (M) | Static analysis + bundle monitoring | `npx madge`/import-order checks + CI guardrails на размеры чанков |
| MP-4 | M (S) | Документация и tooling вокруг тестов | Скрипт `ts:prune`, README policy, обновление lazy-docов и perf метрик |
| MR-1 | M (M) | Масштабирование `/api/transcript-search` | server-side retrieval без full collection scan |
| MR-2 | M (S) | Починить `npm run test:ci` | совместимый Vitest CLI для CI/test scripts |
| MR-3 | M (S) | Убрать `lessonRef as never` | типизированный payload dynamic course lessons |
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

---

## 🔴 High Priority

### HR‑1. Защита `/api/books` (P: H, E: M)
- **Проблема:** `api/books.ts` остаётся публичным AI endpoint с `Access-Control-Allow-Origin: *`, без auth, quota-contract и rate limiting для `search` / `answer`.
- **Риск:** любой origin может дёргать embeddings/Gemini-path, что создаёт риск злоупотребления, роста расходов и расхождения с уже усиленной моделью безопасности `/api/lectures`.
- **Подтверждение:** review `2026-03-12`, см. `docs/reports/CODE_REVIEW_2026-03-12.md`.
- **Задачи:**
  - [ ] Зафиксировать явный access model: authenticated-only или anonymous quota contract.
  - [ ] Ограничить CORS allowlist вместо `*`.
  - [ ] Добавить rate limit / abuse guard для дорогостоящих веток.
  - [ ] Покрыть auth/CORS/rate-limit поведение тестами в `api/books.test.ts`.

### HP‑1. Nightly интеграционные тесты (P: H, E: M)
- [ ] Настроить GitHub Actions workflow, который раз в сутки поднимает Firebase эмуляторы (`npm run firebase:emulators:start`) и гоняет `npm run test:integration`.  
- [ ] Сохранять артефакты (лог успешных тестов, при падении — журнал/видео).  
- [ ] Обновить документацию (README + `docs/guides/testing-system.md`) разделом «Как читать nightly-прогоны».

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
- **Подтверждение:** review `2026-03-12`, см. `docs/reports/CODE_REVIEW_2026-03-12.md`.
- **Задачи:**
  - [ ] Убрать full collection scan из hot path `GET /api/transcript-search`.
  - [ ] Спроектировать индекс/lookup/sharding стратегию под query-time retrieval.
  - [ ] После правки smoke-проверить глобальный поиск по транскриптам и обновить docs по search pipeline.

### MR‑2. Починить `npm run test:ci` (P: M, E: S)
- **Проблема:** текущий root script использует `vitest --runInBand`, который не поддерживается текущей версией Vitest и падает с `CACError`.
- **Риск:** automation/CI entrypoint формально существует, но не исполняется.
- **Подтверждение:** локальный прогон `2026-03-12`, см. `docs/processes/qa-smoke-log.md` и `docs/reports/CODE_REVIEW_2026-03-12.md`.
- **Задачи:**
  - [ ] Заменить `test:ci` на поддерживаемую команду Vitest 4.
  - [ ] Проверить соседний `test:integration`, где используется тот же флаг.
  - [ ] После правки повторно прогнать `npm run test:ci` и зафиксировать результат в QA log.

### MR‑3. Убрать `lessonRef as never` в dynamic course creation (P: M, E: S)
- **Проблема:** `src/hooks/useCreateCourse.ts` пишет lesson doc через `setDoc(lessonRef as never, ...)`, маскируя реальную проблему типизации payload/ref.
- **Риск:** type system не защищает от schema drift в dynamic lessons.
- **Подтверждение:** review `2026-03-12`, см. `docs/reports/CODE_REVIEW_2026-03-12.md`.
- **Задачи:**
  - [ ] Вынести явный тип lesson payload для dynamic course lessons.
  - [ ] Типизировать `getCourseLessonDocRef` и `setDoc` без `never`.
  - [ ] После правки прогнать `typecheck:app` и smoke создания нового курса.

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

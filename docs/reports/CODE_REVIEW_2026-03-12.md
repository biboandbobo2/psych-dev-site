# CODE_REVIEW_2026-03-12.md

Глубокий локальный review выполнен **2026-03-12** по клиенту, Vercel API, Cloud Functions, типизации и документному слою.

## Scope

- `src/**`, `api/**`, `functions/src/**`, `scripts/**`
- корневые `package.json` / `functions/package.json`
- актуальные docs: `README.md`, `docs/README.md`, `docs/processes/*`, `docs/PLANS_OVERVIEW.md`

## Подтверждённые findings

### 1. Критично: `/api/books` остаётся публичным дорогим AI endpoint без auth/rate-limit

- Файл: `api/books.ts`
- Подтверждение:
  - `Access-Control-Allow-Origin: *` выставляется на `api/books.ts:161`
  - `search` и `answer` выполняют embeddings / Gemini-вызовы без проверки пользователя, квоты или origin allowlist: `api/books.ts:262`, `api/books.ts:352`, `api/books.ts:446`
- Риск:
  - abuse чужими origin-ами;
  - неконтролируемый рост расходов на embeddings / generation;
  - отсутствие явного security-contract, в отличие от уже усиленного `/api/lectures`.
- Минимальный remediation:
  - ограничить CORS;
  - ввести auth или явный anonymous quota contract;
  - добавить rate limit / abuse guard;
  - покрыть это integration/unit tests.

### 2. Высокий: `/api/transcript-search` делает full scan всего transcript индекса на каждый запрос

- Файл: `api/transcript-search.ts`
- Подтверждение:
  - handler загружает весь `collectionGroup(...).get()` и фильтрует в памяти: `api/transcript-search.ts:115`, `api/transcript-search.ts:116`, `api/transcript-search.ts:118`
- Риск:
  - latency и cost растут линейно от общего числа transcript chunks;
  - исправление client preload уже сделано, но bottleneck переехал на сервер;
  - при росте библиотеки это станет главным ограничением search UX.
- Минимальный remediation:
  - перейти на более узкий retrieval path;
  - хранить индексируемые термины / shards / precomputed lookup;
  - исключить full collection scan из request path.

### 3. Средний: `npm run test:ci` сломан и не может использоваться как CI entrypoint

- Файл: `package.json`
- Подтверждение:
  - script использует `vitest --runInBand`: `package.json:38`
  - локальный прогон **2026-03-12** падает с `CACError: Unknown option --runInBand`
- Риск:
  - ложное ощущение готового CI-скрипта;
  - будущие CI/automation шаги сломаются сразу при использовании `test:ci`.
- Минимальный remediation:
  - заменить на поддерживаемый Vitest 4 CLI;
  - проверить соседний `test:integration`, где используется тот же флаг.

### 4. Средний: `lessonRef as never` скрывает реальную проблему типизации dynamic lessons

- Файл: `src/hooks/useCreateCourse.ts`
- Подтверждение:
  - запись lesson doc делает unsafe cast: `src/hooks/useCreateCourse.ts:106`
- Риск:
  - schema drift будет маскироваться типовым обходом;
  - следующий рефакторинг lesson payload может сломаться без подсказки type system.
- Минимальный remediation:
  - выделить typed payload для dynamic course lessons;
  - типизировать `getCourseLessonDocRef` / `setDoc` без `never`.

## Что проверено руками

### Зеленые прогоны

- `npm run validate`
- `npm test -- --run`
- `cd functions && npm test -- --run`
- `npm run typecheck:app`
- `npm run typecheck:api`
- `npm run typecheck:scripts`
- `npm run typecheck:functions`
- `npm run typecheck:tests`

### Негативный прогон

- `npm run test:ci` — **падает**, причина задокументирована выше

## Состояние документации после прохода

### Что уже отражено нормально

- Корневой `README.md` теперь выполняет роль entrypoint в репозиторий, а `docs/README.md` — роль каталога знаний.
- В docs уже отражены:
  - dynamic courses / multi-course;
  - feedback / Telegram;
  - transcript ingestion и schema;
  - lecture AI и transcript-related изменения через `routes`, `firestore-schema` и `qa-smoke-log`.

### Что всё ещё было устаревшим до этого review

- В `docs/processes/audit-backlog.md` оставались пункты, которые код уже опередил:
  - client preload transcript chunks уже убран, но backlog всё ещё описывал старую проблему;
  - риск `functions.config()` уже закрыт, а документ продолжал описывать его как активную задачу;
  - не было отдельного follow-up по защите `/api/books`;
  - не был зафиксирован сломанный `test:ci`.

### Что обновлено этим проходом

- Новый report: этот файл
- `docs/processes/audit-backlog.md` синхронизирован с текущими risks
- `docs/processes/qa-smoke-log.md` дополнен сегодняшними прогонами
- `docs/reports/README.md` и `docs/PLANS_OVERVIEW.md` обновлены ссылками/контекстом

## Вывод

Документация стала заметно менее устаревшей, но не полностью исчерпывающей. Основные новые фичи уже отражены, однако для lecture/transcript AI пока нет одного канонического subsystem guide: знания всё ещё распределены между `routes`, `firestore-schema`, backlog и `qa-smoke-log`.

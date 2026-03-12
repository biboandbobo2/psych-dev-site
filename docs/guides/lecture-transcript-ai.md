# Lecture / Transcript AI

Цель этого документа: держать в одном месте весь subsystem вокруг видеолекций, транскриптов, глобального transcript search и ИИ-ответов по лекциям.

## Что входит в subsystem

Подсистема состоит из четырёх связанных частей:

1. Импорт и хранение transcript-данных YouTube.
2. Показ transcript внутри страницы занятия и fullscreen study overlay.
3. Глобальный lexical search по transcript chunks.
4. Lecture AI: выбор курса/лекций и ответ по подготовленным lecture chunks.

Этот guide описывает именно runtime-контур. За общие правила проекта отвечают [architecture/guidelines.md](../architecture/guidelines.md) и [architecture/overview.md](../architecture/overview.md).

## Пользовательские сценарии

### 1. Студент открывает лекцию внутри занятия

- Страница занятия рендерит `VideoSection` / `VideoStudyOverlay`.
- Из URL можно открыть transcript сразу через `?study=1&panel=transcript&t=...&video=...`.
- Хук `useVideoTranscript` сначала читает metadata из `videoTranscripts/{youtubeVideoId}`, затем при необходимости подтягивает полный JSON из Storage.
- `VideoTranscriptPanel` показывает transcript с таймкодами и умеет фокусироваться на нужном сегменте.

Ключевые файлы:

- `src/features/periods/components/VideoSection.tsx`
- `src/features/periods/components/VideoStudyOverlay.tsx`
- `src/features/periods/components/VideoTranscriptPanel.tsx`
- `src/hooks/useVideoTranscript.ts`

### 2. Студент ищет фразу по всем транскриптам

- Глобальный поиск вызывает `useTranscriptSearchChunks(query)`.
- Хук ходит в `GET /api/transcript-search?q=...`.
- Ответ приходит списком transcript chunks, уже привязанных к `courseId`, `periodId`, `lectureTitle`, `youtubeVideoId`, `startMs`.
- `useContentSearch` смешивает transcript matches с результатами по контенту и тестам и строит deep link обратно в занятие.

Ключевые файлы:

- `src/features/contentSearch/hooks/useTranscriptSearchChunks.ts`
- `src/features/contentSearch/hooks/useContentSearch.ts`
- `api/transcript-search.ts`

### 3. Студент задаёт вопрос ИИ по лекциям

- Блок `ИИ по лекциям` живёт внутри research/search UI.
- Сначала фронт запрашивает список доступных lecture sources через `GET /api/lectures?action=list`.
- Пользователь выбирает курс целиком или отдельные лекции.
- `useLectureAnswer` отправляет `POST /api/lectures` с `action: "answer"`, вопросом, `courseId` и опциональным списком `lectureKeys`.
- Сервер поднимает релевантные lecture chunks, вызывает Gemini и возвращает чистый ответ плюс citations с deep links обратно в transcript panel.

Ключевые файлы:

- `src/features/lectureSearch/components/LectureSearchBlock.tsx`
- `src/features/lectureSearch/hooks/useLectureSources.ts`
- `src/features/lectureSearch/hooks/useLectureAnswer.ts`
- `src/features/lectureSearch/components/LectureAnswer.tsx`
- `api/lectures.ts`
- `api/lib/lectureApiRuntime.ts`

## Данные и хранилища

### `videoTranscripts/{youtubeVideoId}`

Это metadata-слой transcript pipeline.

Хранит:

- статус `pending | available | unavailable | failed`
- язык, `storagePath`, `segmentCount`, `durationMs`
- `fullTextPreview`
- `fetchedAt`, `lastCheckedAt`, retry-поля и error-поля

Полная схема: [reference/firestore-schema.md](../reference/firestore-schema.md).

### Storage: `video-transcripts/{youtubeVideoId}/transcript.v1.json`

Здесь лежит полный transcript payload:

- `fullText`
- массив `segments[]`
- таймкоды `startMs/endMs`

Firestore нужен для дешёвой проверки наличия transcript; Storage хранит тяжёлый JSON.

### `videoTranscriptSearch/{youtubeVideoId}/searchChunks/*`

Это lexical search index по transcript-данным.

Chunk содержит:

- `courseId`, `periodId`, `periodTitle`
- `lectureTitle`, `youtubeVideoId`
- `text`, `normalizedText`
- `startMs`, `endMs`, `timestampLabel`

Этот индекс используется в двух местах:

- глобальный transcript search через `/api/transcript-search`
- fallback для `/api/lectures`, если prepared lecture sources/chunks ещё не готовы

### `lecture_sources/{lectureKey}`

Это список подготовленных lecture sources для AI retrieval.

`lectureKey` стабильно строится как комбинация курса, занятия и `youtubeVideoId`.

Документ хранит:

- `lectureKey`, `youtubeVideoId`
- `courseId`, `periodId`, `periodTitle`, `lectureTitle`
- `chunkCount`, `durationMs`
- `sourcePath`, `sourceUrl`
- `active`, `version`

### `lecture_chunks/{lectureKey}::chunkIndex`

Это AI-ready чанки для ответа по лекциям.

Документ хранит:

- тот же контекст лекции, что и source doc
- `text`, `normalizedText`
- `startMs`, `endMs`, `timestampLabel`
- `embedding`

Именно эта коллекция является primary retrieval source для `POST /api/lectures`.

### `lecture_ingestion_jobs/*`

Job-документы для принудительного lecture ingestion.

Используются функцией `ingestLectureRag` для:

- статуса job
- progress по embeddings
- логов и ошибок

### `transcriptJobs/weeklyRefresh` и `runs/*`

Операционный контур weekly transcript refresh.

Здесь сохраняются:

- lock / статус регулярной задачи
- summary последнего run
- счётчики `transcriptSyncedCount`, `searchIndexSyncedCount`, `lectureRagSyncedCount`

## Потоки данных

### A. Transcript ingest

Источник правды для lecture reference-ов находится в контентных документах курса: именно оттуда собираются YouTube target-ы.

Pipeline:

1. Сбор target-ов из контента.
2. Загрузка transcript.
3. Запись metadata в `videoTranscripts`.
4. Запись полного JSON в Storage.
5. Построение transcript search index.

Связанные модули:

- `shared/videoTranscripts/*`
- `scripts/importVideoTranscripts.ts`
- `functions/src/weeklyTranscriptRefresh.ts`

### B. Transcript search index

Search index строится поверх transcript payload и привязывает один и тот же `youtubeVideoId` к конкретным course/lesson reference-ам.

Это важно, потому что:

- один transcript может использоваться в нескольких местах;
- deep link должен вести не просто к видео, а к конкретному уроку;
- fallback lecture search тоже требует course/period context.

### C. Lecture RAG ingest

Lecture AI не читает raw transcript напрямую на каждый вопрос. Сначала транскрипт подготавливается в lecture RAG слой:

1. Берётся transcript payload из Storage.
2. Для каждой lecture reference строится `lectureKey`.
3. Генерируются lecture chunks.
4. Для chunks считаются embeddings.
5. В Firestore записываются `lecture_sources` и `lecture_chunks`.

Primary entrypoints:

- `functions/src/ingestLectureRag.ts` для принудительного HTTP-trigger ingest
- `functions/src/weeklyTranscriptRefresh.ts` для фонового обновления после успешного transcript sync

Shared runtime:

- `shared/lectureRag/chunker.js`
- `shared/lectureRag/persistence.js`
- `shared/lectureRag/runner.js`

### D. Глобальный transcript search

`GET /api/transcript-search` сейчас работает как чистый lexical search:

- нормализует query;
- читает transcript search chunks;
- отбирает совпадения по `normalizedText`;
- считает простой match-based score;
- возвращает top matches.

Фронт достраивает путь вида:

- `/{course-path}?study=1&panel=transcript&t=...&video=...`

Это даёт пользователю мгновенный переход в нужную лекцию и точку transcript.

### E. Lecture AI answer

`POST /api/lectures` работает по схеме:

1. Проверка auth и CORS.
2. Валидация `courseId`, `query`, `lectureKeys`.
3. Получение lecture sources:
   - primary: `lecture_sources`
   - fallback: transcript search index
4. Retrieval matching chunks:
   - preferred mode: vector retrieval по `lecture_chunks`
   - fallback mode: lexical transcript chunks, если sources/chunks ещё не подготовлены
5. Генерация ответа Gemini.
6. Возврат `answer` + `citations[]` с deep links.

Именно поэтому lecture AI и transcript subsystem надо рассматривать вместе: lecture AI зависит от transcript pipeline и может частично деградировать до transcript fallback.

## API-контракты

### `GET /api/transcript-search`

Назначение:

- получить transcript matches для глобального поиска

Сейчас:

- метод только `GET`
- auth не требуется
- CORS ограничен localhost/prod/preview allowlist

Ответ:

- `{ ok: true, chunks: VideoTranscriptSearchChunkDoc[] }`

### `GET /api/lectures?action=list`

Назначение:

- вернуть список доступных lecture sources, сгруппированный по курсам

Особенности:

- требует авторизацию через Firebase ID token
- отдаёт только лекции с `active !== false`
- если prepared lecture sources нет, может опираться на fallback из transcript search index

### `POST /api/lectures`

Назначение:

- вернуть ответ ИИ по выбранным лекциям

Body:

```json
{
  "action": "answer",
  "query": "Как в лекциях описывается развитие памяти?",
  "courseId": "general",
  "lectureKeys": []
}
```

Особенности:

- требует `Authorization: Bearer <Firebase ID token>`
- принимает опциональный `X-Gemini-Api-Key`
- ограничивает question length и число selected lectures
- возвращает `answer`, `citations`, `tookMs`

### `POST https://.../ingestLectureRag`

Назначение:

- принудительно подготовить lecture RAG для конкретного `youtubeVideoId`

Защита:

- отдельный secret header `X-Ingest-Secret`

Использовать как пользовательский endpoint нельзя; это инфраструктурный ingestion hook.

## Security и access model

### Lecture AI

`/api/lectures` защищён лучше всего внутри этой подсистемы:

- auth обязателен;
- CORS ограничен allowlist;
- сырые server errors наружу не отдаются;
- JSON от Gemini парсится через tolerant parser.

Реализация:

- `api/lib/lectureApiRuntime.ts`

### Transcript UI

Transcript metadata читается из Firestore, а полный payload грузится из Storage через `useVideoTranscript`.

Операционно в проекте уже зафиксирован public read для `video-transcripts/**`, чтобы transcript был доступен пользователю так же, как доступно само видео. Это решение нужно учитывать перед любыми изменениями storage policy.

### Transcript search

`/api/transcript-search` пока не требует auth и не использует distributed rate limit. Это допустимо для текущего UX, но важно помнить, что search endpoint уже участвует в пользовательском hot path.

## Известные ограничения

### 1. `GET /api/transcript-search` делает full scan

Текущее ограничение подтверждено в review-отчёте:

- [reports/CODE_REVIEW_2026-03-12.md](../reports/CODE_REVIEW_2026-03-12.md)

Проблема:

- endpoint читает весь `collectionGroup(searchChunks)` на каждый запрос и фильтрует его в памяти

Статус:

- вынесено в backlog как активная задача

### 2. Lecture AI зависит от готовности lecture chunks

Если `lecture_sources` / `lecture_chunks` ещё не подготовлены:

- список лекций может собираться из transcript fallback;
- answer mode может деградировать;
- отсутствие prepared chunks должно возвращать понятный fallback, а не silent failure

### 3. Нет одного admin UI для управления transcript/lecture AI pipeline

Сейчас subsystem управляется через:

- content editor для video links
- scripts
- Cloud Functions
- Firestore/Storage data layer

То есть это зрелый runtime pipeline, но не fully productized admin surface.

## Где менять документацию при изменениях

Если меняется:

- transcript schema или job-поля:
  обновляй [reference/firestore-schema.md](../reference/firestore-schema.md)
- маршруты и deep-link поведение:
  обновляй [reference/routes.md](../reference/routes.md)
- testing/smoke/deploy факт:
  добавляй запись в [processes/qa-smoke-log.md](../processes/qa-smoke-log.md)
- новые риски или follow-up задачи:
  обновляй [processes/audit-backlog.md](../processes/audit-backlog.md)
- архитектура lecture/transcript subsystem:
  обновляй этот guide

## Связанные документы

- [reference/routes.md](../reference/routes.md)
- [reference/firestore-schema.md](../reference/firestore-schema.md)
- [guides/multi-course.md](multi-course.md)
- [guides/book-rag.md](book-rag.md)
- [processes/audit-backlog.md](../processes/audit-backlog.md)
- [reports/CODE_REVIEW_2026-03-12.md](../reports/CODE_REVIEW_2026-03-12.md)

**Последнее обновление:** 2026-03-12

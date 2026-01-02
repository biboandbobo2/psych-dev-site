# Система RAG-поиска по книгам

> Документация системы загрузки, индексации и поиска по книгам

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  AdminBooks.tsx ─────────────┬──────────── BookSearch.tsx        │
│       │                      │                   │               │
└───────┼──────────────────────┼───────────────────┼───────────────┘
        │                      │                   │
        ▼                      ▼                   ▼
┌───────────────────┐  ┌──────────────┐  ┌─────────────────────┐
│ /api/admin/books  │  │ Cloud Func   │  │   /api/books        │
│ (unified)         │  │ ingestBook   │  │   (unified)         │
│                   │  │              │  │                     │
│ - list            │  │ - download   │  │ - list (public)     │
│ - create          │  │ - parse PDF  │  │ - search (vector)   │
│ - manage (toggle/ │  │ - chunk      │  │ - answer (RAG)      │
│   delete)         │  │ - embed      │  │ - snippet           │
│ - uploadUrl       │  │ - save       │  │                     │
│ - startIngestion  │  │              │  │                     │
│ - jobStatus       │  │              │  │                     │
└───────────────────┘  └──────────────┘  └─────────────────────┘
        │                      │                   │
        └──────────────────────┼───────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │     FIRESTORE       │
                    │                     │
                    │ - books             │
                    │ - book_chunks       │
                    │ - ingestion_jobs    │
                    └─────────────────────┘
                               │
                    ┌─────────────────────┐
                    │  FIREBASE STORAGE   │
                    │                     │
                    │ books/raw/{id}/     │
                    │   original.pdf      │
                    └─────────────────────┘
```

## Vercel Functions (4 из 12 лимита)

| Файл | Назначение |
|------|------------|
| `/api/admin/books.ts` | Unified admin endpoint (6 actions) |
| `/api/books.ts` | Unified public RAG endpoint (4 actions) |
| `/api/assistant.ts` | AI ассистент |
| `/api/papers.ts` | Научные статьи |

## Firestore Коллекции

### `books`
```typescript
{
  id: string;
  title: string;
  authors: string[];
  language: 'ru' | 'en';
  year: number | null;
  tags: string[];
  status: 'draft' | 'uploaded' | 'processing' | 'ready' | 'error';
  active: boolean;          // Видима ли в публичном поиске
  chunksCount: number | null;
  pageCount?: number;
  lastJobId?: string;
  errors: Array<{ step: string; message: string; at: string }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `book_chunks`
```typescript
{
  id: string;
  bookId: string;
  pageStart: number;
  pageEnd: number;
  preview: string;          // Первые ~400 символов
  textHash: string;         // SHA1 для дедупликации
  embedding: VectorValue;   // 768-dim vector
  createdAt: Timestamp;
}
```

### `ingestion_jobs`
```typescript
{
  id: string;
  bookId: string;
  status: 'queued' | 'running' | 'done' | 'error';
  step: 'download' | 'extract' | 'chunk' | 'embed' | 'save';
  progress: { done: number; total: number };
  startedAt: Timestamp;
  finishedAt: Timestamp | null;
  logs: string[];
  error: { message: string; step: string; stack?: string } | null;
}
```

## Cloud Function: ingestBook

**Расположение:** `functions/src/ingestBook.ts`

**Конфигурация:**
- Timeout: 540s (9 минут)
- Memory: 2GiB
- Region: europe-west1
- Secrets: GEMINI_API_KEY

### Pipeline обработки:

1. **Download** — Скачивание PDF из Storage
2. **Extract** — Извлечение текста (unpdf)
3. **Chunk** — Разбиение на чанки (1500-2500 символов, overlap 200)
4. **Embed** — Получение embeddings (text-embedding-004, 768 dims)
5. **Save** — Сохранение в Firestore батчами по 100

### Библиотеки:
- `unpdf` — Serverless-friendly PDF parser
- `@google/genai` — Gemini embeddings

## API Endpoints

### Admin API: `/api/admin/books`

| Action | Method | Параметры |
|--------|--------|-----------|
| `list` | GET | - |
| `create` | POST | title, authors, language, year?, tags? |
| `manage` | POST | subAction: 'toggleActive' \| 'delete', bookId |
| `uploadUrl` | POST | bookId, contentType, fileSize |
| `startIngestion` | POST | bookId |
| `jobStatus` | GET | jobId (query param) |

### Public API: `/api/books`

| Action | Method | Параметры |
|--------|--------|-----------|
| `list` | GET | - (кэш 5 мин) |
| `search` | POST | query, bookIds[] |
| `answer` | POST | query, bookIds[] |
| `snippet` | GET | chunkId, maxChars? |

## Известные проблемы и решения

### 1. Vercel Function Limit (12 functions)
**Проблема:** На Hobby плане Vercel ограничение 12 функций.

**Решение:** Объединение эндпоинтов в unified endpoints с action-based routing:
- 10 отдельных файлов → 2 unified файла
- Освобождено 8 слотов

### 2. SignatureDoesNotMatch при загрузке PDF
**Проблема:** `getSignedUrl()` генерировал неправильную подпись.

**Решение:** Использовать `createResumableUpload()`:
```typescript
// Неправильно:
const [url] = await file.getSignedUrl({ action: 'write', ... });

// Правильно:
const [url] = await file.createResumableUpload({
  origin: req.headers.origin || '*',
  metadata: { contentType: 'application/pdf' }
});
```

### 3. Cloud Function не запускалась
**Проблема:** Vercel ждал ответа от Cloud Function (9 мин), получал timeout.

**Решение:** Fire-and-forget pattern с AbortController:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 3000);

await fetch(cloudFunctionUrl, {
  method: 'POST',
  body: JSON.stringify({ bookId, jobId }),
  signal: controller.signal,
}).catch(() => {});

clearTimeout(timeoutId);
```

### 4. Infinite loop в chunker
**Проблема:** При коротких текстах chunker зацикливался.

**Решение:** Проверка продвижения позиции:
```typescript
const prevPosition = position;
position = endPosition - config.overlap;

if (position <= prevPosition) {
  position = endPosition;  // Избегаем бесконечного цикла
}
```

### 5. Логи исчезали при ошибке
**Проблема:** UI сбрасывал jobStatus сразу после ошибки.

**Решение:** Не очищать jobStatus автоматически, добавить кнопку "Закрыть":
```typescript
if (!watchingJobId) {
  // Don't clear jobStatus here - keep it visible for error review
  return;
}
```

### 6. "Method not allowed" для jobStatus
**Проблема:** jobStatus требует GET, но проверка POST блокировала раньше.

**Решение:** Обрабатывать GET endpoints в отдельном блоке до проверки POST.

### 7. Gemini JSON parse error
**Проблема:** Модель иногда возвращала невалидный JSON.

**Решение:** Fallback — если парсинг не удался, возвращать сырой текст:
```typescript
catch (parseError) {
  geminiResponse = {
    answer: rawText || 'Не удалось сгенерировать ответ.',
    citations: []
  };
}
```

## Конфигурация

### Environment Variables (Vercel)
- `FIREBASE_SERVICE_ACCOUNT_KEY` — JSON ключ service account
- `FIREBASE_STORAGE_BUCKET` — Bucket name
- `GEMINI_API_KEY` — Ключ Gemini API
- `INGEST_BOOK_FUNCTION_URL` — URL Cloud Function

### Firestore Indexes
Требуется composite index для vector search:
```
Collection: book_chunks
Fields: bookId (ASC), embedding (VECTOR)
```

## Chunking Config

```typescript
DEFAULT_CHUNK_CONFIG = {
  minChars: 1500,   // Минимум символов в чанке
  maxChars: 2500,   // Максимум символов
  overlap: 200,     // Перекрытие между чанками
  previewChars: 400 // Символов в preview
}
```

## Embedding Config

```typescript
EMBEDDING_MODEL = 'text-embedding-004'
EMBEDDING_DIMS = 768
BATCH_SIZE = 32
PARALLEL_LIMIT = 5
```

## RAG Config

```typescript
BOOK_SEARCH_CONFIG = {
  maxBooksPerSearch: 10,
  minQuestionLength: 3,
  maxQuestionLength: 500,
  candidateK: 50,        // Кандидатов из vector search
  contextK: 10,          // Чанков в контекст LLM
  answerMaxParagraphs: 4
}
```

## Модели

| Задача | Модель |
|--------|--------|
| Embeddings | `text-embedding-004` |
| RAG Answer | `gemini-2.5-flash-lite` |

---

*Последнее обновление: 2024-12-24*

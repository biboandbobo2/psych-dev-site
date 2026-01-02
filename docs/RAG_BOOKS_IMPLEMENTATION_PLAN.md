# RAG-поиск по книгам — План реализации

> **Версия:** 1.0
> **Дата:** 2024-12-21
> **Статус:** В разработке

## Содержание
1. [Обзор и цели](#1-обзор-и-цели)
2. [Архитектурные решения](#2-архитектурные-решения)
3. [Data Model](#3-data-model)
4. [Файловая структура](#4-файловая-структура)
5. [План реализации (Phase A→G)](#5-план-реализации-phase-ag)
6. [Параметры по умолчанию](#6-параметры-по-умолчанию)
7. [Что НЕ делать в MVP](#7-что-не-делать-в-mvp)

---

## 1. Обзор и цели

### 1.1 Цели
1. Пользователь задаёт вопрос → получает ответ (≤4 абзаца) с **цитатами из книг**
2. Ответ содержит ссылки на место (книга/страница/глава)
3. Кнопка "Показать цитату" раскрывает до **5000 символов** текста

### 1.2 Ограничения
- Библиотека: **200–500 книг** (только PDF)
- Одновременный поиск по **5–10 книгам** (выбор пользователя)
- Цитаты до 5000 символов **без расхода токенов** (pointer-based)

### 1.3 Ключевые решения
| Решение | Выбор | Обоснование |
|---------|-------|-------------|
| Ingestion runtime | Cloud Functions Gen2 | HTTP trigger, до 60 мин, интеграция с Firebase |
| Формат книг | Только PDF | Упрощает MVP, без конвертации |
| Vector DB | Firestore Vector Search | Встроен в Firebase, composite indexes |
| Embeddings | Gemini `text-embedding-004` | 768 dims, official SDK |
| LLM для ответов | Gemini 2.5 Flash | Уже используется в assistant.ts |

---

## 2. Архитектурные решения

### 2.1 Хранилища

**Firebase Storage:**
```
books/
├── raw/{bookId}/original.pdf    # Загруженный оригинал
├── text/{bookId}/pages.json.gz  # Текст по страницам (сжатый)
└── text/{bookId}/chunks.json    # Метаданные чанков (опционально)
```

**Firestore Collections:**
```
books/{bookId}                    # Метаданные книги
book_chunks/{chunkId}             # Чанки с embeddings
ingestion_jobs/{jobId}            # Статус обработки
```

### 2.2 API Endpoints (Vercel)

**Пользовательские (в `/api/`):**
| Endpoint | Метод | Назначение |
|----------|-------|------------|
| `/api/books/search` | POST | Retrieval: embed query → vector search → rerank |
| `/api/books/answer` | POST | RAG: Gemini генерирует ответ с citations |
| `/api/books/snippet` | GET | Возвращает длинную цитату (до 5000 символов) |
| `/api/books/list` | GET | Список доступных книг (status=ready) |

**Админские (в `/api/admin/`):**
| Endpoint | Метод | Назначение |
|----------|-------|------------|
| `/api/admin/books/create` | POST | Создать книгу (metadata) |
| `/api/admin/books/list` | GET | Все книги (включая draft/processing) |
| `/api/admin/books/uploadUrl` | POST | Signed URL для загрузки в Storage |
| `/api/admin/books/startIngestion` | POST | Запустить Cloud Function |
| `/api/admin/books/jobStatus` | GET | Статус обработки |
| `/api/admin/books/delete` | DELETE | Удалить книгу |

### 2.3 Cloud Function (Ingestion)

**Расположение:** `/functions/src/ingestBook.ts`

**Поток обработки:**
```
1. Получить bookId из HTTP request
2. Скачать PDF из Storage (books/raw/{bookId}/original.pdf)
3. Извлечь текст по страницам (pdf-parse)
4. Сохранить pages.json.gz в Storage
5. Разбить на чанки (1500-2500 символов, overlap 200)
6. Получить embeddings (Gemini batch API)
7. Записать чанки в Firestore (book_chunks/{chunkId})
8. Обновить статус книги → ready
```

---

## 3. Data Model

### 3.1 `books/{bookId}`

```typescript
// src/types/books.ts
export interface Book {
  id: string;
  title: string;
  authors: string[];
  language: 'ru' | 'en' | 'de' | 'fr' | 'es';
  year?: number;
  tags: string[];                    // psychology, development, clinical
  pageCount?: number;

  // Storage paths
  storageRawPath: string;            // books/raw/{bookId}/original.pdf
  storagePagesPath?: string;         // books/text/{bookId}/pages.json.gz

  // Status
  status: 'draft' | 'uploaded' | 'processing' | 'ready' | 'error';
  active: boolean;                   // Показывать пользователям

  // Ingestion
  lastJobId?: string;
  chunksCount?: number;
  errors?: Array<{ step: string; message: string; at: string }>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;                 // UID superadmin
}

export type BookStatus = Book['status'];
```

### 3.2 `book_chunks/{chunkId}`

```typescript
export interface BookChunk {
  id: string;
  bookId: string;                    // Для фильтра IN

  // Позиция в книге
  pageStart: number;
  pageEnd: number;
  chapterTitle?: string;             // Если извлекли

  // Контент
  preview: string;                   // 300-500 символов для UI
  textHash: string;                  // SHA-1 для дедупликации

  // Vector
  embedding: number[];               // 768 dims

  // Timestamps
  createdAt: Timestamp;
}
```

### 3.3 `ingestion_jobs/{jobId}`

```typescript
export interface IngestionJob {
  id: string;
  bookId: string;
  status: 'queued' | 'running' | 'done' | 'error';

  // Progress
  step: 'download' | 'extract' | 'chunk' | 'embed' | 'save';
  progress: { done: number; total: number };

  // Timing
  startedAt: Timestamp;
  finishedAt?: Timestamp;

  // Logs
  logs: string[];
  error?: { message: string; step: string; stack?: string };
}
```

---

## 4. Файловая структура

```
psych-dev-site/
├── api/
│   ├── books/
│   │   ├── search.ts              # POST: vector search + rerank
│   │   ├── answer.ts              # POST: RAG ответ
│   │   ├── snippet.ts             # GET: длинная цитата
│   │   └── list.ts                # GET: список книг
│   └── admin/
│       └── books/
│           ├── create.ts          # POST: создать книгу
│           ├── list.ts            # GET: все книги
│           ├── uploadUrl.ts       # POST: signed URL
│           ├── startIngestion.ts  # POST: запуск Cloud Function
│           ├── jobStatus.ts       # GET: статус job
│           └── delete.ts          # DELETE: удалить книгу
│
├── functions/src/
│   ├── index.ts                   # Экспорт всех functions
│   ├── ingestBook.ts              # HTTP: основная логика ingestion
│   └── lib/
│       ├── pdfParser.ts           # pdf-parse wrapper
│       ├── chunker.ts             # Разбиение на чанки
│       └── embeddings.ts          # Gemini embeddings batch
│
├── src/
│   ├── types/
│   │   └── books.ts               # Book, BookChunk, IngestionJob
│   │
│   ├── features/
│   │   └── bookSearch/            # Новый feature module
│   │       ├── components/
│   │       │   ├── BookSearchBlock.tsx    # UI поиска
│   │       │   ├── BookSelector.tsx       # Мультиселект книг
│   │       │   ├── BookAnswer.tsx         # Ответ с citations
│   │       │   └── BookSnippetModal.tsx   # Модалка цитаты
│   │       ├── hooks/
│   │       │   ├── useBookSearch.ts       # Поиск
│   │       │   ├── useBookAnswer.ts       # RAG ответ
│   │       │   └── useBookList.ts         # Загрузка списка
│   │       └── index.ts                   # Barrel export
│   │
│   ├── pages/
│   │   └── AdminBooks.tsx         # Админка: управление книгами
│   │
│   └── lib/
│       └── booksApi.ts            # API клиент для книг
│
└── docs/
    └── RAG_BOOKS_IMPLEMENTATION_PLAN.md  # Этот файл
```

---

## 5. План реализации (Phase A→G)

### Протокол выполнения

После **каждого шага**:
```bash
npm run lint && npm run check-console && npm run build
```
Если что-то красное — **исправить и не переходить дальше**.

---

### Phase A — Типы и валидация (E: S)

**Цель:** Добавить TypeScript типы и утилиты валидации.

| ID | Задача | Файлы |
|----|--------|-------|
| A1 | Создать типы Book, BookChunk, IngestionJob | `src/types/books.ts` |
| A2 | Добавить Zod схемы для API валидации | `src/lib/validation/books.ts` |
| A3 | Добавить константы (лимиты, статусы) | `src/constants/books.ts` |

**Гейт:** `npm run build` зелёный.

---

### Phase B — Admin API (E: M)

**Цель:** API для управления книгами (CRUD + ingestion).

| ID | Задача | Файлы |
|----|--------|-------|
| B1 | `POST /api/admin/books/create` — создать книгу | `api/admin/books/create.ts` |
| B2 | `GET /api/admin/books/list` — список книг | `api/admin/books/list.ts` |
| B3 | `POST /api/admin/books/uploadUrl` — signed URL | `api/admin/books/uploadUrl.ts` |
| B4 | `POST /api/admin/books/startIngestion` — запуск | `api/admin/books/startIngestion.ts` |
| B5 | `GET /api/admin/books/jobStatus` — статус | `api/admin/books/jobStatus.ts` |
| B6 | Тесты: валидация, проверка роли | `api/admin/books/__tests__/` |

**Проверка роли superadmin:**
```typescript
// Использовать паттерн из существующего кода
import { SUPER_ADMIN_EMAIL } from '@/constants/superAdmin';
// Или проверять claims.role === 'super-admin'
```

**Гейт:** lint/build зелёные + тесты проходят.

---

### Phase C — Admin UI: Книги (E: M)

**Цель:** Страница `/admin/books` для управления книгами.

| ID | Задача | Файлы |
|----|--------|-------|
| C1 | Добавить роут в навигацию Admin.tsx | `src/pages/Admin.tsx` |
| C2 | Создать AdminBooks.tsx — список книг | `src/pages/AdminBooks.tsx` |
| C3 | Форма создания книги | `AdminBooks.tsx` |
| C4 | Upload UI с прогрессом | `AdminBooks.tsx` |
| C5 | Запуск ingestion + мониторинг | `AdminBooks.tsx` |
| C6 | Добавить в lazy.ts | `src/pages/lazy.ts` |

**UI элементы:**
- Таблица книг (title, authors, status, actions)
- Кнопки: Create, Upload, Start Ingestion, Delete
- Progress bar для upload и ingestion
- Статусы: draft → uploaded → processing → ready

**Гейт:** build зелёный + smoke test "создал → загрузил → вижу статус".

---

### Phase D — Ingestion Cloud Function (E: L)

**Цель:** Обработка PDF: извлечение текста, чанкинг, embeddings.

| ID | Задача | Файлы |
|----|--------|-------|
| D1 | Настроить Cloud Functions Gen2 в проекте | `functions/` |
| D2 | HTTP trigger `ingestBook` | `functions/src/ingestBook.ts` |
| D3 | PDF парсер (pdf-parse) | `functions/src/lib/pdfParser.ts` |
| D4 | Chunker (1500-2500 символов, overlap 200) | `functions/src/lib/chunker.ts` |
| D5 | Gemini embeddings batch | `functions/src/lib/embeddings.ts` |
| D6 | Запись в Firestore + обновление статуса | `ingestBook.ts` |
| D7 | Unit тесты chunker | `functions/src/lib/__tests__/` |

**Важно:**
- Обновлять `ingestion_jobs` прогресс каждые 10-20 чанков
- Retry logic для Gemini API (429, 5xx)
- Таймаут функции: 540 сек (9 мин)
- Память: 2GB

**Гейт:** Тестовый прогон на 1 книге успешен.

---

### Phase E — Retrieval API (E: M)

**Цель:** Поиск по выбранным книгам.

| ID | Задача | Файлы |
|----|--------|-------|
| E1 | `POST /api/books/search` | `api/books/search.ts` |
| E2 | Embed query (Gemini) | `search.ts` |
| E3 | Firestore vector search с фильтром `bookId IN` | `search.ts` |
| E4 | Hybrid rerank (vector + lexical) | `search.ts` |
| E5 | `GET /api/books/list` — публичный список | `api/books/list.ts` |
| E6 | Тесты: лимиты, сортировка | `api/books/__tests__/` |

**Firestore Vector Index (создать вручную):**
```
Collection: book_chunks
Field: embedding
Dimensions: 768
Distance: COSINE
```

**Composite index:**
```
Collection: book_chunks
Fields: bookId (ASC), embedding (VECTOR)
```

**Гейт:** lint/build зелёные + тесты проходят.

---

### Phase F — Answer API + Snippet (E: M)

**Цель:** RAG-ответ с цитатами.

| ID | Задача | Файлы |
|----|--------|-------|
| F1 | `POST /api/books/answer` | `api/books/answer.ts` |
| F2 | Prompt engineering (≤4 абзаца, JSON citations) | `answer.ts` |
| F3 | JSON parse + 1 retry | `answer.ts` |
| F4 | Валидация chunkId в citations | `answer.ts` |
| F5 | `GET /api/books/snippet` | `api/books/snippet.ts` |
| F6 | Enforce maxChars ≤ 5000 | `snippet.ts` |
| F7 | Тесты | `api/books/__tests__/` |

**Формат ответа модели:**
```json
{
  "answer": "Абзац1...\n\nАбзац2...",
  "citations": [
    { "chunkId": "abc123", "claim": "Привязанность формируется..." }
  ]
}
```

**Гейт:** lint/build зелёные + тесты проходят.

---

### Phase G — User UI: Поиск по книгам (E: M)

**Цель:** Интегрировать поиск в ResearchSearchDrawer.

| ID | Задача | Файлы |
|----|--------|-------|
| G1 | Создать feature module `bookSearch` | `src/features/bookSearch/` |
| G2 | BookSearchBlock.tsx — основной UI | `components/BookSearchBlock.tsx` |
| G3 | BookSelector.tsx — мультиселект книг (max 10) | `components/BookSelector.tsx` |
| G4 | BookAnswer.tsx — ответ с citations | `components/BookAnswer.tsx` |
| G5 | BookSnippetModal.tsx — раскрытие цитаты | `components/BookSnippetModal.tsx` |
| G6 | Хуки: useBookSearch, useBookAnswer, useBookList | `hooks/` |
| G7 | Интеграция в ResearchSearchDrawer | `ResearchSearchDrawer.tsx` |
| G8 | Добавить вкладку/секцию "Поиск по книгам" | UI |

**Расположение в UI:**
- В `ResearchSearchDrawer.tsx` добавить новую секцию ПОД `AiAssistantBlock`
- Или новая вкладка в переключателе режимов

**Гейт:** build зелёный + E2E "выбрал книги → спросил → получил ответ → раскрыл цитату".

---

## 6. Параметры по умолчанию

```typescript
// src/constants/books.ts
export const BOOK_SEARCH_CONFIG = {
  // Лимиты
  maxBooksPerSearch: 10,
  maxQuestionLength: 500,

  // Retrieval
  candidateK: 50,           // Кандидаты из vector search
  contextK: 10,             // Чанков в контекст модели

  // Chunking
  chunkMinChars: 1500,
  chunkMaxChars: 2500,
  chunkOverlap: 200,

  // Response
  answerMaxParagraphs: 4,
  snippetMaxChars: 5000,
  chunkPreviewChars: 400,

  // Embeddings
  embeddingModel: 'text-embedding-004',
  embeddingDims: 768,
} as const;
```

---

## 7. Что НЕ делать в MVP

1. **OCR для сканов** — отдельный backlog item
2. **Поиск по всем книгам сразу** — нарушает UX и производительность
3. **Хранить полный текст в Firestore** — только в Storage
4. **DOCX/EPUB поддержка** — только PDF в MVP
5. **Авто-определение глав** — вручную из metadata
6. **Semantic caching ответов** — в будущем

---

## Чеклист запуска

### Перед Phase D (Cloud Function):
- [ ] `firebase login`
- [ ] Включить Cloud Functions Gen2 в Firebase Console
- [ ] Добавить `GEMINI_API_KEY` в Cloud Functions config

### Перед Phase E (Vector Search):
- [ ] Создать vector index в Firestore Console
- [ ] Создать composite index (bookId + embedding)

### Перед релизом:
- [ ] Загрузить 5-10 тестовых книг
- [ ] Проверить качество retrieval
- [ ] Smoke test полного flow

---

## Связанные документы

- `docs/audit-backlog.md` — бэклог проекта
- `docs/ARCHITECTURE_GUIDELINES.md` — архитектурные правила
- `api/assistant.ts` — референс для Gemini API
- `src/features/researchSearch/` — референс для feature structure

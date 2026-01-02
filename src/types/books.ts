import { Timestamp } from 'firebase/firestore';

/**
 * Статус книги в системе
 */
export type BookStatus = 'draft' | 'uploaded' | 'processing' | 'ready' | 'error';

/**
 * Поддерживаемые языки книг
 */
export type BookLanguage = 'ru' | 'en' | 'de' | 'fr' | 'es';

/**
 * Теги/категории книг
 */
export type BookTag = 'development' | 'clinical' | 'general' | 'pedagogy' | 'neuroscience';

/**
 * Ошибка при обработке книги
 */
export interface BookError {
  step: string;
  message: string;
  at: string; // ISO timestamp
}

/**
 * Книга в библиотеке RAG
 * Collection: books/{bookId}
 */
export interface Book {
  id: string;
  title: string;
  authors: string[];
  language: BookLanguage;
  year?: number;
  tags: BookTag[];
  pageCount?: number;

  // Storage paths
  storageRawPath: string; // books/raw/{bookId}/original.pdf
  storagePagesPath?: string; // books/text/{bookId}/pages.json.gz

  // Status
  status: BookStatus;
  active: boolean; // Показывать пользователям в списке

  // Ingestion
  lastJobId?: string;
  chunksCount?: number;
  errors?: BookError[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // UID superadmin
}

/**
 * Данные для создания книги (без id и timestamps)
 */
export type BookCreateData = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Данные для обновления книги
 */
export type BookUpdateData = Partial<Omit<Book, 'id' | 'createdAt' | 'createdBy'>>;

/**
 * Книга для отображения пользователю (только ready + active)
 */
export interface BookListItem {
  id: string;
  title: string;
  authors: string[];
  language: BookLanguage;
  year?: number;
  tags: BookTag[];
}

/**
 * Чанк книги с эмбеддингом
 * Collection: book_chunks/{chunkId}
 */
export interface BookChunk {
  id: string;
  bookId: string; // Для фильтра IN при поиске

  // Позиция в книге
  pageStart: number;
  pageEnd: number;
  chapterTitle?: string; // Если извлекли из структуры

  // Контент
  preview: string; // 300-500 символов для UI
  textHash: string; // SHA-1 для дедупликации при переиндексации

  // Vector embedding (768 dims для text-embedding-004)
  embedding: number[];

  // Timestamps
  createdAt: Timestamp;
}

/**
 * Чанк без embedding (для передачи клиенту)
 */
export type BookChunkPreview = Omit<BookChunk, 'embedding' | 'textHash'>;

/**
 * Результат поиска с score
 */
export interface BookSearchResult {
  chunk: BookChunkPreview;
  book: BookListItem;
  score: number; // Комбинированный score (vector + lexical)
}

/**
 * Статус шага ingestion
 */
export type IngestionStep = 'download' | 'extract' | 'chunk' | 'embed' | 'save';

/**
 * Статус задачи ingestion
 */
export type IngestionStatus = 'queued' | 'running' | 'done' | 'error';

/**
 * Задача обработки книги
 * Collection: ingestion_jobs/{jobId}
 */
export interface IngestionJob {
  id: string;
  bookId: string;
  status: IngestionStatus;

  // Progress
  step: IngestionStep;
  progress: {
    done: number;
    total: number;
  };

  // Timing
  startedAt: Timestamp;
  finishedAt?: Timestamp;

  // Logs
  logs: string[];
  error?: {
    message: string;
    step: string;
    stack?: string;
  };
}

/**
 * Citation в ответе RAG
 */
export interface BookCitation {
  chunkId: string;
  bookId: string;
  bookTitle: string;
  pageStart: number;
  pageEnd: number;
  claim: string; // К какому утверждению относится
}

/**
 * Ответ RAG API
 */
export interface BookAnswerResponse {
  answer: string; // До 4 абзацев
  citations: BookCitation[];
  tookMs: number;
}

/**
 * Запрос к RAG API
 */
export interface BookSearchRequest {
  query: string;
  bookIds: string[]; // 1-10 книг
}

/**
 * Запрос snippet
 */
export interface BookSnippetRequest {
  chunkId: string;
  maxChars?: number; // Default 5000
}

/**
 * Ответ snippet API
 */
export interface BookSnippetResponse {
  text: string;
  bookTitle: string;
  pageStart: number;
  pageEnd: number;
  chapterTitle?: string;
}

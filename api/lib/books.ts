/**
 * Конфигурация RAG-поиска по книгам
 * (копия для serverless functions, т.к. они не могут импортировать из /src/)
 */
export const BOOK_SEARCH_CONFIG = {
  // Лимиты пользовательского поиска
  maxBooksPerSearch: 10,
  minBooksPerSearch: 1,
  maxQuestionLength: 500,
  minQuestionLength: 3,

  // Retrieval параметры
  candidateK: 50, // Кандидаты из vector search
  contextK: 10, // Чанков в контекст модели

  // Chunking параметры
  chunkMinChars: 1500,
  chunkMaxChars: 2500,
  chunkOverlap: 200,
  chunkPreviewChars: 400, // Для UI preview

  // Response параметры
  answerMaxParagraphs: 4,
  snippetMaxChars: 5000,
  snippetDefaultChars: 3000,

  // Embeddings
  embeddingModel: 'text-embedding-004',
  embeddingDims: 768,

  // Rate limiting
  searchRateLimit: 20, // запросов в минуту
  answerRateLimit: 10, // запросов в минуту
} as const;

/**
 * Firebase Storage пути
 */
export const BOOK_STORAGE_PATHS = {
  raw: (bookId: string) => `books/raw/${bookId}/original.pdf`,
  pages: (bookId: string) => `books/text/${bookId}/pages.json.gz`,
  chunks: (bookId: string) => `books/text/${bookId}/chunks.json`,
} as const;

/**
 * Firestore collections
 */
export const BOOK_COLLECTIONS = {
  books: 'books',
  chunks: 'book_chunks',
  jobs: 'ingestion_jobs',
} as const;

/**
 * Максимальный размер файла (50 MB)
 */
export const MAX_BOOK_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Допустимые MIME типы
 */
export const ALLOWED_BOOK_MIME_TYPES = ['application/pdf'] as const;

/**
 * Шаги ingestion с описанием
 */
export const INGESTION_STEP_LABELS = {
  download: 'Загрузка PDF',
  extract: 'Извлечение текста',
  chunk: 'Разбиение на части',
  embed: 'Создание эмбеддингов',
  save: 'Сохранение в базу',
} as const;

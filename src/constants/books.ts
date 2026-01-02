/**
 * Конфигурация RAG-поиска по книгам
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
  answerMaxParagraphs: 6,
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
 * Статусы книги с описанием
 */
export const BOOK_STATUS_LABELS = {
  draft: 'Черновик',
  uploaded: 'Загружен',
  processing: 'Обработка',
  ready: 'Готов',
  error: 'Ошибка',
} as const;

/**
 * Языки книг с названиями
 */
export const BOOK_LANGUAGE_LABELS = {
  ru: 'Русский',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
} as const;

/**
 * Теги книг с названиями
 */
export const BOOK_TAG_LABELS = {
  development: 'Психология развития',
  clinical: 'Клиническая психология',
  general: 'Общая психология',
  pedagogy: 'Педагогика',
  neuroscience: 'Нейронауки',
} as const;

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
 * Максимальный размер файла (100 MB)
 * ВАЖНО: Синхронизировано с api/admin/books.ts
 */
export const MAX_BOOK_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Допустимые MIME типы
 */
export const ALLOWED_BOOK_MIME_TYPES = ['application/pdf'] as const;

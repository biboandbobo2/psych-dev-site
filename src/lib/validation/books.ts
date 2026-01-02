/**
 * Утилиты валидации для Book API
 * Следуем паттерну из api/assistant.ts (без Zod)
 */

import { BOOK_SEARCH_CONFIG, ALLOWED_BOOK_MIME_TYPES, MAX_BOOK_FILE_SIZE } from '@/constants/books';
import type { BookLanguage, BookTag, BookStatus } from '@/types/books';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface BookCreateInput {
  title: string;
  authors: string[];
  language: BookLanguage;
  year?: number;
  tags: BookTag[];
}

export interface BookSearchInput {
  query: string;
  bookIds: string[];
}

export interface BookSnippetInput {
  chunkId: string;
  maxChars?: number;
}

// ============================================================================
// VALIDATORS
// ============================================================================

const VALID_LANGUAGES: BookLanguage[] = ['ru', 'en', 'de', 'fr', 'es'];
const VALID_TAGS: BookTag[] = ['development', 'clinical', 'general', 'pedagogy', 'neuroscience'];
const VALID_STATUSES: BookStatus[] = ['draft', 'uploaded', 'processing', 'ready', 'error'];

/**
 * Валидация данных создания книги
 */
export function validateBookCreate(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Некорректные данные' };
  }

  const data = input as Record<string, unknown>;

  // title
  if (typeof data.title !== 'string' || data.title.trim().length < 2) {
    return { valid: false, error: 'Название книги должно содержать минимум 2 символа' };
  }
  if (data.title.length > 500) {
    return { valid: false, error: 'Название книги слишком длинное (макс. 500 символов)' };
  }

  // authors
  if (!Array.isArray(data.authors) || data.authors.length === 0) {
    return { valid: false, error: 'Укажите хотя бы одного автора' };
  }
  if (data.authors.length > 20) {
    return { valid: false, error: 'Слишком много авторов (макс. 20)' };
  }
  for (const author of data.authors) {
    if (typeof author !== 'string' || author.trim().length < 2) {
      return { valid: false, error: 'Имя автора должно содержать минимум 2 символа' };
    }
  }

  // language
  if (!VALID_LANGUAGES.includes(data.language as BookLanguage)) {
    return { valid: false, error: `Неподдерживаемый язык. Допустимые: ${VALID_LANGUAGES.join(', ')}` };
  }

  // year (optional)
  if (data.year !== undefined) {
    const year = Number(data.year);
    if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear() + 1) {
      return { valid: false, error: 'Некорректный год издания' };
    }
  }

  // tags
  if (!Array.isArray(data.tags)) {
    return { valid: false, error: 'Теги должны быть массивом' };
  }
  for (const tag of data.tags) {
    if (!VALID_TAGS.includes(tag as BookTag)) {
      return { valid: false, error: `Неизвестный тег: ${tag}. Допустимые: ${VALID_TAGS.join(', ')}` };
    }
  }

  return { valid: true };
}

/**
 * Валидация поискового запроса
 */
export function validateBookSearch(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Некорректные данные' };
  }

  const data = input as Record<string, unknown>;

  // query
  if (typeof data.query !== 'string') {
    return { valid: false, error: 'Вопрос должен быть строкой' };
  }
  const query = data.query.trim();
  if (query.length < BOOK_SEARCH_CONFIG.minQuestionLength) {
    return { valid: false, error: `Вопрос слишком короткий (мин. ${BOOK_SEARCH_CONFIG.minQuestionLength} символа)` };
  }
  if (query.length > BOOK_SEARCH_CONFIG.maxQuestionLength) {
    return { valid: false, error: `Вопрос слишком длинный (макс. ${BOOK_SEARCH_CONFIG.maxQuestionLength} символов)` };
  }

  // bookIds
  if (!Array.isArray(data.bookIds)) {
    return { valid: false, error: 'bookIds должен быть массивом' };
  }
  if (data.bookIds.length < BOOK_SEARCH_CONFIG.minBooksPerSearch) {
    return { valid: false, error: `Выберите минимум ${BOOK_SEARCH_CONFIG.minBooksPerSearch} книгу` };
  }
  if (data.bookIds.length > BOOK_SEARCH_CONFIG.maxBooksPerSearch) {
    return { valid: false, error: `Максимум ${BOOK_SEARCH_CONFIG.maxBooksPerSearch} книг для поиска` };
  }
  for (const id of data.bookIds) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      return { valid: false, error: 'Некорректный ID книги' };
    }
  }

  return { valid: true };
}

/**
 * Валидация запроса snippet
 */
export function validateBookSnippet(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Некорректные данные' };
  }

  const data = input as Record<string, unknown>;

  // chunkId
  if (typeof data.chunkId !== 'string' || data.chunkId.trim().length === 0) {
    return { valid: false, error: 'chunkId обязателен' };
  }

  // maxChars (optional)
  if (data.maxChars !== undefined) {
    const maxChars = Number(data.maxChars);
    if (!Number.isInteger(maxChars) || maxChars < 100 || maxChars > BOOK_SEARCH_CONFIG.snippetMaxChars) {
      return { valid: false, error: `maxChars должен быть от 100 до ${BOOK_SEARCH_CONFIG.snippetMaxChars}` };
    }
  }

  return { valid: true };
}

/**
 * Валидация загружаемого файла
 */
export function validateBookFile(file: { size: number; type: string; name: string }): ValidationResult {
  // Size check
  if (file.size > MAX_BOOK_FILE_SIZE) {
    const maxMB = Math.round(MAX_BOOK_FILE_SIZE / 1024 / 1024);
    return { valid: false, error: `Файл слишком большой (макс. ${maxMB} MB)` };
  }

  // MIME type check
  if (!ALLOWED_BOOK_MIME_TYPES.includes(file.type as typeof ALLOWED_BOOK_MIME_TYPES[number])) {
    return { valid: false, error: 'Только PDF файлы поддерживаются' };
  }

  // Extension check
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Файл должен иметь расширение .pdf' };
  }

  return { valid: true };
}

/**
 * Валидация статуса книги
 */
export function isValidBookStatus(status: unknown): status is BookStatus {
  return typeof status === 'string' && VALID_STATUSES.includes(status as BookStatus);
}

/**
 * Валидация языка книги
 */
export function isValidBookLanguage(language: unknown): language is BookLanguage {
  return typeof language === 'string' && VALID_LANGUAGES.includes(language as BookLanguage);
}

/**
 * Санитизация строки (удаление потенциально опасных символов)
 */
export function sanitizeString(str: string): string {
  return str.trim().slice(0, 1000);
}

/**
 * Санитизация массива строк
 */
export function sanitizeStringArray(arr: unknown[]): string[] {
  return arr
    .filter((item): item is string => typeof item === 'string')
    .map((s) => sanitizeString(s))
    .filter((s) => s.length > 0);
}

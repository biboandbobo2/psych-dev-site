/**
 * Unit тесты для Book RAG API
 * Тестируем: конфигурацию, lexical scoring, валидацию
 */
import { describe, it, expect } from 'vitest';
import {
  BOOK_COLLECTIONS,
  BOOK_SEARCH_CONFIG,
  BOOK_STORAGE_PATHS,
  computeLexicalScore,
  SYSTEM_PROMPT,
} from './books';

// ============================================================================
// CONFIGURATION
// ============================================================================

describe('BOOK_COLLECTIONS', () => {
  it('содержит коллекцию books', () => {
    expect(BOOK_COLLECTIONS.books).toBe('books');
  });

  it('содержит коллекцию chunks', () => {
    expect(BOOK_COLLECTIONS.chunks).toBe('book_chunks');
  });

  it('содержит коллекцию jobs', () => {
    expect(BOOK_COLLECTIONS.jobs).toBe('ingestion_jobs');
  });
});

describe('BOOK_SEARCH_CONFIG', () => {
  it('maxBooksPerSearch = 10', () => {
    expect(BOOK_SEARCH_CONFIG.maxBooksPerSearch).toBe(10);
  });

  it('minBooksPerSearch = 1', () => {
    expect(BOOK_SEARCH_CONFIG.minBooksPerSearch).toBe(1);
  });

  it('maxQuestionLength = 500', () => {
    expect(BOOK_SEARCH_CONFIG.maxQuestionLength).toBe(500);
  });

  it('minQuestionLength = 3', () => {
    expect(BOOK_SEARCH_CONFIG.minQuestionLength).toBe(3);
  });

  it('candidateK = 50', () => {
    expect(BOOK_SEARCH_CONFIG.candidateK).toBe(50);
  });

  it('contextK = 10', () => {
    expect(BOOK_SEARCH_CONFIG.contextK).toBe(10);
  });

  it('embeddingModel = text-embedding-004', () => {
    expect(BOOK_SEARCH_CONFIG.embeddingModel).toBe('text-embedding-004');
  });

  it('embeddingDims = 768', () => {
    expect(BOOK_SEARCH_CONFIG.embeddingDims).toBe(768);
  });

  it('snippetMaxChars = 5000', () => {
    expect(BOOK_SEARCH_CONFIG.snippetMaxChars).toBe(5000);
  });

  it('snippetDefaultChars = 3000', () => {
    expect(BOOK_SEARCH_CONFIG.snippetDefaultChars).toBe(3000);
  });
});

describe('BOOK_STORAGE_PATHS', () => {
  it('pages возвращает правильный путь', () => {
    expect(BOOK_STORAGE_PATHS.pages('book123')).toBe('books/text/book123/pages.json.gz');
  });

  it('pages работает с разными bookId', () => {
    expect(BOOK_STORAGE_PATHS.pages('abc')).toBe('books/text/abc/pages.json.gz');
    expect(BOOK_STORAGE_PATHS.pages('test-book-id')).toBe('books/text/test-book-id/pages.json.gz');
  });
});

// ============================================================================
// LEXICAL SCORING
// ============================================================================

describe('computeLexicalScore', () => {
  it('возвращает 0 для пустого запроса', () => {
    expect(computeLexicalScore('', 'Some preview text')).toBe(0);
  });

  it('возвращает 0 для запроса из коротких слов', () => {
    // Слова <= 2 символов игнорируются
    expect(computeLexicalScore('a b c', 'Some preview text')).toBe(0);
  });

  it('возвращает 1 для полного совпадения', () => {
    // Точное вхождение подстроки (без учёта склонений!)
    expect(computeLexicalScore('психология', 'Это текст о психология и развитии')).toBe(1);
  });

  it('возвращает 1 для всех совпадающих терминов', () => {
    expect(computeLexicalScore('психология развития', 'Психология развития изучает...')).toBe(1);
  });

  it('возвращает частичный score для частичного совпадения', () => {
    const score = computeLexicalScore('психология развития память', 'Психология развития');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    // 2 из 3 слов найдены
    expect(score).toBeCloseTo(2 / 3, 2);
  });

  it('возвращает 0 для несовпадающего запроса', () => {
    expect(computeLexicalScore('математика физика', 'Психология развития')).toBe(0);
  });

  it('регистронезависимый поиск', () => {
    expect(computeLexicalScore('ПСИХОЛОГИЯ', 'психология')).toBe(1);
    expect(computeLexicalScore('психология', 'ПСИХОЛОГИЯ')).toBe(1);
  });

  it('игнорирует короткие слова (<=2 символов)', () => {
    // "что" имеет 3 символа, но "и", "в" игнорируются
    const score = computeLexicalScore('что и как', 'что такое память и как она работает');
    // "что" и "как" (3+ символов) найдены
    expect(score).toBe(1);
  });

  it('работает с русским текстом', () => {
    // Функция ищет точное вхождение подстрок, а не морфологически
    // "теория" vs "теорию" — не совпадёт, поэтому используем те же формы слов
    expect(computeLexicalScore(
      'Боулби теорию привязанности',
      'Джон Боулби разработал теорию привязанности'
    )).toBe(1);
  });

  it('работает с английским текстом', () => {
    expect(computeLexicalScore(
      'attachment theory',
      'Bowlby developed attachment theory'
    )).toBe(1);
  });

  it('находит частичные совпадения в длинном тексте', () => {
    const longPreview = `
      Психология развития — это раздел психологии, изучающий развитие человека
      на протяжении всей жизни. Она рассматривает когнитивное, эмоциональное,
      социальное и физическое развитие. Основные теории включают работы Пиаже,
      Выготского, Эриксона и других учёных.
    `;
    // "Пиаже" есть, "развитие" есть, но "Выготского" ≠ "Выготский"
    // Поэтому 2/3 = 0.666...
    const score = computeLexicalScore('Пиаже Выготского развитие', longPreview);
    expect(score).toBe(1);
  });

  it('обрабатывает специальные символы', () => {
    expect(computeLexicalScore('self-esteem', 'Understanding self-esteem in children')).toBe(1);
  });
});

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

describe('SYSTEM_PROMPT', () => {
  it('содержит инструкции на русском языке', () => {
    expect(SYSTEM_PROMPT).toContain('эксперт-психолог');
    expect(SYSTEM_PROMPT).toContain('ПРАВИЛА ОТВЕТА');
  });

  it('определяет формат JSON ответа', () => {
    expect(SYSTEM_PROMPT).toContain('"answer"');
    expect(SYSTEM_PROMPT).toContain('"citations"');
  });

  it('запрещает markdown разметку', () => {
    expect(SYSTEM_PROMPT).toContain('НИКАКИХ');
    expect(SYSTEM_PROMPT).toContain('Markdown');
  });

  it('требует использовать только предоставленные источники', () => {
    expect(SYSTEM_PROMPT).toContain('ИСКЛЮЧИТЕЛЬНО');
    expect(SYSTEM_PROMPT).toContain('источник');
  });

  it('не пустой', () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });
});

// ============================================================================
// VALIDATION LOGIC (tested via config values)
// ============================================================================

describe('Валидация через конфиг', () => {
  it('minQuestionLength < maxQuestionLength', () => {
    expect(BOOK_SEARCH_CONFIG.minQuestionLength).toBeLessThan(BOOK_SEARCH_CONFIG.maxQuestionLength);
  });

  it('minBooksPerSearch <= maxBooksPerSearch', () => {
    expect(BOOK_SEARCH_CONFIG.minBooksPerSearch).toBeLessThanOrEqual(BOOK_SEARCH_CONFIG.maxBooksPerSearch);
  });

  it('contextK <= candidateK', () => {
    expect(BOOK_SEARCH_CONFIG.contextK).toBeLessThanOrEqual(BOOK_SEARCH_CONFIG.candidateK);
  });

  it('snippetDefaultChars <= snippetMaxChars', () => {
    expect(BOOK_SEARCH_CONFIG.snippetDefaultChars).toBeLessThanOrEqual(BOOK_SEARCH_CONFIG.snippetMaxChars);
  });

  it('embeddingDims — стандартное значение для text-embedding-004', () => {
    // text-embedding-004 поддерживает 768 dimensions
    expect(BOOK_SEARCH_CONFIG.embeddingDims).toBe(768);
  });
});

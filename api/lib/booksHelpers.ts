// Конфиги, константы и retrieval-helpers для /api/books.

import { GoogleGenAI } from '@google/genai';

export const BOOK_COLLECTIONS = {
  books: 'books',
  chunks: 'book_chunks',
  jobs: 'ingestion_jobs',
} as const;

export const BOOK_SEARCH_CONFIG = {
  maxBooksPerSearch: 10,
  minBooksPerSearch: 1,
  maxQuestionLength: 500,
  minQuestionLength: 3,
  candidateK: 50,
  contextK: 10,
  embeddingModel: 'gemini-embedding-001',
  embeddingDims: 768,
  answerMaxParagraphs: 4,
  snippetMaxChars: 5000,
  snippetDefaultChars: 3000,
} as const;

export const BOOK_STORAGE_PATHS = {
  pages: (bookId: string) => `books/text/${bookId}/pages.json.gz`,
} as const;

// Rate limits per IP (in-memory baseline; per-instance на serverless — см. LP-3).
export const RL_PUBLIC = { windowMs: 60_000, max: 60 } as const; // list/snippet
export const RL_AI = { windowMs: 60_000, max: 20 } as const; // search/answer

/**
 * Создаёт клиента GenAI с переданным API ключом. Singleton намеренно убран:
 * каждый search/answer запрос идёт под BYOK ключ конкретного пользователя
 * (HR-1 / wave 6, 2026-04). Прод-ключ из env больше НЕ используется в этом
 * endpoint — он остаётся только для server-side admin-функций.
 */
export function buildGenAI(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export async function embedQuery(query: string, apiKey: string): Promise<number[]> {
  const client = buildGenAI(apiKey);
  const result = await client.models.embedContent({
    model: BOOK_SEARCH_CONFIG.embeddingModel,
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: { outputDimensionality: BOOK_SEARCH_CONFIG.embeddingDims },
  });
  const embedding = result.embeddings?.[0]?.values;
  if (!embedding) throw new Error('Failed to get embedding');
  return embedding;
}

export interface AdjacentChunk {
  id: string;
  pageStart: number;
  pageEnd: number;
  preview: string;
  text: string;
}

/** Возвращает соседние chunks (предыдущий/следующий по страницам) для context. */
export async function getAdjacentChunks(
  db: FirebaseFirestore.Firestore,
  bookId: string,
  currentPageStart: number,
): Promise<{ prev: AdjacentChunk | null; next: AdjacentChunk | null }> {
  const prevQuery = db
    .collection(BOOK_COLLECTIONS.chunks)
    .where('bookId', '==', bookId)
    .where('pageEnd', '<', currentPageStart)
    .orderBy('pageEnd', 'desc')
    .limit(1);

  const nextQuery = db
    .collection(BOOK_COLLECTIONS.chunks)
    .where('bookId', '==', bookId)
    .where('pageStart', '>', currentPageStart)
    .orderBy('pageStart', 'asc')
    .limit(1);

  const [prevSnap, nextSnap] = await Promise.all([prevQuery.get(), nextQuery.get()]);

  const prev = prevSnap.docs[0]
    ? {
        id: prevSnap.docs[0].id,
        pageStart: prevSnap.docs[0].data().pageStart || 1,
        pageEnd: prevSnap.docs[0].data().pageEnd || 1,
        preview: prevSnap.docs[0].data().preview || '',
        text: prevSnap.docs[0].data().text || '',
      }
    : null;

  const next = nextSnap.docs[0]
    ? {
        id: nextSnap.docs[0].id,
        pageStart: nextSnap.docs[0].data().pageStart || 1,
        pageEnd: nextSnap.docs[0].data().pageEnd || 1,
        preview: nextSnap.docs[0].data().preview || '',
        text: nextSnap.docs[0].data().text || '',
      }
    : null;

  return { prev, next };
}

/**
 * Простой lexical scoring: какая доля query-терминов (длиной >2) встречается
 * в preview. Возвращает 0..1. Для combine score с vector results.
 */
export function computeLexicalScore(query: string, preview: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const previewLower = preview.toLowerCase();
  let matches = 0;
  for (const term of queryTerms) {
    if (previewLower.includes(term)) matches++;
  }
  return queryTerms.length > 0 ? matches / queryTerms.length : 0;
}

export const SYSTEM_PROMPT = `Ты — эксперт-психолог и преподаватель. Твоя задача — дать развёрнутый, информативный ответ на вопрос студента, основываясь ИСКЛЮЧИТЕЛЬНО на предоставленных источниках.

ПРАВИЛА ОТВЕТА:
1. Пиши развёрнуто — от 3 до 6 абзацев. Раскрой тему полноценно.
2. Используй только информацию из предоставленных источников.
3. Пиши ЧИСТЫМ ТЕКСТОМ для чтения человеком. НИКАКИХ:
   - Ссылок на источники в тексте ответа (НЕ пиши [chunkId=...], [SOURCE], [1], (источник) и т.п.)
   - Технических символов (**, *, #, \`, [], {}, <>)
   - Маркеров списка (-, •, 1., 2.)
   - Markdown-разметки
4. Структурируй ответ абзацами. Каждый абзац — отдельный аспект темы.
5. Ссылки на источники указывай ТОЛЬКО в массиве citations, НЕ в тексте ответа.
6. Если информации недостаточно — честно укажи это.
7. Отвечай на русском языке.

ФОРМАТ ОТВЕТА (строго JSON):
{
  "answer": "Чистый текст ответа БЕЗ каких-либо ссылок и технических символов. Только абзацы с пробелами между ними.",
  "citations": [
    {"chunkId": "abc123", "claim": "К какому утверждению в ответе относится этот источник"}
  ]
}

КРИТИЧЕСКИ ВАЖНО:
- В поле "answer" должен быть ТОЛЬКО читаемый текст
- НЕ вставляй chunkId, номера источников или любые ссылки в текст ответа
- Все ссылки на источники — ТОЛЬКО в массиве citations
- Верни ТОЛЬКО валидный JSON без markdown-блоков`;

/**
 * Чистит ответ Gemini от служебных меток (chunkId references, SOURCE-теги,
 * markdown-форматирование, маркеры списков). Используется в action=answer.
 */
export function cleanupAnswerText(raw: string): string {
  return raw
    .replace(/\[chunkId[=:][^\]]+\]/gi, '')
    .replace(/\(chunkId[=:][^\)]+\)/gi, '')
    .replace(/\[SOURCE[^\]]*\]/gi, '')
    .replace(/\[\/SOURCE\]/gi, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\(\d+\)/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/`/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();
}

/**
 * Gemini Embeddings - получение эмбеддингов через Gemini API
 */
import { GoogleGenAI } from '@google/genai';
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMS = 768;
const BATCH_SIZE = 32;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
let genaiClient = null;
/**
 * Инициализация клиента Gemini
 */
function getClient() {
    if (!genaiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }
        genaiClient = new GoogleGenAI({ apiKey });
    }
    return genaiClient;
}
/**
 * Получить эмбеддинг для одного текста
 */
export async function getEmbedding(text) {
    const client = getClient();
    const result = await client.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
            outputDimensionality: EMBEDDING_DIMS,
        },
    });
    const embedding = result.embeddings?.[0]?.values;
    if (!embedding || embedding.length !== EMBEDDING_DIMS) {
        throw new Error('Invalid embedding response');
    }
    return embedding;
}
/**
 * Получить эмбеддинги для массива текстов (батчами)
 */
export async function getEmbeddingsBatch(texts, onProgress) {
    const results = [];
    const total = texts.length;
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const batchEmbeddings = await processBatchWithRetry(batch);
        results.push(...batchEmbeddings);
        if (onProgress) {
            onProgress(Math.min(i + BATCH_SIZE, total), total);
        }
    }
    return results;
}
/**
 * Обработка батча с retry логикой
 */
async function processBatchWithRetry(texts) {
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            return await processBatch(texts);
        }
        catch (error) {
            lastError = error;
            // Check if it's a rate limit error
            const isRateLimit = error instanceof Error &&
                (error.message.includes('429') ||
                    error.message.includes('RESOURCE_EXHAUSTED') ||
                    error.message.includes('rate limit'));
            if (isRateLimit) {
                // Exponential backoff for rate limits
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
                await sleep(delay);
            }
            else if (attempt < MAX_RETRIES - 1) {
                // Short delay for other errors
                await sleep(RETRY_DELAY_MS);
            }
        }
    }
    throw lastError || new Error('Failed to get embeddings after retries');
}
/**
 * Обработка одного батча
 */
async function processBatch(texts) {
    const client = getClient();
    const results = [];
    // Gemini API обрабатывает тексты по одному, но мы можем делать параллельные запросы
    // Ограничиваем параллелизм чтобы не превысить rate limit
    const PARALLEL_LIMIT = 5;
    for (let i = 0; i < texts.length; i += PARALLEL_LIMIT) {
        const chunk = texts.slice(i, i + PARALLEL_LIMIT);
        const embeddings = await Promise.all(chunk.map(async (text) => {
            const result = await client.models.embedContent({
                model: EMBEDDING_MODEL,
                contents: [{ role: 'user', parts: [{ text: truncateText(text) }] }],
                config: {
                    outputDimensionality: EMBEDDING_DIMS,
                },
            });
            const embedding = result.embeddings?.[0]?.values;
            if (!embedding) {
                throw new Error('No embedding in response');
            }
            return embedding;
        }));
        results.push(...embeddings);
    }
    return results;
}
/**
 * Обрезает текст если он слишком длинный для эмбеддинга
 * Gemini text-embedding-004 поддерживает до 2048 токенов
 * Примерно 1 токен = 4 символа для русского
 */
function truncateText(text, maxChars = 8000) {
    if (text.length <= maxChars) {
        return text;
    }
    return text.slice(0, maxChars);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export { EMBEDDING_DIMS };

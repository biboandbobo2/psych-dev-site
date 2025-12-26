/**
 * Chunker - разбиение текста на чанки для RAG
 *
 * Использует sentence-based chunking для лучших семантических границ.
 * Группирует предложения в чанки, обеспечивая overlap на уровне предложений.
 */
import * as crypto from 'crypto';
import { debugLog } from './debug.js';
export const DEFAULT_CHUNK_CONFIG = {
    // Sentence-based (primary)
    minSentences: 5,
    maxSentences: 15,
    overlapSentences: 2,
    // Character-based (fallback/limits)
    minChars: 1500,
    maxChars: 2500,
    previewChars: 400,
};
// Legacy config for backwards compatibility
export const LEGACY_CHUNK_CONFIG = {
    minSentences: 5,
    maxSentences: 15,
    overlapSentences: 2,
    minChars: 1500,
    maxChars: 2500,
    overlap: 200,
    previewChars: 400,
};
/**
 * Разбивает текст на предложения
 * Поддерживает русский и английский языки
 */
function splitIntoSentences(text, pageNumber) {
    const sentences = [];
    // Regex для разбиения на предложения
    // Учитывает: . ! ? и их комбинации с кавычками, скобками
    // Не разбивает: сокращения (г., т.д., т.п., Dr., Mr., etc.), инициалы (Л.С.)
    const sentencePattern = /[^.!?]*(?:[.!?](?:\s|$|["»"\)\]]))/g;
    let match;
    let lastEnd = 0;
    while ((match = sentencePattern.exec(text)) !== null) {
        const sentenceText = match[0].trim();
        if (sentenceText.length > 0) {
            sentences.push({
                text: sentenceText,
                pageNumber,
                startOffset: match.index,
                endOffset: match.index + match[0].length,
            });
            lastEnd = match.index + match[0].length;
        }
    }
    // Добавляем остаток текста если есть (текст без точки в конце)
    const remainder = text.slice(lastEnd).trim();
    if (remainder.length > 0) {
        sentences.push({
            text: remainder,
            pageNumber,
            startOffset: lastEnd,
            endOffset: text.length,
        });
    }
    return sentences;
}
/**
 * Разбивает текст книги на чанки используя sentence-based подход
 */
export function chunkPages(pages, config = DEFAULT_CHUNK_CONFIG) {
    const chunks = [];
    // Собираем все предложения со всех страниц
    const allSentences = [];
    for (const page of pages) {
        if (page.text.trim().length > 0) {
            const sentences = splitIntoSentences(page.text, page.page);
            allSentences.push(...sentences);
        }
    }
    if (allSentences.length === 0) {
        debugLog('[chunker] No sentences found - all pages empty');
        return [];
    }
    debugLog(`[chunker] Found ${allSentences.length} sentences across ${pages.length} pages`);
    debugLog(`[chunker] Config: minSentences=${config.minSentences}, maxSentences=${config.maxSentences}, overlapSentences=${config.overlapSentences}`);
    let chunkIndex = 0;
    let sentenceIndex = 0;
    while (sentenceIndex < allSentences.length) {
        // Собираем предложения для текущего чанка
        const chunkSentences = [];
        let chunkChars = 0;
        let startIdx = sentenceIndex;
        // Добавляем предложения пока не достигнем лимитов
        while (sentenceIndex < allSentences.length &&
            (
            // Продолжаем если:
            // 1. Ещё не набрали минимум предложений
            chunkSentences.length < config.minSentences ||
                // 2. Или не набрали минимум символов и не превысили максимум предложений
                (chunkChars < config.minChars && chunkSentences.length < config.maxSentences)) &&
            // Но не превышаем максимум символов
            chunkChars + allSentences[sentenceIndex].text.length <= config.maxChars) {
            const sentence = allSentences[sentenceIndex];
            chunkSentences.push(sentence);
            chunkChars += sentence.text.length + 1; // +1 for space
            sentenceIndex++;
        }
        // Если чанк пустой (очень длинное предложение), берём хотя бы одно
        if (chunkSentences.length === 0 && sentenceIndex < allSentences.length) {
            chunkSentences.push(allSentences[sentenceIndex]);
            sentenceIndex++;
        }
        if (chunkSentences.length === 0)
            break;
        // Собираем текст чанка
        const chunkText = chunkSentences.map(s => s.text).join(' ');
        // Определяем диапазон страниц
        const pageStart = chunkSentences[0].pageNumber;
        const pageEnd = chunkSentences[chunkSentences.length - 1].pageNumber;
        // Создаём preview
        const preview = createPreview(chunkText, config.previewChars);
        // Hash для дедупликации
        const textHash = crypto.createHash('sha1').update(chunkText).digest('hex');
        chunks.push({
            index: chunkIndex++,
            pageStart,
            pageEnd,
            text: chunkText,
            preview,
            textHash,
            sentenceCount: chunkSentences.length,
        });
        debugLog(`[chunker] Chunk ${chunkIndex}: ${chunkSentences.length} sentences, ` +
            `${chunkText.length} chars, pages ${pageStart}-${pageEnd}`);
        // Overlap: возвращаемся на N предложений назад
        if (sentenceIndex < allSentences.length && config.overlapSentences > 0) {
            const overlapBack = Math.min(config.overlapSentences, chunkSentences.length - 1);
            sentenceIndex = sentenceIndex - overlapBack;
            // Защита от бесконечного цикла
            if (sentenceIndex <= startIdx) {
                sentenceIndex = startIdx + 1;
            }
        }
    }
    debugLog(`[chunker] Created ${chunks.length} chunks from ${allSentences.length} sentences`);
    return chunks;
}
/**
 * Создаёт preview для UI
 */
function createPreview(text, maxChars) {
    if (text.length <= maxChars) {
        return text;
    }
    // Ищем конец предложения в пределах maxChars
    const truncated = text.slice(0, maxChars);
    // Ищем последнее завершённое предложение
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '.»', '!»', '?»'];
    let lastEnd = -1;
    for (const ender of sentenceEnders) {
        const pos = truncated.lastIndexOf(ender);
        if (pos > lastEnd && pos > maxChars * 0.6) {
            lastEnd = pos + 1;
        }
    }
    if (lastEnd > 0) {
        return text.slice(0, lastEnd).trim();
    }
    // Иначе обрезаем по слову
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxChars * 0.7) {
        return truncated.slice(0, lastSpace).trim() + '…';
    }
    return truncated.trim() + '…';
}
/**
 * Дедупликация чанков по hash
 */
export function deduplicateChunks(newChunks, existingHashes) {
    return newChunks.filter((chunk) => !existingHashes.has(chunk.textHash));
}

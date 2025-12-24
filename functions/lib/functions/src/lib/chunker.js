/**
 * Chunker - разбиение текста на чанки для RAG
 */
import * as crypto from 'crypto';
import { debugLog } from './debug.js';
export const DEFAULT_CHUNK_CONFIG = {
    minChars: 1500,
    maxChars: 2500,
    overlap: 200,
    previewChars: 400,
};
/**
 * Разбивает текст книги на чанки
 */
export function chunkPages(pages, config = DEFAULT_CHUNK_CONFIG) {
    const chunks = [];
    let chunkIndex = 0;
    const segments = [];
    let totalOffset = 0;
    for (const page of pages) {
        if (page.text.trim().length > 0) {
            segments.push({
                page: page.page,
                text: page.text,
                offset: totalOffset,
            });
            totalOffset += page.text.length + 1; // +1 for separator
        }
    }
    if (segments.length === 0) {
        debugLog('[chunker] No segments with text - all pages empty');
        return [];
    }
    // Полный текст
    const fullText = segments.map((s) => s.text).join('\n');
    debugLog(`[chunker] Segments: ${segments.length}, fullText length: ${fullText.length}`);
    debugLog(`[chunker] Config: minChars=${config.minChars}, maxChars=${config.maxChars}, overlap=${config.overlap}`);
    // Разбиваем на чанки
    let position = 0;
    while (position < fullText.length) {
        // Определяем конец чанка
        let endPosition = Math.min(position + config.maxChars, fullText.length);
        // Если не конец текста, ищем хорошее место для разрыва
        if (endPosition < fullText.length) {
            // Ищем конец абзаца (двойной перенос)
            const paragraphEnd = fullText.lastIndexOf('\n\n', endPosition);
            if (paragraphEnd > position + config.minChars) {
                endPosition = paragraphEnd;
            }
            else {
                // Ищем конец предложения
                const sentenceEnd = findSentenceEnd(fullText, position + config.minChars, endPosition);
                if (sentenceEnd > position + config.minChars) {
                    endPosition = sentenceEnd;
                }
            }
        }
        // Извлекаем текст чанка
        const chunkText = fullText.slice(position, endPosition).trim();
        // Создаем чанк если:
        // 1. Он достаточно большой (>= minChars / 2)
        // 2. Или это последний чанк и в книге вообще нет чанков (книга с малым количеством текста)
        const isLastChunk = endPosition >= fullText.length;
        const shouldCreateChunk = chunkText.length >= config.minChars / 2 ||
            (isLastChunk && chunks.length === 0 && chunkText.length > 0);
        debugLog(`[chunker] pos=${position}, end=${endPosition}, chunkLen=${chunkText.length}, ` +
            `isLast=${isLastChunk}, shouldCreate=${shouldCreateChunk}, chunksCount=${chunks.length}`);
        if (shouldCreateChunk) {
            // Определяем страницы
            const pageRange = findPageRange(segments, position, endPosition);
            // Создаём preview
            const preview = createPreview(chunkText, config.previewChars);
            // Hash для дедупликации
            const textHash = crypto.createHash('sha1').update(chunkText).digest('hex');
            chunks.push({
                index: chunkIndex++,
                pageStart: pageRange.start,
                pageEnd: pageRange.end,
                text: chunkText,
                preview,
                textHash,
            });
        }
        // Следующая позиция с overlap
        const prevPosition = position;
        position = endPosition - config.overlap;
        // Избегаем бесконечного цикла: если позиция не продвинулась вперёд, двигаемся на 1 символ
        if (position <= prevPosition) {
            position = endPosition;
        }
    }
    debugLog(`[chunker] Created ${chunks.length} chunks from ${fullText.length} chars`);
    return chunks;
}
/**
 * Находит конец предложения в диапазоне
 */
function findSentenceEnd(text, minPos, maxPos) {
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let lastEnd = -1;
    for (const ender of sentenceEnders) {
        let pos = text.indexOf(ender, minPos);
        while (pos !== -1 && pos < maxPos) {
            if (pos > lastEnd) {
                lastEnd = pos + 1; // Include the punctuation
            }
            pos = text.indexOf(ender, pos + 1);
        }
    }
    return lastEnd;
}
/**
 * Находит диапазон страниц для позиции в тексте
 */
function findPageRange(segments, startPos, endPos) {
    let startPage = segments[0]?.page ?? 1;
    let endPage = segments[segments.length - 1]?.page ?? 1;
    let currentOffset = 0;
    for (const segment of segments) {
        const segmentEnd = currentOffset + segment.text.length;
        if (currentOffset <= startPos && startPos < segmentEnd) {
            startPage = segment.page;
        }
        if (currentOffset <= endPos && endPos <= segmentEnd) {
            endPage = segment.page;
            break;
        }
        currentOffset = segmentEnd + 1;
    }
    return { start: startPage, end: endPage };
}
/**
 * Создаёт preview для UI
 */
function createPreview(text, maxChars) {
    if (text.length <= maxChars) {
        return text;
    }
    // Ищем конец предложения
    const sentenceEnd = findSentenceEnd(text, maxChars * 0.7, maxChars);
    if (sentenceEnd > 0) {
        return text.slice(0, sentenceEnd).trim();
    }
    // Иначе обрезаем по слову
    const truncated = text.slice(0, maxChars);
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

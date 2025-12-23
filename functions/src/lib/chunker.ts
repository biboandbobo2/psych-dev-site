/**
 * Chunker - разбиение текста на чанки для RAG
 */

import * as crypto from 'crypto';

export interface ChunkConfig {
  minChars: number;
  maxChars: number;
  overlap: number;
  previewChars: number;
}

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  minChars: 1500,
  maxChars: 2500,
  overlap: 200,
  previewChars: 400,
};

export interface TextChunk {
  index: number;
  pageStart: number;
  pageEnd: number;
  text: string;
  preview: string;
  textHash: string;
}

interface PageText {
  page: number;
  text: string;
}

/**
 * Разбивает текст книги на чанки
 */
export function chunkPages(
  pages: PageText[],
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  // Объединяем весь текст с маркерами страниц
  interface TextSegment {
    page: number;
    text: string;
    offset: number;
  }

  const segments: TextSegment[] = [];
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
    return [];
  }

  // Полный текст
  const fullText = segments.map((s) => s.text).join('\n');

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
      } else {
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
    const shouldCreateChunk =
      chunkText.length >= config.minChars / 2 ||
      (isLastChunk && chunks.length === 0 && chunkText.length > 0);

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
    position = endPosition - config.overlap;
    const lastIndex = chunks.length > 0 ? chunks[chunks.length - 1].index : -1;
    if (position <= lastIndex) {
      position = endPosition; // Избегаем бесконечного цикла
    }
  }

  return chunks;
}

/**
 * Находит конец предложения в диапазоне
 */
function findSentenceEnd(text: string, minPos: number, maxPos: number): number {
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
function findPageRange(
  segments: { page: number; text: string; offset: number }[],
  startPos: number,
  endPos: number
): { start: number; end: number } {
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
function createPreview(text: string, maxChars: number): string {
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
export function deduplicateChunks(
  newChunks: TextChunk[],
  existingHashes: Set<string>
): TextChunk[] {
  return newChunks.filter((chunk) => !existingHashes.has(chunk.textHash));
}

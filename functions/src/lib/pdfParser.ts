/**
 * PDF Parser - извлечение текста из PDF
 * Использует unpdf для извлечения текста постранично (serverless-friendly)
 */

import { extractText, getMeta } from 'unpdf';
import { debugLog } from './debug.js';

export interface PageText {
  page: number;
  text: string;
}

export interface ParsedPdf {
  pages: PageText[];
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
  };
}

/**
 * Извлекает текст из PDF буфера постранично
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  // Extract text using unpdf (serverless-friendly)
  const result = await extractText(buffer, { mergePages: false });

  // unpdf returns { totalPages, text: string[] }
  const rawPages = result.text;
  const rawTotalChars = rawPages.reduce((sum: number, p: string) => sum + p.length, 0);
  const rawPagesWithText = rawPages.filter((p: string) => p.trim().length > 0).length;
  debugLog(`[pdfParser] RAW - Pages: ${rawPages.length}, with text: ${rawPagesWithText}, total chars: ${rawTotalChars}`);

  // Sample first page with text
  const firstPageIdx = rawPages.findIndex((p: string) => p.trim().length > 0);
  if (firstPageIdx >= 0) {
    debugLog(`[pdfParser] Sample page ${firstPageIdx + 1}: "${rawPages[firstPageIdx].slice(0, 200)}..."`);
  }

  // Convert to PageText format
  const pages: PageText[] = rawPages.map((text: string, index: number) => ({
    page: index + 1,
    text: normalizeText(text),
  }));

  // Debug logging after normalization
  const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
  const pagesWithText = pages.filter(p => p.text.trim().length > 0).length;
  debugLog(`[pdfParser] NORMALIZED - Pages: ${pages.length}, with text: ${pagesWithText}, total chars: ${totalChars}`);

  // Get metadata separately
  let metadata = { title: undefined, author: undefined, creator: undefined };
  try {
    const meta = await getMeta(buffer);
    metadata = {
      title: meta.info?.Title,
      author: meta.info?.Author,
      creator: meta.info?.Creator,
    };
  } catch (e) {
    debugLog('[pdfParser] Failed to get metadata:', e);
  }

  return {
    pages,
    totalPages: result.totalPages,
    metadata,
  };
}

/**
 * Нормализация текста:
 * - Удаление лишних пробелов
 * - Склеивание переносов
 * - Удаление управляющих символов
 */
function normalizeText(text: string): string {
  return (
    text
      // Удаляем управляющие символы кроме переносов
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Склеиваем переносы (дефис + перенос строки)
      .replace(/-\n/g, '')
      // Нормализуем пробелы
      .replace(/[ \t]+/g, ' ')
      // Нормализуем переносы строк
      .replace(/\n{3,}/g, '\n\n')
      // Trim
      .trim()
  );
}

/**
 * Проверяет, похож ли текст на скан (мало текста)
 */
export function isProbablyScan(pages: PageText[]): boolean {
  if (pages.length === 0) return true;

  const avgCharsPerPage =
    pages.reduce((sum, p) => sum + p.text.length, 0) / pages.length;

  // Если меньше 100 символов на страницу в среднем - вероятно скан
  return avgCharsPerPage < 100;
}

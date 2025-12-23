/**
 * PDF Parser - извлечение текста из PDF
 * Использует pdf-parse v2 для извлечения текста постранично
 */

import { PDFParse } from 'pdf-parse';
import type { TextResult } from 'pdf-parse';

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
  // Create parser instance with buffer data
  const parser = new PDFParse({ data: buffer });

  try {
    // Get text result with page-by-page data
    const textResult = await parser.getText();

    // Get document info for metadata
    const infoResult = await parser.getInfo();

    // Extract pages
    const pages: PageText[] = textResult.pages.map((page) => ({
      page: page.num,
      text: normalizeText(page.text),
    }));

    return {
      pages,
      totalPages: textResult.total,
      metadata: {
        title: infoResult.info?.Title,
        author: infoResult.info?.Author,
        creator: infoResult.info?.Creator,
      },
    };
  } finally {
    // Clean up resources
    await parser.destroy();
  }
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

/**
 * PDF Parser - извлечение текста из PDF
 * Использует pdf-parse для извлечения текста постранично
 */

import { createRequire } from 'module';

// pdf-parse не поддерживает ESM, используем createRequire
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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
  const pages: PageText[] = [];
  let currentPage = 0;
  let currentText = '';

  // Custom page render function to get text per page
  const renderPage = (pageData: any) => {
    return pageData.getTextContent().then((textContent: any) => {
      let lastY: number | null = null;
      let text = '';

      for (const item of textContent.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          text += '\n';
        }
        text += item.str;
        lastY = item.transform[5];
      }

      return text;
    });
  };

  const options = {
    pagerender: renderPage,
  };

  // Parse PDF
  const data = await pdfParse(buffer, options);

  // pdf-parse returns all text concatenated, but we can use numpages
  // For better page-by-page extraction, we use a different approach
  const totalPages = data.numpages;

  // Split text by form feeds (page breaks) if present
  const rawText = data.text || '';

  // Simple heuristic: split by double newlines and distribute across pages
  // This is a simplified approach - for production, consider using pdf.js directly
  const paragraphs = rawText.split(/\n{3,}/);
  const avgParagraphsPerPage = Math.ceil(paragraphs.length / totalPages);

  for (let i = 0; i < totalPages; i++) {
    const start = i * avgParagraphsPerPage;
    const end = Math.min(start + avgParagraphsPerPage, paragraphs.length);
    const pageText = paragraphs.slice(start, end).join('\n\n');

    pages.push({
      page: i + 1,
      text: normalizeText(pageText),
    });
  }

  return {
    pages,
    totalPages,
    metadata: {
      title: data.info?.Title,
      author: data.info?.Author,
      creator: data.info?.Creator,
    },
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

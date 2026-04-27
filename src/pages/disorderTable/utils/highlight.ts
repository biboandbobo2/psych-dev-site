import type { ReactNode } from 'react';
import { Fragment, createElement } from 'react';

/** Сравнивает два массива id-строк по содержимому без учёта порядка. */
export function areSameSelections(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value) => b.includes(value));
}

/** Экранирует строку для использования внутри RegExp. */
export function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Возвращает превью текста длиной до maxLength. Если найден query, окно
 * центрируется вокруг совпадения с небольшим шагом назад (~35% длины),
 * чтобы совпадение было видно. Без query — head-of-text.
 */
export function buildPreviewText(text: string, query: string, maxLength = 120): string {
  const normalizedText = text.trim();
  if (!normalizedText) return '';
  const wasShortened = normalizedText.length > maxLength;
  if (!wasShortened) return normalizedText;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return `${normalizedText.slice(0, maxLength).trimEnd()}...`;
  }

  const matchIndex = normalizedText.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return `${normalizedText.slice(0, maxLength).trimEnd()}...`;
  }

  const headShare = Math.floor(maxLength * 0.35);
  let start = Math.max(0, matchIndex - headShare);
  let end = start + maxLength;
  if (end > normalizedText.length) {
    end = normalizedText.length;
    start = Math.max(0, end - maxLength);
  }

  let snippet = normalizedText.slice(start, end).trim();
  if (start > 0) snippet = `...${snippet}`;
  if (end < normalizedText.length) snippet = `${snippet}...`;
  if (wasShortened && !snippet.endsWith('...')) snippet = `${snippet}...`;
  return snippet;
}

/**
 * Подсвечивает совпадения query в тексте через `<mark>`. Возвращает массив
 * React-нод, безопасно генерируемый split(regex).
 */
export function renderHighlightedText(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const regex = new RegExp(`(${escapeForRegExp(normalizedQuery)})`, 'ig');
  const parts = text.split(regex);
  return createElement(
    Fragment,
    null,
    ...parts.map((part, index) =>
      part.toLowerCase() === normalizedQuery.toLowerCase()
        ? createElement(
            'mark',
            {
              key: `${part}-${index}`,
              className: 'rounded bg-yellow-200 px-0.5 text-slate-900',
            },
            part,
          )
        : createElement('span', { key: `${part}-${index}` }, part),
    ),
  );
}

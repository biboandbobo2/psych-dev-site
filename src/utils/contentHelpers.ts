const trimText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const normalizeText = trimText;

export function shouldShowPlaceholder(placeholder?: string | null): boolean {
  return trimText(placeholder).length > 0;
}

export function hasContent(content?: string | null): boolean {
  return trimText(content).length > 0;
}

export function prepareForSave<T extends Record<string, unknown>>(data: T): T {
  const cleaned: Record<string, unknown> = { ...data };

  Object.keys(cleaned).forEach((key) => {
    const value = cleaned[key];

    if (typeof value === 'string') {
      const trimmed = value.trim();
      cleaned[key] = trimmed.length > 0 ? trimmed : null;
    }
  });

  return cleaned as T;
}

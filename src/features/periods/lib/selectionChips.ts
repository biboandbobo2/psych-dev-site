// Подбор коротких поисковых фраз для выделенного фрагмента транскрипта:
// короткое выделение ищется как есть, для длинного предлагаются чипы
// из понятий урока (детерминированно, без AI).

const MAX_CHIPS = 3;
const SHORT_SELECTION_MAX_WORDS = 5;
const SHORT_SELECTION_MAX_CHARS = 80;
const FALLBACK_QUERY_WORDS = 8;

export function isShortSelection(text: string): boolean {
  return (
    text.length <= SHORT_SELECTION_MAX_CHARS &&
    text.split(/\s+/).filter(Boolean).length <= SHORT_SELECTION_MAX_WORDS
  );
}

/** «Привязанность — эмоциональная связь…» → «Привязанность» */
export function conceptLabel(raw: string): string {
  return raw.split(/[—:(]/)[0]?.trim() ?? '';
}

/** Грубое покрытие падежей: сравниваем по усечённой основе слова */
function stem(word: string): string {
  const lower = word.toLowerCase();
  return lower.length > 5 ? lower.slice(0, -2) : lower;
}

/**
 * Понятия урока, которые встречаются в выделении (по стему первого слова
 * названия понятия). Возвращает названия для поисковых чипов, максимум 3.
 */
export function extractConceptChips(selection: string, concepts: string[]): string[] {
  const selectionWords = selection
    .toLowerCase()
    .split(/[^a-zа-яё-]+/i)
    .filter(Boolean);
  if (selectionWords.length === 0) return [];

  const chips: string[] = [];
  for (const concept of concepts) {
    const label = conceptLabel(concept);
    if (label.length < 3) continue;
    const firstWord = label.split(/\s+/)[0];
    const labelStem = stem(firstWord);
    if (selectionWords.some((word) => word.startsWith(labelStem))) {
      chips.push(label);
      if (chips.length >= MAX_CHIPS) break;
    }
  }
  return chips;
}

/** Обрезанный запрос для длинного выделения без совпавших понятий */
export function truncatedQuery(selection: string): string {
  return selection.split(/\s+/).filter(Boolean).slice(0, FALLBACK_QUERY_WORDS).join(' ');
}

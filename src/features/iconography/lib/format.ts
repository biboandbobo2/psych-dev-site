const rules = new Intl.PluralRules('ru');

/** Русское склонение по числу: 1 вопрос, 2 вопроса, 5 вопросов. */
export function plural(count: number, one: string, few: string, many: string): string {
  const form = rules.select(count);
  return form === 'one' ? one : form === 'few' ? few : many;
}

/** Число вместе со склонённым словом: «32 вопроса». */
export const counted = (count: number, one: string, few: string, many: string) =>
  `${count} ${plural(count, one, few, many)}`;

/**
 * Значение записи источника без служебного хвоста Wikidata:
 * «9th centurydate QS:P571,+850-00-00T00:00:00Z/7, renewed…» → «9th century, renewed…».
 */
export function cleanSourceValue(value: string | undefined): string {
  return (value ?? '')
    .replace(/\s*date\s+QS:\S*?(?=,\s|\s|$)/gi, '')
    .replace(/QS:[\s\S]*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;]+|[\s,;]+$/g, '');
}

/** Английские заглушки музейных API: строка без сведений в паспорт не идёт. */
const emptySourceValue = /^(not specified|unspecified|unknown|undetermined|n\/a|none)$/i;

export const hasSourceValue = (value: string | undefined) => {
  const text = cleanSourceValue(value);
  return Boolean(text) && !emptySourceValue.test(text);
};

/** utm-метки Commons в адресе исходника ничего не сообщают читателю. */
export function withoutTracking(url: string): string {
  try {
    const address = new URL(url);
    for (const key of [...address.searchParams.keys()]) if (key.startsWith('utm_')) address.searchParams.delete(key);
    return address.toString();
  } catch {
    return url;
  }
}

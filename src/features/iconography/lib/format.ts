const rules = new Intl.PluralRules('ru');

/** Русское склонение по числу: 1 вопрос, 2 вопроса, 5 вопросов. */
export function plural(count: number, one: string, few: string, many: string): string {
  const form = rules.select(count);
  return form === 'one' ? one : form === 'few' ? few : many;
}

/** Число вместе со склонённым словом: «32 вопроса». */
export const counted = (count: number, one: string, few: string, many: string) =>
  `${count} ${plural(count, one, few, many)}`;

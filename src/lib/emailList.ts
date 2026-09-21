/**
 * Разбор списка email, введённого руками: разделителями считаются запятая,
 * точка с запятой, перенос строки и пробел. Нормализует к lower-case и убирает
 * дубли. Серверный аналог — `normalizeEmailList` в `functions/src/lib/shared.ts`
 * (клиенту код функций недоступен, поэтому проверка формата продублирована).
 */
export function splitEmails(value: string): string[] {
  const dedupe = new Set<string>();
  value
    .split(/[\n,;\s]+/g)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => dedupe.add(email));
  return Array.from(dedupe);
}

/** Тот же предикат, что и `isValidEmail` на сервере. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

import { useEffect, useState } from 'react';
import type { IconRecord, IconSummary, IconSchool } from '../types';

// Metadata and images can move together to an object store without changing routes.
const configuredBase = import.meta.env.VITE_ICONOGRAPHY_ASSET_BASE as string | undefined;
export const assetBase = (configuredBase || '/iconography').replace(/\/$/, '');
export const imageUrl = (id: string, width: number) => `${assetBase}/images/${id}-${width}.webp`;

let catalogPromise: Promise<IconSummary[]> | undefined;
const recordCache = new Map<string, Promise<IconRecord>>();

/** Отличает «такой записи нет» от сетевой ошибки: сообщения на экране разные. */
export const MISSING = 'iconography/missing';

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(`${assetBase}/${path}`);
  if (response.status === 404) throw new Error(MISSING);
  if (!response.ok) throw new Error('Не удалось загрузить каталог. Попробуйте ещё раз.');
  return response.json() as Promise<T>;
}

export function loadCatalog() {
  catalogPromise ??= readJson<IconSummary[]>('catalog.json').catch((error: unknown) => {
    catalogPromise = undefined;
    throw error;
  });
  return catalogPromise;
}

export function loadIcon(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error(MISSING));
  if (!recordCache.has(id)) {
    recordCache.set(id, readJson<IconRecord>(`records/${id}.json`).catch((error: unknown) => {
      recordCache.delete(id);
      throw error;
    }));
    // Keep long sessions bounded; the catalogue itself stays a compact index.
    if (recordCache.size > 40) recordCache.delete(recordCache.keys().next().value!);
  }
  return recordCache.get(id)!;
}

export function useResource<T>(loader: () => Promise<T>, key: string) {
  const [value, setValue] = useState<T>();
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setValue(undefined);
    setError('');
    setMissing(false);
    loader().then((data) => { if (alive) setValue(data); }).catch((caught: unknown) => {
      if (!alive) return;
      const gone = caught instanceof Error && caught.message === MISSING;
      setMissing(gone);
      setError(gone ? 'Такой записи нет.' : 'Не удалось загрузить данные. Проверьте соединение и повторите.');
    });
    return () => { alive = false; };
    // Callers identify their stable resource explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  return { value, error, missing, retry: () => setAttempt((n) => n + 1) };
}

const normalize = (text: string) => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');
const termsOf = (query: string) => normalize(query).trim().split(/\s+/).filter(Boolean);

/** Четыре учебные группы традиций. Точные строки индекса («Византийская / критская») сводятся к группе. */
export const traditionGroups = ['Русская', 'Византийская', 'Греческая', 'Грузинская'];

export function traditionGroup(tradition: string) {
  return traditionGroups.find((group) => tradition.startsWith(group)) ?? tradition;
}

/** Группы традиций, реально представленные в индексе, с количеством записей. */
export function traditionOptions(icons: IconSummary[]) {
  const counts = new Map<string, number>();
  for (const icon of icons) {
    const group = traditionGroup(icon.tradition);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return traditionGroups.filter((group) => counts.has(group))
    .map((group) => ({ value: group, count: counts.get(group)! }));
}

/** Сюжет — главный учебный срез: «все Богородицы», «все праздники». */
export function subjectOptions(icons: IconSummary[]) {
  const counts = new Map<string, number>();
  for (const icon of icons) if (icon.subject) counts.set(icon.subject, (counts.get(icon.subject) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'))
    .map(([value, count]) => ({ value, count }));
}

export function centuryOptions(icons: IconSummary[]) {
  return [...new Set(icons.flatMap((icon) => icon.centuries))].sort((a, b) => a - b);
}

const romanSigns: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

export function roman(value: number) {
  let rest = Math.trunc(value);
  if (!Number.isFinite(rest) || rest <= 0) return String(value);
  let out = '';
  for (const [weight, sign] of romanSigns) while (rest >= weight) { out += sign; rest -= weight; }
  return out;
}

export const centuryLabel = (century: number) => `${roman(century)} век`;

/** Редакторские оговорки не должны попадать в подпись карточки вместо даты. */
const editorialNote = /сверк|уточн|по\s+записи|карточк/i;

export function displayPeriod(icon: Pick<IconSummary, 'period' | 'centuries'>) {
  // В подписи нужна сама дата: пояснение после «;» остаётся в паспорте, в строке «Период».
  const period = (icon.period ?? '').split(';')[0].trim();
  if (period && !editorialNote.test(period)) return period;
  const centuries = icon.centuries ?? [];
  if (!centuries.length) return 'Датировка уточняется';
  const first = roman(centuries[0]);
  const last = roman(centuries[centuries.length - 1]);
  return first === last ? `${first} век` : `${first}–${last} века`;
}

/** Значение-заглушка: вся строка — оговорка «не указан / не установлено / не уточнено». */
const placeholderFact = /(^|[\s(])не\s+(указан|установ|уточн|определ)/i;

export function isPlaceholderFact(value: string | undefined) {
  const text = (value ?? '').trim();
  if (!text) return true;
  // Есть конкретные сведения до оговорки («Русь; центр не уточнён») — строку оставляем.
  if (/[;,—]/.test(text)) return false;
  return placeholderFact.test(text);
}

const searchFields = (icon: IconSummary) => [
  [icon.title],
  [icon.subject, icon.people, icon.type],
  [icon.region, icon.period, icon.museum, ...icon.tags],
].map((group) => normalize(group.join(' ')));

/** Вес совпадения: название → сюжет/персонажи/тип → регион, период, музей, теги. */
const fieldWeights = [3, 2, 1];

export function iconScore(icon: IconSummary, query: string) {
  const terms = termsOf(query);
  if (!terms.length) return 0;
  const fields = searchFields(icon);
  return terms.reduce((total, term) => {
    const index = fields.findIndex((field) => field.includes(term));
    return total + (index < 0 ? 0 : fieldWeights[index]);
  }, 0);
}

/** Ранжирование запроса. Сортировка стабильна, поэтому выбранный порядок сохраняется внутри одного веса. */
export function rankIcons(icons: IconSummary[], query: string) {
  if (!termsOf(query).length) return icons;
  return [...icons].sort((a, b) => iconScore(b, query) - iconScore(a, query));
}

export type CatalogOrder = 'century' | 'title';

const firstCentury = (icon: IconSummary) => (icon.centuries.length ? icon.centuries[0] : Number.MAX_SAFE_INTEGER);
const byTitle = (a: IconSummary, b: IconSummary) => a.title.localeCompare(b.title, 'ru');

export function sortIcons(icons: IconSummary[], order: CatalogOrder) {
  if (order === 'title') return [...icons].sort(byTitle);
  return [...icons].sort((a, b) => firstCentury(a) - firstCentury(b) || byTitle(a, b));
}

export function searchIcons(icons: IconSummary[], query: string, tradition = '', century = '', subject = '') {
  const terms = termsOf(query);
  const group = tradition ? traditionGroup(tradition) : '';
  return icons.filter((icon) => (!group || traditionGroup(icon.tradition) === group)
    && (!century || icon.centuries.includes(Number(century)))
    && (!subject || icon.subject === subject)
    && terms.every((term) => searchFields(icon).some((field) => field.includes(term))));
}

/** Список для выпадающих списков: группы традиций в учебном порядке, внутри — по названию. */
export function iconsByTradition(icons: IconSummary[]) {
  const groups = new Map<string, IconSummary[]>();
  for (const icon of icons) {
    const group = traditionGroup(icon.tradition);
    groups.set(group, [...(groups.get(group) ?? []), icon]);
  }
  const rank = (group: string) => {
    const index = traditionGroups.indexOf(group);
    return index < 0 ? traditionGroups.length : index;
  };
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'ru'))
    .map(([tradition, list]) => ({ tradition, icons: [...list].sort(byTitle) }));
}

export function dailyIcon(icons: IconSummary[], date = new Date()) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  return icons.length ? icons[day % icons.length] : undefined;
}

export const loadSchools = () => readJson<IconSchool[]>('schools.json');

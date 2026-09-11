import { useEffect, useState } from 'react';
import type { IconRecord, IconSummary, IconSchool } from '../types';

// Metadata and images can move together to an object store without changing routes.
const configuredBase = import.meta.env.VITE_ICONOGRAPHY_ASSET_BASE as string | undefined;
export const assetBase = (configuredBase || '/iconography').replace(/\/$/, '');
export const imageUrl = (id: string, width: number) => `${assetBase}/images/${id}-${width}.webp`;
let catalogPromise: Promise<IconSummary[]> | undefined;
const recordCache = new Map<string, Promise<IconRecord>>();
async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(`${assetBase}/${path}`);
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
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('Икона не найдена.'));
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
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setValue(undefined);
    setError('');
    loader().then((data) => { if (alive) setValue(data); }).catch(() => {
      if (alive) setError('Не удалось загрузить данные. Проверьте соединение и повторите.');
    });
    return () => { alive = false; };
    // Callers identify their stable resource explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  return { value, error, retry: () => setAttempt((n) => n + 1) };
}
export function searchIcons(icons: IconSummary[], query: string, tradition = '', century = '') {
  const normalize = (text: string) => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return icons.filter((icon) => (!tradition || icon.tradition === tradition)
    && (!century || icon.centuries.includes(Number(century)))
    && terms.every((term) => normalize([icon.title, icon.subject, icon.people, icon.type,
      icon.region, icon.period, icon.museum, ...icon.tags].join(' ')).includes(term)));
}
export function dailyIcon(icons: IconSummary[], date = new Date()) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  return icons.length ? icons[day % icons.length] : undefined;
}

export const loadSchools = () => readJson<IconSchool[]>("schools.json");

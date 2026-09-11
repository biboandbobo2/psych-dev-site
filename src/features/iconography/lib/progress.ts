import type { Progress } from '../types';
const KEY = 'academy.iconography.progress.v1';
export const emptyProgress = (): Progress => ({ difficult: [], answered: 0, correct: 0 });
export function readProgress(): Progress {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!data || typeof data !== 'object') return emptyProgress();
    const p = data as Partial<Progress>;
    const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : 0;
    return { difficult: Array.isArray(p.difficult) ? [...new Set(p.difficult.filter((id) => typeof id === 'string' && id.length < 160))].slice(-500) : [],
      answered: count(p.answered), correct: Math.min(count(p.correct), count(p.answered)) };
  } catch { return emptyProgress(); }
}
export function recordAnswer(id: string, correct: boolean): boolean {
  const progress = readProgress();
  const difficult = new Set(progress.difficult);
  if (correct) difficult.delete(id); else difficult.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify({ difficult: [...difficult].slice(-500),
      answered: progress.answered + 1, correct: progress.correct + Number(correct) }));
    return true;
  } catch { return false; }
}

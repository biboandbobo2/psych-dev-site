import { auth } from '../../lib/firebase';
import { recordEarnedAchievements } from './achievementsCloud';

const NOT_FOUND_KEY = 'achievements:not-here';

/**
 * Вызывается со страницы 404 — секретная наклейка «Не туда». Вошедшему
 * пишем сразу на сервер; гостю — метка в localStorage, засчитается после входа.
 */
export function markNotFoundVisited() {
  try {
    localStorage.setItem(NOT_FOUND_KEY, '1');
  } catch {
    // приватный режим — останется только серверная запись
  }
  const uid = auth.currentUser?.uid;
  if (uid) void recordEarnedAchievements(uid, [{ id: 'not-here' }]);
}

export function readNotFoundVisited(): boolean {
  try {
    return localStorage.getItem(NOT_FOUND_KEY) === '1';
  } catch {
    return false;
  }
}

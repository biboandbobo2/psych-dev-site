const NOT_FOUND_KEY = 'achievements:not-here';

/** Вызывается со страницы 404 — секретная наклейка «Не туда». */
export function markNotFoundVisited() {
  try {
    localStorage.setItem(NOT_FOUND_KEY, '1');
  } catch {
    // приватный режим — наклейка просто не засчитается
  }
}

export function readNotFoundVisited(): boolean {
  try {
    return localStorage.getItem(NOT_FOUND_KEY) === '1';
  } catch {
    return false;
  }
}

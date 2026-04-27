import { auth } from '../../../lib/firebase';

export type CourseIntroDraftKind = 'idea' | 'program';

/**
 * Запрашивает у /api/assistant черновик секции «Идея» или «Программа»
 * через Gemini Flash. BYOK ключ обязателен (передаётся X-Gemini-Api-Key).
 */
export async function generateCourseIntroDraft(
  courseName: string,
  lessons: readonly string[],
  kind: CourseIntroDraftKind,
  geminiKey: string | null,
): Promise<string> {
  if (!geminiKey) {
    throw new Error('Подключите свой Gemini API ключ в профиле — он бесплатный.');
  }
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error('Войдите в аккаунт, чтобы использовать AI-черновики.');
  }

  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      'X-Gemini-Api-Key': geminiKey,
    },
    body: JSON.stringify({ action: 'courseIntroDraft', courseName, lessons, kind }),
  });

  const data = (await response.json()) as { ok?: boolean; error?: string; answer?: unknown };
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return typeof data.answer === 'string' ? data.answer : '';
}

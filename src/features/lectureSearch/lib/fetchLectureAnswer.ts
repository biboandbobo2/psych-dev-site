// Общий POST /api/lectures (action: answer) — используется хуками
// useLectureAnswer (блок ассистента) и useLectureExplain (конспект-режим).

import { buildAuthorizedHeaders } from '../../../lib/apiAuth';
import { buildGeminiApiKeyHeader, sanitizeGeminiApiKey } from '../../../lib/geminiKey';
import type { LectureCitation } from '../hooks/useLectureAnswer';

export interface LectureAnswerResult {
  answer: string;
  citations: LectureCitation[];
  tookMs: number | null;
}

export async function fetchLectureAnswer(params: {
  query: string;
  courseId: string;
  lectureKeys: string[];
  geminiApiKey: string | null;
}): Promise<LectureAnswerResult> {
  const geminiApiKeyOverride = sanitizeGeminiApiKey(params.geminiApiKey);
  const headers = await buildAuthorizedHeaders({
    'Content-Type': 'application/json',
    ...buildGeminiApiKeyHeader(geminiApiKeyOverride),
  });

  const res = await fetch('/api/lectures', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'answer',
      query: params.query,
      courseId: params.courseId,
      lectureKeys: params.lectureKeys,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || 'Не удалось получить ответ по лекциям');
  }

  return {
    answer: data.answer || '',
    citations: data.citations || [],
    tookMs: data.tookMs ?? null,
  };
}

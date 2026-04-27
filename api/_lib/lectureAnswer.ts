// Помощники для action=answer в /api/lectures: SYSTEM_PROMPT, контекст,
// сообщение «AI недоступен», очистка ответа от служебных символов.

import type { LectureSearchMatch } from './lectureRetrieval.js';

export const LECTURE_SYSTEM_PROMPT = `Ты — преподаватель психологии. Отвечай на вопрос студента, опираясь ИСКЛЮЧИТЕЛЬНО на предоставленные фрагменты транскриптов лекций.

ПРАВИЛА:
1. Не выдумывай информацию вне источников.
2. Пиши на русском языке.
3. Ответ должен быть содержательным, но компактным: до 5 абзацев.
4. Не используй markdown, списки или технические ссылки в тексте ответа.
5. Ссылки на источники указывай только в массиве citations.

ФОРМАТ ОТВЕТА — строго JSON:
{
  "answer": "чистый текст ответа",
  "citations": [
    { "chunkId": "lecture-key::0", "claim": "к какому утверждению относится источник" }
  ]
}`;

export function buildLectureAiUnavailableMessage(): string {
  return 'Для выбранных лекций ещё не подготовлены данные для ответа ИИ. Попробуйте выбрать другие лекции или весь курс.';
}

export function buildLectureContext(match: LectureSearchMatch): string {
  return `[SOURCE chunkId="${match.id}" lecture="${match.lectureTitle}" period="${match.periodTitle}" timestamp="${match.timestampLabel}"]
${match.text}
[/SOURCE]`;
}

export function sanitizeLectureAnswer(answer: string): string {
  return answer
    .replace(/\[SOURCE[^\]]*\]/gi, '')
    .replace(/\[\/SOURCE\]/gi, '')
    .replace(/\[chunkId[=:][^\]]+\]/gi, '')
    .replace(/\(chunkId[=:][^\)]+\)/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

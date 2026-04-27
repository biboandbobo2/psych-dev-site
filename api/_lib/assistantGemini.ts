// Gemini integration для /api/assistant: extraction BYOK ключа,
// system instructions, основной чат и courseIntroDraft, парсинг JSON ответа.

import { GoogleGenAI } from '@google/genai';
import type {
  AssistantHistoryItem,
  CourseIntroDraftRequest,
  GeminiStructuredResponse,
} from './assistantTypes.js';

const SYSTEM_INSTRUCTION = `Ты — ИИ-помощник по психологии на образовательном сайте.

СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на вопросы по психологии, психологии развития, педагогической психологии, клинической психологии.
2. Если вопрос НЕ относится к психологии — установи allowed=false и вежливо откажи, предложив переформулировать вопрос.
3. НЕ давай медицинских диагнозов и не заменяй консультацию специалиста.
4. При обсуждении клинических тем добавляй дисклеймер о необходимости консультации с профессионалом.
5. Биографии известных психологов допустимы, если связываешь факты биографии с их идеями/теориями/вкладом в психологию.
6. Ответ должен быть информативным но компактным: максимум 6 абзацев, до 3000 символов.
7. Отвечай на языке вопроса (русский/английский).

ФОРМАТ ОТВЕТА — строго JSON:
{
  "allowed": true/false,
  "answer": "текст ответа"
}

Примеры отказа (allowed=false):
- Вопросы про программирование, математику, физику
- Вопросы про рецепты, путешествия, спорт
- Просьбы написать код или сочинение

Примеры принятия (allowed=true):
- Что такое теория привязанности?
- Как развивается память у детей?
- Признаки тревожного расстройства
- Стадии развития по Пиаже
- Как биография Эриксона повлияла на его теорию развития`;

const COURSE_INTRO_SYSTEM_INSTRUCTION = `Ты — редактор образовательных материалов на платформе «DOM Academy» (психология).
Пиши в академичном, но дружелюбном тоне на русском языке. Никаких маркетинговых клише («уникальный», «революционный»).
Не используй markdown, списки, заголовки. Только связный текст абзацами, разделёнными пустой строкой. Максимум 2–3 абзаца.`;

const COURSE_PROGRAM_SYSTEM_INSTRUCTION = `Ты — редактор образовательных материалов на платформе «DOM Academy» (психология).
Составь программу курса в виде нумерованного списка блоков с коротким описанием каждого (1–2 предложения). Язык — русский. Без воды и маркетинга.
Формат: «1. Название блока — описание.» Каждый блок с новой строки.`;

/**
 * Извлекает API ключ Gemini ТОЛЬКО из заголовка X-Gemini-Api-Key (BYOK strict).
 * До волны 7 здесь был fallback на env-переменные — это позволяло гостям дёргать
 * AI на наш ключ. Сейчас прод-ключ остаётся только для server-side admin-функций.
 */
export function getGeminiApiKey(req: any): string {
  const userKey = req.headers?.['x-gemini-api-key'];
  if (userKey && typeof userKey === 'string' && userKey.trim()) {
    return userKey.trim();
  }
  return '';
}

/**
 * Парсит JSON ответ Gemini, очищая возможные markdown code-fences и
 * вырезая JSON блок по regex. Возвращает null если не удалось.
 */
export function tryParseGeminiResponse(text: string): GeminiStructuredResponse | null {
  if (!text) return null;

  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*"allowed"[\s\S]*"answer"[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.allowed === 'boolean' && typeof parsed.answer === 'string') {
      return {
        allowed: parsed.allowed,
        answer: parsed.answer,
      };
    }
  } catch {
    // Parsing failed
  }

  return null;
}

export async function callGemini(
  message: string,
  locale: string,
  history: AssistantHistoryItem[],
  apiKey: string,
): Promise<GeminiStructuredResponse> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  const historyPrompt = history.length
    ? history
        .map((item) => `${item.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${item.message}`)
        .join('\n')
    : 'История отсутствует.';

  const userPrompt = `Контекст диалога:
${historyPrompt}

Новый вопрос (язык: ${locale}): ${message}

Ответь строго в формате JSON: {"allowed": boolean, "answer": "текст"}`;

  let response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: userPrompt,
    config: {
      maxOutputTokens: 1000,
      temperature: 0.5,
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  let text = response.text?.trim() ?? '';
  let parsed = tryParseGeminiResponse(text);

  // Retry со более строгой инструкцией если парсинг провалился
  if (!parsed) {
    const retryPrompt = `${userPrompt}

ВАЖНО: Верни ТОЛЬКО валидный JSON без markdown, без \`\`\`, без пояснений:
{"allowed": boolean, "answer": "текст"}`;

    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: retryPrompt,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.3,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    text = response.text?.trim() ?? '';
    parsed = tryParseGeminiResponse(text);
  }

  if (!parsed) {
    // Fallback: treat as allowed response if we got any text
    return {
      allowed: true,
      answer: text || 'Извините, не удалось обработать ваш вопрос. Попробуйте переформулировать.',
    };
  }

  return parsed;
}

export async function callGeminiCourseIntroDraft(
  req: CourseIntroDraftRequest,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const courseName = req.courseName.trim() || 'Неизвестный курс';
  const lessons = (req.lessons ?? []).map((l) => l.trim()).filter(Boolean);
  const lessonsText =
    lessons.length > 0 ? lessons.map((l, i) => `${i + 1}. ${l}`).join('\n') : '(список уроков пока пуст)';

  const prompt =
    req.kind === 'idea'
      ? `Курс: «${courseName}».\n\nСписок уроков курса:\n${lessonsText}\n\nНапиши 1–2 абзаца «Идея курса»: для кого этот курс, что он даёт, какая логика его программы. Не перечисляй уроки по одному, говори на уровне целей и смысла.`
      : `Курс: «${courseName}».\n\nСписок уроков курса:\n${lessonsText}\n\nСоставь связную программу курса: сгруппируй темы в 3–6 блоков и коротко опиши каждый блок.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
    config: {
      maxOutputTokens: 800,
      temperature: 0.6,
      systemInstruction:
        req.kind === 'idea' ? COURSE_INTRO_SYSTEM_INSTRUCTION : COURSE_PROGRAM_SYSTEM_INSTRUCTION,
    },
  });
  return (response.text ?? '').trim();
}

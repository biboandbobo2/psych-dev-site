/**
 * Gemini-обвязка biography pipeline: извлечение текста/токенов из ответа,
 * response-схемы structured output, конфиги extraction-вызовов и lite-тюнинг.
 * Вынесено из timelineBiographyPipeline.ts без изменения логики — байты
 * промптов и конфигов не менялись (кэш-ключи бенчмарка стабильны).
 */
import type { BiographyPipelineDeps } from './timelineBiographyPipelineTypes.js';

// ---------------------------------------------------------------------------
// Gemini result text extraction
// ---------------------------------------------------------------------------

export function collectGeminiResultText(result: unknown) {
  if (result && typeof result === 'object') {
    const directText = 'text' in result && typeof result.text === 'string' ? result.text : '';
    if (directText.trim()) {
      return directText;
    }

    const outputsText = 'outputs' in result && Array.isArray(result.outputs)
      ? result.outputs
          .map((output) => {
            if (!output || typeof output !== 'object') return '';
            const type = 'type' in output && typeof output.type === 'string' ? output.type : '';
            if (type !== 'text') return '';
            return 'text' in output && typeof output.text === 'string' ? output.text : '';
          })
          .filter(Boolean)
          .join('\n')
      : '';

    if (outputsText.trim()) {
      return outputsText;
    }

    const candidateText = 'candidates' in result && Array.isArray(result.candidates)
      ? result.candidates
          .flatMap((candidate) => {
            if (!candidate || typeof candidate !== 'object') return [];
            const content = 'content' in candidate ? candidate.content : null;
            if (!content || typeof content !== 'object') return [];
            const parts: unknown[] = 'parts' in content && Array.isArray(content.parts) ? content.parts : [];
            return parts
              .map((part) => {
                if (!part || typeof part !== 'object') return '';
                return 'text' in part && typeof part.text === 'string' ? part.text : '';
              })
              .filter(Boolean);
          })
          .join('\n')
      : '';

    if (candidateText.trim()) {
      return candidateText;
    }
  }

  return '';
}

/** JSON-схема extraction/gap-ответа: nullable year/month узаконивают
 *  «дата неизвестна» (документированный приём Google против галлюцинаций). */
const FACT_EXTRACTION_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      year: {
        type: 'integer',
        nullable: true,
        description: 'Год события, буквально указанный в тексте. null, если год в тексте не написан. НЕ выводить год из соседних событий.',
      },
      month: {
        type: 'integer',
        nullable: true,
        minimum: 1,
        maximum: 12,
        description: 'Месяц, только если буквально указан в тексте. Иначе null.',
      },
      text: { type: 'string', description: 'Конкретное событие, 5-15 слов.' },
      category: {
        type: 'string',
        enum: ['birth', 'education', 'move', 'publication', 'career', 'family', 'friends', 'health', 'conflict', 'award', 'project', 'death', 'other'],
      },
      sphere: {
        type: 'string',
        enum: ['education', 'career', 'creativity', 'family', 'health', 'friends', 'place', 'finance', 'hobby', 'other'],
      },
    },
    required: ['year', 'text', 'category', 'sphere'],
  },
} as const;

export const LITE_DATING_EXAMPLES = [
  'ПРИМЕРЫ ПРАВИЛЬНОЙ ДАТИРОВКИ:',
  'Текст: «В 1927 году переехал в Париж.» → {"year": 1927, "text": "Переехал в Париж", "category": "move", "sphere": "place"}',
  'Текст: «Позднее активно выступал против войны.» (год из текста НЕ следует) → {"year": null, "text": "Активно выступал против войны", "category": "other", "sphere": "other"}',
  'Текст: «В эти годы много путешествовал по Европе.» (точного года нет) → {"year": null, "text": "Много путешествовал по Европе", "category": "move", "sphere": "place"}',
  'Текст: «С 1902 года регулярно проводил встречи с учениками.» (длительный факт — год НАЧАЛА) → {"year": 1902, "text": "Начал регулярные встречи с учениками", "category": "career", "sphere": "career"}',
  'НИКОГДА не приписывай факту год соседнего события или начала десятилетия. Нет года в тексте — ставь null.',
].join('\n');

/** Замерено на rogers/vygotsky (2026-07): не-thinking модели требуют
 *  процедуры вместо декларации. Поабзацный проход + минимум, растущий с
 *  размером слайса (~1 факт на 400 символов), + few-shot year=null. */
export function buildLiteExtractionEmphasis(sliceChars: number): string {
  const minFacts = Math.max(60, Math.round(sliceChars / 400));
  return [
    `МЕТОД РАБОТЫ — строго по процедуре: пройди фрагмент АБЗАЦ ЗА АБЗАЦЕМ. Из каждого абзаца выпиши ВСЕ события: каждое предложение с датой, именем, произведением, местом, организацией или переменой статуса — ОТДЕЛЬНЫЙ факт. Составное предложение с несколькими событиями дели на несколько фактов. Не обобщай и не сжимай. Пропустить абзац нельзя. ОСОБОЕ ПРАВИЛО: предложение, в котором написан год (например «1924»), пропускать ЗАПРЕЩЕНО — каждое такое предложение обязано дать минимум один факт с этим годом. Верни не менее ${minFacts} фактов.`,
    LITE_DATING_EXAMPLES,
  ].join('\n');
}

export function isLiteProfile(deps: BiographyPipelineDeps) {
  return deps.tuningProfile === 'lite';
}

export function resolvedExtractionEmphasis(deps: BiographyPipelineDeps, sliceChars: number): string | undefined {
  if (deps.extractionEmphasis) return deps.extractionEmphasis;
  return isLiteProfile(deps) ? buildLiteExtractionEmphasis(sliceChars) : undefined;
}

/** Схема JSON-ответа объединённой разметки (lite-профиль): TSV с пустыми
 *  колонками не-thinking модели схлопывают, теряя позиционность строк. */
export const MERGED_MARKUP_RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      index: { type: 'integer' },
      themes: { type: 'array', items: { type: 'string' } },
      people: { type: 'array', items: { type: 'string' } },
      month: { type: 'integer', nullable: true, minimum: 1, maximum: 12 },
      day: { type: 'integer', nullable: true, minimum: 1, maximum: 31 },
      importance: { type: 'integer', minimum: 1, maximum: 5 },
      shortLabel: { type: 'string' },
    },
    required: ['index', 'themes', 'month', 'importance', 'shortLabel'],
  },
} as const;

export function extractionCallConfig(deps: BiographyPipelineDeps): Record<string, unknown> {
  if (!deps.structuredExtraction && !isLiteProfile(deps)) {
    return {
      temperature: 0.1,
      maxOutputTokens: 65536,
      responseMimeType: 'text/plain',
    };
  }
  return {
    temperature: 0.1,
    maxOutputTokens: 65536,
    responseMimeType: 'application/json',
    responseSchema: FACT_EXTRACTION_RESPONSE_SCHEMA,
  };
}

export function extractTotalTokens(result: unknown): number {
  if (!result || typeof result !== 'object' || !('usageMetadata' in result)) return 0;
  const meta = (result as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
  return typeof meta?.totalTokenCount === 'number' ? meta.totalTokenCount : 0;
}

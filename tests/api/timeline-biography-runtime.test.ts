import { afterEach, describe, expect, it } from 'vitest';
import type { WikipediaPageExtract } from '../../server/api/timelineBiographyTypes.js';

// Д-B6: automation-путь (Runtime) разошёлся с прод-CF: не фильтровал
// посмертные факты, не передавал mode/deathYear в gap-filling и резал
// статью собственным слайсером вместо готовых factExtractSlices.
// Тест прогоняет runBiographyImport с фейковым Gemini-клиентом и
// проверяет выравнивание с CF-поведением.

type GenerateRequest = {
  model: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  config?: Record<string, unknown>;
};

function jsonFacts(facts: Array<{ year: number | null; text: string; category?: string; sphere?: string }>) {
  return JSON.stringify(facts.map((f) => ({ category: 'other', sphere: 'other', ...f })));
}

function buildFakeClient(calls: GenerateRequest[]) {
  return {
    models: {
      generateContent: async (request: GenerateRequest) => {
        calls.push(request);
        const prompt = request.contents[0]?.parts[0]?.text ?? '';

        if (prompt.startsWith('Извлеки ВСЕ биографические факты')) {
          return {
            text: jsonFacts([
              { year: 1849, text: 'Родился в Рязани в семье священника', category: 'birth', sphere: 'family' },
              { year: 1870, text: 'Поступил в Петербургский университет', category: 'education', sphere: 'education' },
              { year: 1904, text: 'Получил Нобелевскую премию по физиологии', category: 'award', sphere: 'career' },
              { year: 1936, text: 'Скончался в Ленинграде от пневмонии', category: 'death', sphere: 'health' },
              { year: 1960, text: 'Открыт памятник учёному в Рязани', category: 'other', sphere: 'other' },
            ]),
          };
        }
        if (prompt.startsWith('Ты — второй проход')) {
          return { text: jsonFacts([{ year: 1890, text: 'Возглавил отдел физиологии в ИЭМ', category: 'career', sphere: 'career' }]) };
        }
        if (prompt.startsWith('Ты — разметчик')) {
          return { text: '0\tfamily_household\t\t\t\n1\teducation\t\t\t\n2\tservice_career\t\t\t\n3\tlosses\t\t\t\n4\tservice_career\t\t\t' };
        }
        if (prompt.startsWith('Ты — редактор')) {
          return { text: '0\t5\tРождение\n1\t4\tУниверситет\n2\t5\tНобелевская премия\n3\t5\tСмерть\n4\t3\tОтдел физиологии' };
        }
        if (prompt.startsWith('Ты — нарратолог')) {
          return { text: JSON.stringify({ mainLine: [0, 1, 2, 3], branches: [{ name: 'Наука', sphere: 'career', facts: [4] }] }) };
        }
        throw new Error(`Неожиданный промпт: ${prompt.slice(0, 60)}`);
      },
    },
  };
}

function makePage(): WikipediaPageExtract {
  const extract = 'Иван Петрович Павлов (1849–1936) — русский физиолог.';
  return {
    title: 'Павлов, Иван Петрович',
    extract,
    biographyExtract: extract,
    promptExtract: extract,
    factExtractSlices: ['Фрагмент биографии 1', 'Фрагмент биографии 2'],
    canonicalUrl: 'https://ru.wikipedia.org/wiki/Павлов,_Иван_Петрович',
  };
}

describe('runBiographyImport — выравнивание с CF-pipeline (Д-B6)', () => {
  afterEach(async () => {
    const { setBiographyGenAiClientFactory } = await import('../../server/api/timelineBiographyRuntime.js');
    setBiographyGenAiClientFactory(null);
  });

  it('фильтрует посмертные факты, передаёт deathYear в gap-filling и использует factExtractSlices', async () => {
    const { runBiographyImport, setBiographyGenAiClientFactory } = await import(
      '../../server/api/timelineBiographyRuntime.js'
    );
    const calls: GenerateRequest[] = [];
    setBiographyGenAiClientFactory(() => buildFakeClient(calls));

    const payload = await runBiographyImport({
      sourceUrl: 'https://ru.wikipedia.org/wiki/Павлов,_Иван_Петрович',
      apiKey: 'fake-key',
      page: makePage(),
    });

    // Слайсинг: по одному extraction-вызову на каждый factExtractSlices
    const extractionCalls = calls.filter((c) =>
      (c.contents[0]?.parts[0]?.text ?? '').startsWith('Извлеки ВСЕ биографические факты')
    );
    expect(extractionCalls.length).toBe(2);

    // Post-death фильтр: факт 1960 года (память) не должен пройти
    expect(payload.facts.every((f) => f.year == null || f.year <= 1946)).toBe(true);

    // Gap-filling знает год смерти
    const gapCalls = calls.filter((c) => (c.contents[0]?.parts[0]?.text ?? '').startsWith('Ты — второй проход'));
    expect(gapCalls.length).toBe(1);
    expect(gapCalls[0].contents[0].parts[0].text).toContain('Персона умерла в 1936');

    // Итоговый timeline построен
    expect(payload.timeline).toBeDefined();
    expect(payload.timeline!.nodes.length).toBeGreaterThan(0);
  });
});

// Verifier F1: унификация BPT-2 незаметно перенесла в прод-CF толерантность
// Runtime к падению отдельного слайса — биография молча теряла кусок статьи
// (нет ретраев хватило → «успех» без ~25% фактов). Прод-семантика старого CF:
// невосстановимое падение слайса = ошибка импорта, пользователь видит сбой.
describe('runBiographyImport — падение слайса не глотается (F1)', () => {
  afterEach(async () => {
    const { setBiographyGenAiClientFactory } = await import('../../server/api/timelineBiographyRuntime.js');
    setBiographyGenAiClientFactory(null);
  });

  it('ошибка extraction-слайса роняет импорт, а не обрезает биографию', async () => {
    const { runBiographyImport, setBiographyGenAiClientFactory } = await import(
      '../../server/api/timelineBiographyRuntime.js'
    );
    let extractionCalls = 0;
    setBiographyGenAiClientFactory(() => ({
      models: {
        generateContent: async (request: GenerateRequest) => {
          const prompt = request.contents[0]?.parts[0]?.text ?? '';
          if (prompt.startsWith('Извлеки ВСЕ биографические факты')) {
            extractionCalls += 1;
            if (extractionCalls === 2) {
              throw new Error('503 UNAVAILABLE: high demand');
            }
            return { text: jsonFacts([{ year: 1849, text: 'Родился в Рязани', category: 'birth', sphere: 'family' }]) };
          }
          throw new Error(`не должен дойти до шага: ${prompt.slice(0, 40)}`);
        },
      },
    }));

    await expect(
      runBiographyImport({ sourceUrl: 'https://ru.wikipedia.org/wiki/X', apiKey: 'fake', page: makePage() })
    ).rejects.toThrow(/503|two-pass-flash-failed/);
  });
});

// BPT-9: объединённая разметка за флагом — один вызов вместо annotation+redaktura
describe('runBiographyImport — mergedMarkup (BPT-9)', () => {
  afterEach(async () => {
    const { setBiographyGenAiClientFactory } = await import('../../server/api/timelineBiographyRuntime.js');
    setBiographyGenAiClientFactory(null);
  });

  it('с флагом делает один разметочный вызов и заполняет темы/важность/shortLabel', async () => {
    const { runBiographyImport, setBiographyGenAiClientFactory } = await import(
      '../../server/api/timelineBiographyRuntime.js'
    );
    const calls: GenerateRequest[] = [];
    setBiographyGenAiClientFactory(() => ({
      models: {
        generateContent: async (request: GenerateRequest) => {
          calls.push(request);
          const prompt = request.contents[0]?.parts[0]?.text ?? '';
          if (prompt.startsWith('Извлеки ВСЕ биографические факты')) {
            return { text: jsonFacts([
              { year: 1849, text: 'Родился в Рязани', category: 'birth', sphere: 'family' },
              { year: 1904, text: 'Нобелевская премия', category: 'award', sphere: 'career' },
              { year: 1936, text: 'Скончался в Ленинграде', category: 'death', sphere: 'health' },
            ]) };
          }
          if (prompt.startsWith('Ты — второй проход')) return { text: '[]' };
          if (prompt.startsWith('Ты — разметчик и редактор')) {
            return { text: '0\tfamily_household\t\t9\t\t5\tРождение\n1\tservice_career\t\t\t\t5\tНобелевская премия\n2\tlosses\t\t\t\t5\tСмерть' };
          }
          if (prompt.startsWith('Ты — нарратолог')) {
            return { text: JSON.stringify({ mainLine: [0, 1, 2], branches: [] }) };
          }
          throw new Error(`неожиданный промпт: ${prompt.slice(0, 40)}`);
        },
      },
    }));

    // одно-слайсовая страница: у makePage 2 слайса и факты задваиваются
    const page = { ...makePage(), factExtractSlices: ['Фрагмент биографии'] };
    const payload = await runBiographyImport({
      sourceUrl: 'https://ru.wikipedia.org/wiki/X', apiKey: 'fake', page, mergedMarkup: true,
    });

    const markupCalls = calls.filter((c) => {
      const t = c.contents[0]?.parts[0]?.text ?? '';
      return t.startsWith('Ты — разметчик') || t.startsWith('Ты — редактор');
    });
    expect(markupCalls).toHaveLength(1);
    const nobel = payload.facts.find((f) => f.details.includes('Нобелевская'))!;
    expect(nobel.themes).toEqual(['service_career']);
    expect(nobel.importance).toBe('high');
    expect(nobel.shortLabel).toBe('Нобелевская премия');
    expect(payload.meta.stepCoverage).toMatchObject({ factsTotal: 3, annotated: 3, redacted: 3 });
  });
});

// Прод-профиль lite: весь тюнинг-стек одним флагом
describe('runBiographyImport — tuningProfile lite', () => {
  afterEach(async () => {
    const { setBiographyGenAiClientFactory } = await import('../../server/api/timelineBiographyRuntime.js');
    setBiographyGenAiClientFactory(null);
  });

  it('включает дробление+few-shot, responseSchema и объединённую разметку', async () => {
    const { runBiographyImport, setBiographyGenAiClientFactory } = await import(
      '../../server/api/timelineBiographyRuntime.js'
    );
    const calls: GenerateRequest[] = [];
    setBiographyGenAiClientFactory(() => ({
      models: {
        generateContent: async (request: GenerateRequest) => {
          calls.push(request);
          const prompt = request.contents[0]?.parts[0]?.text ?? '';
          if (prompt.startsWith('Извлеки ВСЕ биографические факты')) {
            return { text: jsonFacts([
              { year: 1849, text: 'Родился в Рязани', category: 'birth', sphere: 'family' },
              { year: 1936, text: 'Скончался в Ленинграде', category: 'death', sphere: 'health' },
            ]) };
          }
          if (prompt.startsWith('Ты — второй проход')) return { text: '[]' };
          if (prompt.startsWith('Ты — разметчик и редактор')) {
            return { text: JSON.stringify([
              { index: 0, themes: ['family_household'], people: [], month: null, day: null, importance: 5, shortLabel: 'Рождение' },
              { index: 1, themes: ['losses'], people: [], month: null, day: null, importance: 5, shortLabel: 'Смерть' },
            ]) };
          }
          if (prompt.startsWith('Ты — нарратолог')) {
            return { text: JSON.stringify({ mainLine: [0, 1], branches: [] }) };
          }
          throw new Error(`неожиданный промпт: ${prompt.slice(0, 40)}`);
        },
      },
    }));

    const page = { ...makePage(), factExtractSlices: ['Фрагмент биографии'] };
    const payload = await runBiographyImport({
      sourceUrl: 'https://ru.wikipedia.org/wiki/X', apiKey: 'fake', page, tuningProfile: 'lite',
    });

    const extraction = calls.find((c) => (c.contents[0]?.parts[0]?.text ?? '').startsWith('Извлеки'))!;
    // few-shot и дробление в focusHint
    expect(extraction.contents[0].parts[0].text).toContain('АБЗАЦ ЗА АБЗАЦЕМ');
    expect(extraction.contents[0].parts[0].text).toContain('"year": null');
    // structured output
    expect(extraction.config?.responseMimeType).toBe('application/json');
    expect(extraction.config?.responseSchema).toBeDefined();
    // объединённая разметка (один вызов) с месячными примерами
    const markup = calls.filter((c) => (c.contents[0]?.parts[0]?.text ?? '').startsWith('Ты — разметчик'));
    expect(markup).toHaveLength(1);
    // JSON-разметка со схемой (TSV с пустыми колонками lite схлопывает)
    expect(markup[0].contents[0].parts[0].text).toContain('ПРИМЕРЫ ЭЛЕМЕНТОВ ОТВЕТА');
    expect(markup[0].config?.responseSchema).toBeDefined();
    expect(payload.meta.stepCoverage).toMatchObject({ annotated: 2, redacted: 2 });
  });
});

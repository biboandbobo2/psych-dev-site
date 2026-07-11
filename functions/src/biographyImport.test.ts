/**
 * Прод-конфигурация модели user-facing импорта биографии.
 * Пин против тихого дрейфа: CF обязана запускать pipeline на lite-профиле
 * (gemini-3.1-flash-lite, non-thinking) — дешевле 2.5-flash в 12–25× и
 * переживает retirement 2.5-flash (2026-10-16). Поведение прод-конфига
 * гейтится реплеем в tests/benchmark/biographyPipelineQuality.test.ts.
 */
import { describe, it, expect } from 'vitest';

import { BIOGRAPHY_IMPORT_TUNING } from './biographyImport.js';
import { BIOGRAPHY_PROD_MODEL } from '../../server/api/timelineBiographyPipeline.js';

describe('biographyImport prod tuning', () => {
  it('CF запускает pipeline на lite-профиле', () => {
    expect(BIOGRAPHY_IMPORT_TUNING).toEqual({
      model: 'gemini-3.1-flash-lite',
      tuningProfile: 'lite',
    });
    expect(BIOGRAPHY_PROD_MODEL).toBe('gemini-3.1-flash-lite');
  });
});

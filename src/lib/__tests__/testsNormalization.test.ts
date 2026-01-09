import { describe, it, expect } from 'vitest';
import {
  trimOrUndefined,
  clampRevealAttempts,
  ensureQuestionId,
  normalizeRevealPolicy,
  sanitizeRevealPolicyForWrite,
  normalizeResources,
  sanitizeResourcesForWrite,
  normalizeAnswers,
  normalizeQuestion,
  sanitizeQuestionForWrite,
  normalizeAppearance,
  sanitizeAppearanceForWrite,
} from '../testsNormalization';
import {
  DEFAULT_REVEAL_POLICY,
  MIN_QUESTION_ANSWERS,
  MAX_QUESTION_ANSWERS,
  MAX_REVEAL_ATTEMPTS,
} from '../../types/tests';
import type { TestQuestion } from '../../types/tests';

describe('testsNormalization', () => {
  describe('trimOrUndefined', () => {
    it('returns trimmed string for valid input', () => {
      expect(trimOrUndefined('  hello  ')).toBe('hello');
    });

    it('returns undefined for empty string', () => {
      expect(trimOrUndefined('')).toBeUndefined();
    });

    it('returns undefined for whitespace-only string', () => {
      expect(trimOrUndefined('   ')).toBeUndefined();
    });

    it('returns undefined for non-string values', () => {
      expect(trimOrUndefined(null)).toBeUndefined();
      expect(trimOrUndefined(undefined)).toBeUndefined();
      expect(trimOrUndefined(123)).toBeUndefined();
      expect(trimOrUndefined({})).toBeUndefined();
      expect(trimOrUndefined([])).toBeUndefined();
    });
  });

  describe('clampRevealAttempts', () => {
    it('returns 1 for non-integer values', () => {
      expect(clampRevealAttempts('abc')).toBe(1);
      expect(clampRevealAttempts(null)).toBe(1);
      expect(clampRevealAttempts(undefined)).toBe(1);
      expect(clampRevealAttempts(1.5)).toBe(1);
      expect(clampRevealAttempts(NaN)).toBe(1);
    });

    it('clamps to 1 when below minimum', () => {
      expect(clampRevealAttempts(0)).toBe(1);
      expect(clampRevealAttempts(-5)).toBe(1);
    });

    it('clamps to MAX_REVEAL_ATTEMPTS when above maximum', () => {
      expect(clampRevealAttempts(100)).toBe(MAX_REVEAL_ATTEMPTS);
      expect(clampRevealAttempts(10)).toBe(MAX_REVEAL_ATTEMPTS);
    });

    it('returns valid integer within range', () => {
      expect(clampRevealAttempts(1)).toBe(1);
      expect(clampRevealAttempts(2)).toBe(2);
      expect(clampRevealAttempts(3)).toBe(3);
    });

    it('handles string numbers', () => {
      expect(clampRevealAttempts('2')).toBe(2);
      expect(clampRevealAttempts('10')).toBe(MAX_REVEAL_ATTEMPTS);
    });
  });

  describe('ensureQuestionId', () => {
    it('returns trimmed ID if valid string', () => {
      expect(ensureQuestionId('  q1  ', 0)).toBe('q1');
      expect(ensureQuestionId('question-abc', 5)).toBe('question-abc');
    });

    it('generates fallback ID for invalid input', () => {
      expect(ensureQuestionId('', 0)).toBe('question-1');
      expect(ensureQuestionId('   ', 2)).toBe('question-3');
      expect(ensureQuestionId(null, 4)).toBe('question-5');
      expect(ensureQuestionId(undefined, 0)).toBe('question-1');
      expect(ensureQuestionId(123, 1)).toBe('question-2');
    });
  });

  describe('normalizeRevealPolicy', () => {
    it('returns DEFAULT_REVEAL_POLICY for invalid input', () => {
      expect(normalizeRevealPolicy(null)).toEqual(DEFAULT_REVEAL_POLICY);
      expect(normalizeRevealPolicy(undefined)).toEqual(DEFAULT_REVEAL_POLICY);
      expect(normalizeRevealPolicy('string')).toEqual(DEFAULT_REVEAL_POLICY);
      expect(normalizeRevealPolicy({})).toEqual(DEFAULT_REVEAL_POLICY);
      expect(normalizeRevealPolicy({ mode: 'invalid' })).toEqual(DEFAULT_REVEAL_POLICY);
    });

    it('handles mode "never"', () => {
      expect(normalizeRevealPolicy({ mode: 'never' })).toEqual({ mode: 'never' });
    });

    it('handles mode "after_test"', () => {
      expect(normalizeRevealPolicy({ mode: 'after_test' })).toEqual({ mode: 'after_test' });
    });

    it('handles mode "immediately"', () => {
      expect(normalizeRevealPolicy({ mode: 'immediately' })).toEqual({ mode: 'immediately' });
    });

    it('handles mode "after_attempts" with valid attempts', () => {
      expect(normalizeRevealPolicy({ mode: 'after_attempts', attempts: 2 })).toEqual({
        mode: 'after_attempts',
        attempts: 2,
      });
    });

    it('clamps attempts in "after_attempts" mode', () => {
      expect(normalizeRevealPolicy({ mode: 'after_attempts', attempts: 100 })).toEqual({
        mode: 'after_attempts',
        attempts: MAX_REVEAL_ATTEMPTS,
      });
      expect(normalizeRevealPolicy({ mode: 'after_attempts', attempts: 0 })).toEqual({
        mode: 'after_attempts',
        attempts: 1,
      });
    });
  });

  describe('sanitizeRevealPolicyForWrite', () => {
    it('returns DEFAULT_REVEAL_POLICY for undefined', () => {
      expect(sanitizeRevealPolicyForWrite(undefined)).toEqual(DEFAULT_REVEAL_POLICY);
    });

    it('passes through valid modes', () => {
      expect(sanitizeRevealPolicyForWrite({ mode: 'never' })).toEqual({ mode: 'never' });
      expect(sanitizeRevealPolicyForWrite({ mode: 'after_test' })).toEqual({ mode: 'after_test' });
      expect(sanitizeRevealPolicyForWrite({ mode: 'immediately' })).toEqual({ mode: 'immediately' });
    });

    it('clamps attempts for after_attempts mode', () => {
      expect(sanitizeRevealPolicyForWrite({ mode: 'after_attempts', attempts: 2 })).toEqual({
        mode: 'after_attempts',
        attempts: 2,
      });
      expect(sanitizeRevealPolicyForWrite({ mode: 'after_attempts', attempts: 10 })).toEqual({
        mode: 'after_attempts',
        attempts: MAX_REVEAL_ATTEMPTS,
      });
    });

    it('returns DEFAULT for invalid mode', () => {
      expect(sanitizeRevealPolicyForWrite({ mode: 'invalid' } as any)).toEqual(DEFAULT_REVEAL_POLICY);
    });
  });

  describe('normalizeResources', () => {
    it('returns undefined for non-array input', () => {
      expect(normalizeResources(null)).toBeUndefined();
      expect(normalizeResources(undefined)).toBeUndefined();
      expect(normalizeResources('string')).toBeUndefined();
      expect(normalizeResources({})).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      expect(normalizeResources([])).toBeUndefined();
    });

    it('returns undefined for array with only empty resources', () => {
      expect(normalizeResources([{ title: '', url: '' }])).toBeUndefined();
      expect(normalizeResources([{ title: '   ', url: '   ' }])).toBeUndefined();
    });

    it('normalizes valid resources', () => {
      const result = normalizeResources([
        { title: '  Resource 1  ', url: '  https://example.com  ' },
        { title: 'Resource 2', url: '' },
      ]);
      expect(result).toEqual([
        { title: 'Resource 1', url: 'https://example.com' },
        { title: 'Resource 2', url: '' },
      ]);
    });

    it('filters out completely empty resources', () => {
      const result = normalizeResources([
        { title: 'Valid', url: 'https://example.com' },
        { title: '', url: '' },
        { title: 'Another', url: '' },
      ]);
      expect(result).toHaveLength(2);
    });
  });

  describe('sanitizeResourcesForWrite', () => {
    it('returns undefined for non-array', () => {
      expect(sanitizeResourcesForWrite(undefined)).toBeUndefined();
      expect(sanitizeResourcesForWrite(null as any)).toBeUndefined();
    });

    it('returns undefined for empty result', () => {
      expect(sanitizeResourcesForWrite([])).toBeUndefined();
      expect(sanitizeResourcesForWrite([{ title: '', url: '' }])).toBeUndefined();
    });

    it('sanitizes valid resources', () => {
      const result = sanitizeResourcesForWrite([
        { title: '  Title  ', url: '  http://url.com  ' },
      ]);
      expect(result).toEqual([{ title: 'Title', url: 'http://url.com' }]);
    });
  });

  describe('normalizeAnswers', () => {
    const questionId = 'q1';

    it('creates default answers when no data provided', () => {
      const result = normalizeAnswers({}, questionId);
      expect(result.length).toBeGreaterThanOrEqual(MIN_QUESTION_ANSWERS);
      expect(result[0].id).toBe('q1-answer-1');
      expect(result[0].text).toBe('');
    });

    it('normalizes answers array', () => {
      const result = normalizeAnswers(
        {
          answers: [
            { id: 'a1', text: 'Answer 1' },
            { id: 'a2', text: 'Answer 2' },
          ],
        },
        questionId
      );
      expect(result).toHaveLength(MIN_QUESTION_ANSWERS);
      expect(result[0]).toEqual({ id: 'a1', text: 'Answer 1' });
      expect(result[1]).toEqual({ id: 'a2', text: 'Answer 2' });
    });

    it('falls back to options array if answers insufficient', () => {
      const result = normalizeAnswers(
        {
          answers: [],
          options: ['Option A', 'Option B', 'Option C'],
        },
        questionId
      );
      expect(result[0].text).toBe('Option A');
      expect(result[0].id).toBe('q1-answer-1');
    });

    it('generates fallback IDs for answers without IDs', () => {
      const result = normalizeAnswers(
        {
          answers: [
            { text: 'No ID answer' },
            { id: '', text: 'Empty ID' },
          ],
        },
        questionId
      );
      expect(result[0].id).toBe('q1-answer-1');
      expect(result[1].id).toBe('q1-answer-2');
    });

    it('handles duplicate IDs', () => {
      const result = normalizeAnswers(
        {
          answers: [
            { id: 'same', text: 'First' },
            { id: 'same', text: 'Second' },
          ],
        },
        questionId
      );
      expect(result[0].id).toBe('same');
      expect(result[1].id).not.toBe('same');
    });

    it('limits to MAX_QUESTION_ANSWERS', () => {
      const answers = Array.from({ length: 20 }, (_, i) => ({
        id: `a${i}`,
        text: `Answer ${i}`,
      }));
      const result = normalizeAnswers({ answers }, questionId);
      expect(result.length).toBeLessThanOrEqual(MAX_QUESTION_ANSWERS);
    });

    it('pads to MIN_QUESTION_ANSWERS', () => {
      const result = normalizeAnswers(
        { answers: [{ id: 'a1', text: 'Only one' }] },
        questionId
      );
      expect(result.length).toBeGreaterThanOrEqual(MIN_QUESTION_ANSWERS);
    });
  });

  describe('normalizeQuestion', () => {
    it('creates question with default values for empty input', () => {
      const result = normalizeQuestion({}, 0);
      expect(result.id).toBe('question-1');
      expect(result.questionText).toBe('');
      expect(result.answers.length).toBeGreaterThanOrEqual(MIN_QUESTION_ANSWERS);
      expect(result.correctAnswerId).toBeNull();
      expect(result.shuffleAnswers).toBe(true);
      expect(result.revealPolicy).toEqual(DEFAULT_REVEAL_POLICY);
    });

    it('preserves valid question data', () => {
      const result = normalizeQuestion(
        {
          id: 'custom-q',
          questionText: 'What is 2+2?',
          shuffleAnswers: false,
          explanation: '  Math explanation  ',
        },
        0
      );
      expect(result.id).toBe('custom-q');
      expect(result.questionText).toBe('What is 2+2?');
      expect(result.shuffleAnswers).toBe(false);
      expect(result.explanation).toBe('Math explanation');
    });

    it('resolves correctAnswerId from answers', () => {
      const result = normalizeQuestion(
        {
          answers: [
            { id: 'a1', text: 'Wrong' },
            { id: 'a2', text: 'Correct' },
          ],
          correctAnswerId: 'a2',
        },
        0
      );
      expect(result.correctAnswerId).toBe('a2');
    });

    it('resolves correctAnswerId from correctOptionIndex', () => {
      const result = normalizeQuestion(
        {
          answers: [
            { id: 'a1', text: 'Wrong' },
            { id: 'a2', text: 'Correct' },
          ],
          correctOptionIndex: 1,
        },
        0
      );
      expect(result.correctAnswerId).toBe('a2');
    });

    it('returns null correctAnswerId if not found', () => {
      const result = normalizeQuestion(
        {
          answers: [{ id: 'a1', text: 'Answer' }],
          correctAnswerId: 'nonexistent',
        },
        0
      );
      expect(result.correctAnswerId).toBeNull();
    });

    it('normalizes revealPolicySource', () => {
      expect(normalizeQuestion({ revealPolicySource: 'inherit' }, 0).revealPolicySource).toBe('inherit');
      expect(normalizeQuestion({ revealPolicySource: 'custom' }, 0).revealPolicySource).toBe('custom');
      expect(normalizeQuestion({ revealPolicySource: 'invalid' }, 0).revealPolicySource).toBeUndefined();
    });

    it('handles legacy successMessage/failureMessage', () => {
      const result = normalizeQuestion(
        {
          successMessage: '  Great job!  ',
          failureMessage: '  Try again  ',
        },
        0
      );
      expect(result.customRightMsg).toBe('Great job!');
      expect(result.customWrongMsg).toBe('Try again');
    });

    it('handles media URLs', () => {
      const result = normalizeQuestion(
        {
          imageUrl: '  https://example.com/image.png  ',
          audioUrl: '  https://example.com/audio.mp3  ',
          videoUrl: '  https://example.com/video.mp4  ',
        },
        0
      );
      expect(result.imageUrl).toBe('https://example.com/image.png');
      expect(result.audioUrl).toBe('https://example.com/audio.mp3');
      expect(result.videoUrl).toBe('https://example.com/video.mp4');
    });
  });

  describe('sanitizeQuestionForWrite', () => {
    const baseQuestion: TestQuestion = {
      id: 'q1',
      questionText: 'Test question',
      answers: [
        { id: 'a1', text: 'Answer 1' },
        { id: 'a2', text: 'Answer 2' },
      ],
      correctAnswerId: 'a1',
      shuffleAnswers: true,
      revealPolicy: { mode: 'after_test' },
    };

    it('sanitizes basic question data', () => {
      const result = sanitizeQuestionForWrite(baseQuestion, 0);
      expect(result.id).toBe('q1');
      expect(result.questionText).toBe('Test question');
      expect(result.correctAnswerId).toBe('a1');
    });

    it('ensures minimum answers', () => {
      const questionWithOneAnswer: TestQuestion = {
        ...baseQuestion,
        answers: [{ id: 'a1', text: 'Only one' }],
      };
      const result = sanitizeQuestionForWrite(questionWithOneAnswer, 0);
      expect(result.answers.length).toBeGreaterThanOrEqual(MIN_QUESTION_ANSWERS);
    });

    it('limits to maximum answers', () => {
      const questionWithManyAnswers: TestQuestion = {
        ...baseQuestion,
        answers: Array.from({ length: 20 }, (_, i) => ({
          id: `a${i}`,
          text: `Answer ${i}`,
        })),
      };
      const result = sanitizeQuestionForWrite(questionWithManyAnswers, 0);
      expect(result.answers.length).toBeLessThanOrEqual(MAX_QUESTION_ANSWERS);
    });

    it('handles duplicate answer IDs', () => {
      const questionWithDuplicates: TestQuestion = {
        ...baseQuestion,
        answers: [
          { id: 'same', text: 'First' },
          { id: 'same', text: 'Second' },
        ],
      };
      const result = sanitizeQuestionForWrite(questionWithDuplicates, 0);
      const ids = result.answers.map((a: { id: string }) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('nullifies correctAnswerId if answer not found', () => {
      const questionWithInvalidCorrect: TestQuestion = {
        ...baseQuestion,
        correctAnswerId: 'nonexistent',
      };
      const result = sanitizeQuestionForWrite(questionWithInvalidCorrect, 0);
      expect(result.correctAnswerId).toBeNull();
    });

    it('sanitizes revealPolicySource', () => {
      const question: TestQuestion = {
        ...baseQuestion,
        revealPolicySource: 'inherit',
      };
      const result = sanitizeQuestionForWrite(question, 0);
      expect(result.revealPolicySource).toBe('inherit');
    });

    it('removes undefined fields', () => {
      const result = sanitizeQuestionForWrite(baseQuestion, 0);
      expect(result).not.toHaveProperty('explanation');
      expect(result).not.toHaveProperty('imageUrl');
    });
  });

  describe('normalizeAppearance', () => {
    it('returns default appearance for invalid input', () => {
      const result1 = normalizeAppearance(null);
      const result2 = normalizeAppearance(undefined);
      const result3 = normalizeAppearance('string');

      // Should return object with default introIcon from mergeAppearance
      expect(result1).toHaveProperty('introIcon');
      expect(result2).toHaveProperty('introIcon');
      expect(result3).toHaveProperty('introIcon');
    });

    it('trims and filters bulletPoints', () => {
      const result = normalizeAppearance({
        bulletPoints: ['  Point 1  ', '', '  ', 'Point 2', 123],
      });
      expect(result.bulletPoints).toEqual(['Point 1', 'Point 2']);
    });

    it('trims introDescription', () => {
      const result = normalizeAppearance({
        introDescription: '  Some description  ',
      });
      expect(result.introDescription).toBe('Some description');
    });

    it('preserves other appearance properties', () => {
      const result = normalizeAppearance({
        introIcon: 'custom-icon',
        badgeLabel: 'Custom Badge',
      });
      expect(result.introIcon).toBe('custom-icon');
      expect(result.badgeLabel).toBe('Custom Badge');
    });
  });

  describe('sanitizeAppearanceForWrite', () => {
    it('returns undefined for undefined input', () => {
      expect(sanitizeAppearanceForWrite(undefined)).toBeUndefined();
    });

    it('removes empty bulletPoints', () => {
      const result = sanitizeAppearanceForWrite({
        bulletPoints: [],
        introIcon: 'test',
      });
      expect(result?.bulletPoints).toBeUndefined();
    });

    it('keeps non-empty bulletPoints', () => {
      const result = sanitizeAppearanceForWrite({
        bulletPoints: ['Point 1'],
        introIcon: 'test',
      });
      expect(result?.bulletPoints).toEqual(['Point 1']);
    });
  });
});

import type { Test } from '../../../types/tests';
import type { TestMatchField, TestSearchResult } from '../types';
import { matchesQuery } from './textMatch';

/**
 * Поиск по тестам. Тесты со status !== 'published' пропускаются.
 *
 * Scoring (каждое поле учитывается один раз):
 *   testTitle 10, question 7, answer 5, explanation 4.
 */
export function searchInTests(tests: readonly Test[], queryWords: string[]): TestSearchResult[] {
  const results: TestSearchResult[] = [];

  for (const test of tests) {
    if (test.status !== 'published') continue;

    const matchedIn: TestMatchField[] = [];
    let score = 0;

    if (matchesQuery(test.title, queryWords)) {
      matchedIn.push('testTitle');
      score += 10;
    }

    for (const question of test.questions) {
      if (matchesQuery(question.questionText, queryWords) && !matchedIn.includes('question')) {
        matchedIn.push('question');
        score += 7;
      }

      for (const answer of question.answers) {
        if (matchesQuery(answer.text, queryWords) && !matchedIn.includes('answer')) {
          matchedIn.push('answer');
          score += 5;
        }
      }

      if (matchesQuery(question.explanation, queryWords) && !matchedIn.includes('explanation')) {
        matchedIn.push('explanation');
        score += 4;
      }
    }

    if (matchedIn.length > 0) {
      results.push({
        type: 'test',
        id: `test-${test.id}`,
        testId: test.id,
        title: test.title,
        course: test.course,
        matchedIn,
        relevanceScore: score,
        icon: test.appearance?.introIcon || test.appearance?.badgeIcon,
      });
    }
  }

  return results;
}

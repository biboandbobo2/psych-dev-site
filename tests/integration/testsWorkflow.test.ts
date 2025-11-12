import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as testResultsModule from '../../src/lib/testResults';
import * as testsModule from '../../src/lib/tests';
import { initializeIntegrationApp, resetIntegrationData } from './helper';

const creatorId = 'integration-creator';

beforeAll(async () => {
  await initializeIntegrationApp();
});

beforeEach(async () => {
  await resetIntegrationData();
});

describe('tests.ts CRUD и prerequisite', () => {
  it('создаёт тесты с prereq и изменяет статус', async () => {
    const firstTitle = 'Интеграционный уровень 1';
    const secondTitle = 'Интеграционный уровень 2';

    const firstTestId = await testsModule.createTest(
      {
        title: firstTitle,
        rubric: 'full-course',
        status: 'draft',
        requiredPercentage: 70,
      },
      creatorId
    );

    const secondTestId = await testsModule.createTest(
      {
        title: secondTitle,
        rubric: 'full-course',
        status: 'draft',
        prerequisiteTestId: firstTestId,
      },
      creatorId
    );

    const secondTest = await testsModule.getTestById(secondTestId);
    expect(secondTest).not.toBeNull();
    expect(secondTest?.prerequisiteTestId).toBe(firstTestId);
    expect(secondTest?.createdBy).toBe(creatorId);

    expect(await testsModule.isTestTitleUnique(secondTitle)).toBe(false);
    expect(await testsModule.isTestTitleUnique(secondTitle, secondTestId)).toBe(true);

    await testsModule.publishTest(firstTestId);
    const published = await testsModule.getTestById(firstTestId);
    expect(published?.status).toBe('published');

    await testsModule.unpublishTest(firstTestId);
    const unpublished = await testsModule.getTestById(firstTestId);
    expect(unpublished?.status).toBe('unpublished');
  });
});

describe('testResults.ts flows', () => {
  it('сохраняет и группирует результаты', async () => {
    const testTitle = 'Интеграционный тест результатов';
    const testId = await testsModule.createTest(
      {
        title: testTitle,
        rubric: 'full-course',
        status: 'draft',
      },
      creatorId
    );

    const now = new Date();
    await testResultsModule.saveTestResult({
      userId: 'integration-student',
      testId,
      testTitle,
      score: 80,
      totalQuestions: 10,
      percentage: 80,
      completedAt: new Date(now.getTime() - 60_000),
      timeSpent: 90,
    });

    await testResultsModule.saveTestResult({
      userId: 'integration-student',
      testId,
      testTitle,
      score: 92,
      totalQuestions: 10,
      percentage: 92,
      completedAt: new Date(now.getTime()),
      timeSpent: 85,
    });

    const results = await testResultsModule.getTestResults('integration-student', testId);
    expect(results).toHaveLength(2);
    expect(results[0].score).toBe(92);

    const grouped = testResultsModule.groupResultsByTest(results);
    const summary = grouped.get(testId);
    expect(summary).not.toBeUndefined();
    expect(summary?.attempts).toBe(2);
    expect(summary?.bestScore).toBe(92);
  });
});

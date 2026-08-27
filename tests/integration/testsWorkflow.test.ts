import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import type { TestQuestion } from '../../src/types/tests';
import * as testResultsModule from '../../src/lib/testResults';
import * as testsModule from '../../src/lib/tests';
import { initializeIntegrationApp, resetIntegrationData } from './helper';

const creatorId = 'integration-creator';

const sampleQuestion: TestQuestion = {
  id: 'q1',
  questionText: 'Вопрос интеграционного теста?',
  answers: [
    { id: 'a1', text: 'Да' },
    { id: 'a2', text: 'Нет' },
  ],
  correctAnswerId: 'a1',
  shuffleAnswers: false,
  revealPolicy: { mode: 'after_test' },
};

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
        course: 'development',
        rubric: 'full-course',
        questionCount: 0,
        status: 'draft',
        requiredPercentage: 70,
        createdBy: creatorId,
      },
      creatorId
    );

    const secondTestId = await testsModule.createTest(
      {
        title: secondTitle,
        course: 'development',
        rubric: 'full-course',
        questionCount: 0,
        status: 'draft',
        prerequisiteTestId: firstTestId,
        createdBy: creatorId,
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

describe('tests.ts: вопросы в subdoc + fallback на legacy-формат', () => {
  it('updateTestQuestions пишет subdoc, parent остаётся без embedded questions', async () => {
    const testId = await testsModule.createTest(
      {
        title: 'Split-формат',
        course: 'development',
        rubric: 'full-course',
        questionCount: 0,
        status: 'published',
        createdBy: creatorId,
      },
      creatorId
    );
    await testsModule.updateTestQuestions(testId, [sampleQuestion]);

    const full = await testsModule.getTestById(testId);
    expect(full?.questions).toHaveLength(1);
    expect(full?.questionCount).toBe(1);

    const parent = await getDoc(doc(db, 'tests', testId));
    expect(parent.data()?.questions).toBeUndefined();
    expect(parent.data()?.questionCount).toBe(1);
    const sub = await getDoc(doc(db, 'tests', testId, 'content', 'questions'));
    expect(sub.exists()).toBe(true);
    expect(sub.data()?.questions).toHaveLength(1);

    const summaries = await testsModule.getPublishedTests();
    expect(summaries.find((t) => t.id === testId)?.questionCount).toBe(1);

    const hydrated = await testsModule.getPublishedTestsWithQuestions();
    expect(hydrated.find((t) => t.id === testId)?.questions).toHaveLength(1);
  });

  it('legacy-документ с embedded questions читается через fallback', async () => {
    const now = Timestamp.now();
    await setDoc(doc(db, 'tests', 'legacy1'), {
      title: 'Legacy-формат',
      course: 'development',
      rubric: 'full-course',
      status: 'published',
      questions: [sampleQuestion],
      createdBy: creatorId,
      createdAt: now,
      updatedAt: now,
    });

    const full = await testsModule.getTestById('legacy1');
    expect(full?.questions).toHaveLength(1);
    expect(full?.questionCount).toBe(1);

    const summaries = await testsModule.getPublishedTests();
    expect(summaries.find((t) => t.id === 'legacy1')?.questionCount).toBe(1);

    const hydrated = await testsModule.getPublishedTestsWithQuestions();
    expect(hydrated.find((t) => t.id === 'legacy1')?.questions).toHaveLength(1);
  });

  it('deleteTest удаляет и parent, и subdoc', async () => {
    const testId = await testsModule.createTest(
      {
        title: 'На удаление',
        course: 'development',
        rubric: 'full-course',
        questionCount: 0,
        status: 'draft',
        createdBy: creatorId,
      },
      creatorId
    );
    await testsModule.updateTestQuestions(testId, [sampleQuestion]);
    await testsModule.deleteTest(testId);

    expect((await getDoc(doc(db, 'tests', testId))).exists()).toBe(false);
    expect((await getDoc(doc(db, 'tests', testId, 'content', 'questions'))).exists()).toBe(false);
  });
});

describe('testResults.ts flows', () => {
  it('сохраняет и группирует результаты', async () => {
    const testTitle = 'Интеграционный тест результатов';
    const testId = await testsModule.createTest(
      {
        title: testTitle,
        course: 'development',
        rubric: 'full-course',
        questionCount: 0,
        status: 'draft',
        createdBy: creatorId,
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

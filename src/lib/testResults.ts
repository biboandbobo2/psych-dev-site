import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TestResult, TestAttemptSummary } from '../types/testResults';

export async function saveTestResult(result: Omit<TestResult, 'id'>): Promise<string> {
  console.log('🔵 [saveTestResult] Начинаем сохранение в Firestore:', result);
  const testResultsRef = collection(db, 'testResults');
  const docRef = await addDoc(testResultsRef, {
    ...result,
    completedAt: Timestamp.fromDate(result.completedAt),
  });
  console.log('✅ [saveTestResult] Сохранено с ID:', docRef.id);
  return docRef.id;
}

export async function getTestResults(userId: string, testId: string): Promise<TestResult[]> {
  console.log('🔵 [getTestResults] Загружаем результаты из Firestore для:', { userId, testId });
  const testResultsRef = collection(db, 'testResults');
  const q = query(
    testResultsRef,
    where('userId', '==', userId),
    where('testId', '==', testId),
    orderBy('completedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  console.log('🔵 [getTestResults] Найдено документов:', querySnapshot.size);

  const results = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    console.log('🔵 [getTestResults] Документ:', doc.id, data);
    return {
      id: doc.id,
      userId: data.userId,
      testId: data.testId,
      testTitle: data.testTitle,
      score: data.score,
      totalQuestions: data.totalQuestions,
      percentage: data.percentage,
      completedAt: data.completedAt.toDate(),
      timeSpent: data.timeSpent,
    } as TestResult;
  });

  console.log('✅ [getTestResults] Возвращаем результаты:', results);
  return results;
}

export async function getAllTestResults(userId: string): Promise<TestResult[]> {
  const testResultsRef = collection(db, 'testResults');
  const q = query(
    testResultsRef,
    where('userId', '==', userId),
    orderBy('completedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      testId: data.testId,
      testTitle: data.testTitle,
      score: data.score,
      totalQuestions: data.totalQuestions,
      percentage: data.percentage,
      completedAt: data.completedAt.toDate(),
      timeSpent: data.timeSpent,
    } as TestResult;
  });
}

export function groupResultsByTest(results: TestResult[]): Map<string, TestAttemptSummary> {
  const grouped = new Map<string, TestAttemptSummary>();

  results.forEach((result) => {
    const existing = grouped.get(result.testId);

    if (!existing) {
      grouped.set(result.testId, {
        testId: result.testId,
        testTitle: result.testTitle,
        attempts: 1,
        bestScore: result.score,
        bestPercentage: result.percentage,
        lastAttemptDate: result.completedAt,
        averageScore: result.score,
      });
    } else {
      const totalScore = existing.averageScore * existing.attempts + result.score;
      existing.attempts += 1;
      existing.averageScore = totalScore / existing.attempts;

      if (result.score > existing.bestScore) {
        existing.bestScore = result.score;
        existing.bestPercentage = result.percentage;
      }

      if (result.completedAt > existing.lastAttemptDate) {
        existing.lastAttemptDate = result.completedAt;
      }
    }
  });

  return grouped;
}

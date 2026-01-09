import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Test, TestQuestion, CreateTestData, UpdateTestData } from '../types/tests';
import { removeUndefined } from '../utils/removeUndefined';
import { debugError, debugLog } from '../lib/debug';
import {
  normalizeAppearance,
  sanitizeAppearanceForWrite,
  normalizeRevealPolicy,
  sanitizeRevealPolicyForWrite,
  normalizeQuestion,
  sanitizeQuestionForWrite,
} from './testsNormalization';

const TESTS_COLLECTION = 'tests';

/**
 * Преобразовать данные Firestore в объект Test
 */
function firestoreToTest(id: string, data: any): Test {
  // Безопасное преобразование Timestamp в Date
  const toDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) return timestamp;
    return new Date();
  };

  const normalizedQuestions: TestQuestion[] = Array.isArray(data.questions)
    ? data.questions.map((question: any, index: number) => normalizeQuestion(question, index))
    : [];

  const questionCount = normalizedQuestions.length;

  const defaultRevealPolicy =
    data.defaultRevealPolicy !== undefined
      ? normalizeRevealPolicy(data.defaultRevealPolicy)
      : undefined;

  return {
    id,
    title: data.title,
    course: data.course || 'development',
    rubric: data.rubric,
    prerequisiteTestId: data.prerequisiteTestId,
    questionCount,
    questions: normalizedQuestions,
    status: data.status,
    requiredPercentage: data.requiredPercentage ?? 70,
    defaultRevealPolicy,
    appearance: normalizeAppearance(data.appearance),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: data.createdBy,
  };
}

/**
 * Получить все тесты
 */
export async function getAllTests(): Promise<Test[]> {
  debugLog('🔵 [getAllTests] Загружаем все тесты...');
  const testsRef = collection(db, TESTS_COLLECTION);
  const q = query(testsRef, orderBy('updatedAt', 'desc'));

  const snapshot = await getDocs(q);
  const tests = snapshot.docs.map(doc => firestoreToTest(doc.id, doc.data()));

  debugLog('✅ [getAllTests] Загружено тестов:', tests.length);
  return tests;
}

/**
 * Получить только опубликованные тесты
 */
export async function getPublishedTests(): Promise<Test[]> {
  debugLog('🔵 [getPublishedTests] Загружаем опубликованные тесты...');
  const testsRef = collection(db, TESTS_COLLECTION);
  const q = query(
    testsRef,
    where('status', '==', 'published'),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const tests = snapshot.docs.map(doc => firestoreToTest(doc.id, doc.data()));

  debugLog('✅ [getPublishedTests] Загружено опубликованных тестов:', tests.length);
  return tests;
}

/**
 * Получить тест по ID
 */
export async function getTestById(testId: string): Promise<Test | null> {
  debugLog('🔵 [getTestById] Загружаем тест:', testId);
  const testRef = doc(db, TESTS_COLLECTION, testId);
  const snapshot = await getDoc(testRef);

  if (!snapshot.exists()) {
    debugError('❌ [getTestById] Тест не найден');
    return null;
  }

  const test = firestoreToTest(snapshot.id, snapshot.data());
  debugLog('✅ [getTestById] Тест загружен:', test.title);
  return test;
}

/**
 * Создать новый тест
 */
export async function createTest(
  testData: CreateTestData,
  userId: string
): Promise<string> {
  debugLog('🔵 [createTest] Создаём новый тест:', testData.title);

  const testsRef = collection(db, TESTS_COLLECTION);
  const { appearance, defaultRevealPolicy, ...rest } = testData;

  const data = removeUndefined({
    ...rest,
    questions: [], // Изначально пустой массив вопросов
    requiredPercentage: testData.requiredPercentage ?? 70,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    appearance: sanitizeAppearanceForWrite(appearance),
    defaultRevealPolicy: defaultRevealPolicy
      ? sanitizeRevealPolicyForWrite(defaultRevealPolicy)
      : undefined,
  });

  const docRef = await addDoc(testsRef, data);
  debugLog('✅ [createTest] Тест создан с ID:', docRef.id);
  return docRef.id;
}

/**
 * Обновить существующий тест
 */
export async function updateTest(
  testId: string,
  updates: UpdateTestData
): Promise<void> {
  debugLog('🔵 [updateTest] Обновляем тест:', testId);

  const testRef = doc(db, TESTS_COLLECTION, testId);
  const { appearance, defaultRevealPolicy, ...rest } = updates;

  const data = removeUndefined({
    ...rest,
    appearance: sanitizeAppearanceForWrite(appearance),
    defaultRevealPolicy:
      defaultRevealPolicy === null
        ? null
        : defaultRevealPolicy
        ? sanitizeRevealPolicyForWrite(defaultRevealPolicy)
        : undefined,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(testRef, data);
  debugLog('✅ [updateTest] Тест обновлён');
}

/**
 * Добавить или обновить вопрос в тесте
 */
export async function updateTestQuestions(
  testId: string,
  questions: TestQuestion[]
): Promise<void> {
  debugLog('🔵 [updateTestQuestions] Обновляем вопросы теста:', testId);

  const testRef = doc(db, TESTS_COLLECTION, testId);

  await updateDoc(testRef, {
    questions: questions.map((question, index) => sanitizeQuestionForWrite(question, index)),
    questionCount: questions.length,
    updatedAt: serverTimestamp(),
  });

  debugLog('✅ [updateTestQuestions] Вопросы обновлены, количество:', questions.length);
}

/**
 * Удалить тест
 */
export async function deleteTest(testId: string): Promise<void> {
  debugLog('🔵 [deleteTest] Удаляем тест:', testId);

  const testRef = doc(db, TESTS_COLLECTION, testId);
  await deleteDoc(testRef);

  debugLog('✅ [deleteTest] Тест удалён');
}

/**
 * Опубликовать тест (изменить статус на 'published')
 */
export async function publishTest(testId: string): Promise<void> {
  debugLog('🔵 [publishTest] Публикуем тест:', testId);

  await updateTest(testId, { status: 'published' });

  debugLog('✅ [publishTest] Тест опубликован');
}

/**
 * Снять тест с публикации (пометить как "unpublished")
 */
export async function unpublishTest(testId: string): Promise<void> {
  debugLog('🔵 [unpublishTest] Снимаем тест с публикации:', testId);

  await updateTest(testId, { status: 'unpublished' });

  debugLog('✅ [unpublishTest] Тест снят с публикации');
}

/**
 * Проверить, существует ли тест с таким названием
 */
export async function isTestTitleUnique(title: string, excludeTestId?: string): Promise<boolean> {
  debugLog('🔵 [isTestTitleUnique] Проверяем уникальность:', title);

  const testsRef = collection(db, TESTS_COLLECTION);
  const normalizedTitle = title.trim().toLowerCase();

  const snapshot = await getDocs(testsRef);
  const tests = snapshot.docs.map(doc => ({
    id: doc.id,
    title: doc.data().title,
  }));

  // Проверяем, есть ли другой тест с таким же названием
  const duplicate = tests.find(
    (test) =>
      test.title.trim().toLowerCase() === normalizedTitle &&
      test.id !== excludeTestId
  );

  const isUnique = !duplicate;
  debugLog(isUnique ? '✅ [isTestTitleUnique] Название уникально' : '❌ [isTestTitleUnique] Название уже используется');

  return isUnique;
}

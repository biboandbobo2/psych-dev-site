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
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Test,
  TestQuestion,
  CreateTestData,
  UpdateTestData,
  TestAppearance,
} from '../types/tests';
import { removeUndefined } from '../pages/timeline/utils';
import { mergeAppearance } from '../utils/testAppearance';

const TESTS_COLLECTION = 'tests';

function normalizeAppearance(raw?: any): TestAppearance {
  if (!raw || typeof raw !== 'object') {
    return mergeAppearance(undefined);
  }

  const incoming: TestAppearance = { ...raw };
  if (Array.isArray(raw?.bulletPoints)) {
    incoming.bulletPoints = raw.bulletPoints
      .filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean);
  }

  if (typeof incoming.introDescription === 'string') {
    incoming.introDescription = incoming.introDescription.trim();
  }

  return mergeAppearance(incoming);
}

function sanitizeAppearanceForWrite(appearance?: TestAppearance) {
  if (!appearance) return undefined;
  const normalized = normalizeAppearance(appearance);
  const payload: TestAppearance = {
    ...normalized,
    bulletPoints:
      normalized.bulletPoints && normalized.bulletPoints.length > 0
        ? normalized.bulletPoints
        : undefined,
  };
  return removeUndefined(payload);
}

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

  return {
    id,
    title: data.title,
    rubric: data.rubric,
    prerequisiteTestId: data.prerequisiteTestId,
    questionCount: data.questionCount,
    questions: data.questions || [],
    status: data.status,
    requiredPercentage: data.requiredPercentage ?? 70,
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
  console.log('🔵 [getAllTests] Загружаем все тесты...');
  const testsRef = collection(db, TESTS_COLLECTION);
  const q = query(testsRef, orderBy('updatedAt', 'desc'));

  const snapshot = await getDocs(q);
  const tests = snapshot.docs.map(doc => firestoreToTest(doc.id, doc.data()));

  console.log('✅ [getAllTests] Загружено тестов:', tests.length);
  return tests;
}

/**
 * Получить только опубликованные тесты
 */
export async function getPublishedTests(): Promise<Test[]> {
  console.log('🔵 [getPublishedTests] Загружаем опубликованные тесты...');
  const testsRef = collection(db, TESTS_COLLECTION);
  const q = query(
    testsRef,
    where('status', '==', 'published'),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const tests = snapshot.docs.map(doc => firestoreToTest(doc.id, doc.data()));

  console.log('✅ [getPublishedTests] Загружено опубликованных тестов:', tests.length);
  return tests;
}

/**
 * Получить тест по ID
 */
export async function getTestById(testId: string): Promise<Test | null> {
  console.log('🔵 [getTestById] Загружаем тест:', testId);
  const testRef = doc(db, TESTS_COLLECTION, testId);
  const snapshot = await getDoc(testRef);

  if (!snapshot.exists()) {
    console.log('❌ [getTestById] Тест не найден');
    return null;
  }

  const test = firestoreToTest(snapshot.id, snapshot.data());
  console.log('✅ [getTestById] Тест загружен:', test.title);
  return test;
}

/**
 * Создать новый тест
 */
export async function createTest(
  testData: CreateTestData,
  userId: string
): Promise<string> {
  console.log('🔵 [createTest] Создаём новый тест:', testData.title);

  const testsRef = collection(db, TESTS_COLLECTION);
  const { appearance, ...rest } = testData;

  const data = removeUndefined({
    ...rest,
    questions: [], // Изначально пустой массив вопросов
    requiredPercentage: testData.requiredPercentage ?? 70,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    appearance: sanitizeAppearanceForWrite(appearance),
  });

  const docRef = await addDoc(testsRef, data);
  console.log('✅ [createTest] Тест создан с ID:', docRef.id);
  return docRef.id;
}

/**
 * Обновить существующий тест
 */
export async function updateTest(
  testId: string,
  updates: UpdateTestData
): Promise<void> {
  console.log('🔵 [updateTest] Обновляем тест:', testId);

  const testRef = doc(db, TESTS_COLLECTION, testId);
  const { appearance, ...rest } = updates;

  const data = removeUndefined({
    ...rest,
    appearance: sanitizeAppearanceForWrite(appearance),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(testRef, data);
  console.log('✅ [updateTest] Тест обновлён');
}

/**
 * Добавить или обновить вопрос в тесте
 */
export async function updateTestQuestions(
  testId: string,
  questions: TestQuestion[]
): Promise<void> {
  console.log('🔵 [updateTestQuestions] Обновляем вопросы теста:', testId);

  const testRef = doc(db, TESTS_COLLECTION, testId);

  await updateDoc(testRef, {
    questions: questions.map(q => removeUndefined(q)),
    questionCount: questions.length,
    updatedAt: serverTimestamp(),
  });

  console.log('✅ [updateTestQuestions] Вопросы обновлены, количество:', questions.length);
}

/**
 * Удалить тест
 */
export async function deleteTest(testId: string): Promise<void> {
  console.log('🔵 [deleteTest] Удаляем тест:', testId);

  const testRef = doc(db, TESTS_COLLECTION, testId);
  await deleteDoc(testRef);

  console.log('✅ [deleteTest] Тест удалён');
}

/**
 * Опубликовать тест (изменить статус на 'published')
 */
export async function publishTest(testId: string): Promise<void> {
  console.log('🔵 [publishTest] Публикуем тест:', testId);

  await updateTest(testId, { status: 'published' });

  console.log('✅ [publishTest] Тест опубликован');
}

/**
 * Снять тест с публикации (пометить как "unpublished")
 */
export async function unpublishTest(testId: string): Promise<void> {
  console.log('🔵 [unpublishTest] Снимаем тест с публикации:', testId);

  await updateTest(testId, { status: 'unpublished' });

  console.log('✅ [unpublishTest] Тест снят с публикации');
}

/**
 * Проверить, существует ли тест с таким названием
 */
export async function isTestTitleUnique(title: string, excludeTestId?: string): Promise<boolean> {
  console.log('🔵 [isTestTitleUnique] Проверяем уникальность:', title);

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
  console.log(isUnique ? '✅ [isTestTitleUnique] Название уникально' : '❌ [isTestTitleUnique] Название уже используется');

  return isUnique;
}

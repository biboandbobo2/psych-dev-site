import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Test,
  TestSummary,
  TestQuestion,
  CreateTestData,
  UpdateTestData,
} from '../types/tests';
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
// Вопросы живут отдельно от метаданных: tests/{id}/content/questions.
// Документ tests/{id} лёгкий, списки не тянут вопросы (раньше — ~4 МБ на выборку).
const CONTENT_SUBCOLLECTION = 'content';
const QUESTIONS_DOC_ID = 'questions';

function questionsDocRef(testId: string) {
  return doc(db, TESTS_COLLECTION, testId, CONTENT_SUBCOLLECTION, QUESTIONS_DOC_ID);
}

/**
 * Преобразовать данные Firestore в метаданные теста (без вопросов)
 */
function firestoreToTestSummary(id: string, data: any): TestSummary {
  // Безопасное преобразование Timestamp в Date
  const toDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) return timestamp;
    return new Date();
  };

  // Fallback на embedded questions — документы до миграции в subdoc
  const questionCount =
    typeof data.questionCount === 'number'
      ? data.questionCount
      : Array.isArray(data.questions)
        ? data.questions.length
        : 0;

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
    status: data.status,
    requiredPercentage: data.requiredPercentage ?? 70,
    defaultRevealPolicy,
    appearance: normalizeAppearance(data.appearance),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: data.createdBy,
  };
}

function normalizeQuestions(raw: unknown): TestQuestion[] {
  return Array.isArray(raw)
    ? raw.map((question: any, index: number) => normalizeQuestion(question, index))
    : [];
}

/**
 * Собрать полный тест: метаданные + вопросы из subdoc,
 * с fallback на embedded questions (документы до миграции).
 */
function buildFullTest(id: string, data: any, contentData: any | undefined): Test {
  const questions =
    contentData !== undefined
      ? normalizeQuestions(contentData?.questions)
      : normalizeQuestions(data.questions);
  const summary = firestoreToTestSummary(id, data);
  return { ...summary, questionCount: questions.length, questions };
}

/**
 * Получить все тесты (только метаданные)
 */
export async function getAllTests(): Promise<TestSummary[]> {
  debugLog('🔵 [getAllTests] Загружаем все тесты...');
  const testsRef = collection(db, TESTS_COLLECTION);
  const q = query(testsRef, orderBy('updatedAt', 'desc'));

  const snapshot = await getDocs(q);
  const tests = snapshot.docs.map(doc => firestoreToTestSummary(doc.id, doc.data()));

  debugLog('✅ [getAllTests] Загружено тестов:', tests.length);
  return tests;
}

/**
 * Получить только опубликованные тесты (только метаданные)
 */
export async function getPublishedTests(): Promise<TestSummary[]> {
  debugLog('🔵 [getPublishedTests] Загружаем опубликованные тесты...');
  const testsRef = collection(db, TESTS_COLLECTION);
  const q = query(
    testsRef,
    where('status', '==', 'published'),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const tests = snapshot.docs.map(doc => firestoreToTestSummary(doc.id, doc.data()));

  debugLog('✅ [getPublishedTests] Загружено опубликованных тестов:', tests.length);
  return tests;
}

/**
 * Получить опубликованные тесты с вопросами (для поиска по контенту).
 * Дорогая операция — использовать только там, где нужны тексты вопросов.
 */
export async function getPublishedTestsWithQuestions(): Promise<Test[]> {
  debugLog('🔵 [getPublishedTestsWithQuestions] Загружаем тесты с вопросами...');
  const testsRef = collection(db, TESTS_COLLECTION);
  const q = query(testsRef, where('status', '==', 'published'), orderBy('updatedAt', 'desc'));

  const snapshot = await getDocs(q);
  const tests = await Promise.all(
    snapshot.docs.map(async (testDoc) => {
      const data = testDoc.data();
      // Документы до миграции хранят вопросы embedded — subdoc не запрашиваем
      if (Array.isArray(data.questions)) {
        return buildFullTest(testDoc.id, data, undefined);
      }
      const contentSnapshot = await getDoc(questionsDocRef(testDoc.id));
      return buildFullTest(
        testDoc.id,
        data,
        contentSnapshot.exists() ? contentSnapshot.data() : { questions: [] }
      );
    })
  );

  debugLog('✅ [getPublishedTestsWithQuestions] Загружено тестов:', tests.length);
  return tests;
}

/**
 * Получить тест по ID (метаданные + вопросы)
 */
export async function getTestById(testId: string): Promise<Test | null> {
  debugLog('🔵 [getTestById] Загружаем тест:', testId);
  const testRef = doc(db, TESTS_COLLECTION, testId);
  const [snapshot, contentSnapshot] = await Promise.all([
    getDoc(testRef),
    getDoc(questionsDocRef(testId)),
  ]);

  if (!snapshot.exists()) {
    debugError('❌ [getTestById] Тест не найден');
    return null;
  }

  const test = buildFullTest(
    snapshot.id,
    snapshot.data(),
    contentSnapshot.exists() ? contentSnapshot.data() : undefined
  );
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

  await setDoc(questionsDocRef(testId), {
    questions: questions.map((question, index) => sanitizeQuestionForWrite(question, index)),
  });
  await updateDoc(testRef, {
    // Подчищаем embedded questions у документов до миграции
    questions: deleteField(),
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
  await deleteDoc(questionsDocRef(testId));
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

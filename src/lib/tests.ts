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
  RevealPolicy,
  QuestionAnswer,
  QuestionRevealPolicySource,
  TestResource,
} from '../types/tests';
import {
  DEFAULT_REVEAL_POLICY,
  MIN_QUESTION_ANSWERS,
  MAX_QUESTION_ANSWERS,
  MAX_REVEAL_ATTEMPTS,
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

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeResourcesForWrite(resources?: TestResource[]) {
  if (!Array.isArray(resources)) return undefined;

  const normalized = resources
    .map((resource) => ({
      title: trimOrUndefined(resource?.title) ?? '',
      url: trimOrUndefined(resource?.url) ?? '',
    }))
    .filter((resource) => resource.title !== '' || resource.url !== '');

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeResources(raw: any): TestResource[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const normalized = raw
    .map((resource: any) => ({
      title: trimOrUndefined(resource?.title) ?? '',
      url: trimOrUndefined(resource?.url) ?? '',
    }))
    .filter((resource) => resource.title !== '' || resource.url !== '');

  return normalized.length > 0 ? normalized : undefined;
}

function clampRevealAttempts(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return 1;
  }
  return Math.min(Math.max(numeric, 1), MAX_REVEAL_ATTEMPTS);
}

function normalizeRevealPolicy(raw: any): RevealPolicy {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_REVEAL_POLICY;
  }

  const mode = raw.mode;
  switch (mode) {
    case 'never':
      return { mode: 'never' };
    case 'after_test':
      return { mode: 'after_test' };
    case 'immediately':
      return { mode: 'immediately' };
    case 'after_attempts':
      return { mode: 'after_attempts', attempts: clampRevealAttempts(raw.attempts) };
    default:
      return DEFAULT_REVEAL_POLICY;
  }
}

function sanitizeRevealPolicyForWrite(policy: RevealPolicy | undefined): RevealPolicy {
  if (!policy) {
    return DEFAULT_REVEAL_POLICY;
  }

  if (policy.mode === 'after_attempts') {
    return { mode: 'after_attempts', attempts: clampRevealAttempts(policy.attempts) };
  }

  if (policy.mode === 'never' || policy.mode === 'after_test' || policy.mode === 'immediately') {
    return { mode: policy.mode };
  }

  return DEFAULT_REVEAL_POLICY;
}

function ensureQuestionId(rawId: unknown, fallbackIndex: number): string {
  if (typeof rawId === 'string' && rawId.trim().length > 0) {
    return rawId.trim();
  }
  return `question-${fallbackIndex + 1}`;
}

function normalizeAnswers(raw: any, questionId: string): QuestionAnswer[] {
  let answers: QuestionAnswer[] = [];

  if (Array.isArray(raw?.answers)) {
    answers = raw.answers.slice(0, MAX_QUESTION_ANSWERS).map((answer: any, index: number) => ({
      id:
        typeof answer?.id === 'string' && answer.id.trim().length > 0
          ? answer.id.trim()
          : `${questionId}-answer-${index + 1}`,
      text: typeof answer?.text === 'string' ? answer.text : '',
    }));
  }

  if (answers.length < MIN_QUESTION_ANSWERS && Array.isArray(raw?.options)) {
    answers = raw.options.slice(0, MAX_QUESTION_ANSWERS).map((option: any, index: number) => ({
      id: `${questionId}-answer-${index + 1}`,
      text: typeof option === 'string' ? option : '',
    }));
  }

  if (answers.length === 0) {
    const defaultCount = Math.max(4, MIN_QUESTION_ANSWERS);
    answers = Array.from({ length: defaultCount }, (_, index) => ({
      id: `${questionId}-answer-${index + 1}`,
      text: '',
    }));
  }

  const seen = new Set<string>();
  const normalized = answers.slice(0, MAX_QUESTION_ANSWERS).map((answer, index) => {
    let id = typeof answer.id === 'string' ? answer.id.trim() : '';
    if (!id || seen.has(id)) {
      id = `${questionId}-answer-${index + 1}`;
      let counter = 1;
      while (seen.has(id)) {
        counter += 1;
        id = `${questionId}-answer-${index + 1}-${counter}`;
      }
    }
    seen.add(id);
    return {
      id,
      text: typeof answer.text === 'string' ? answer.text : '',
    };
  });

  while (normalized.length < MIN_QUESTION_ANSWERS) {
    const index = normalized.length;
    normalized.push({
      id: `${questionId}-answer-${index + 1}`,
      text: '',
    });
  }

  return normalized;
}

function normalizeQuestion(raw: any, index: number): TestQuestion {
  const questionId = ensureQuestionId(raw?.id, index);
  const answers = normalizeAnswers(raw, questionId);

  const revealPolicySource: QuestionRevealPolicySource | undefined =
    raw?.revealPolicySource === 'inherit'
      ? 'inherit'
      : raw?.revealPolicySource === 'custom'
      ? 'custom'
      : undefined;

  let correctAnswerId: string | null = null;
  if (typeof raw?.correctAnswerId === 'string') {
    correctAnswerId = answers.find((answer) => answer.id === raw.correctAnswerId)?.id ?? null;
  }

  if (
    correctAnswerId === null &&
    Number.isInteger(raw?.correctOptionIndex) &&
    raw.correctOptionIndex >= 0 &&
    raw.correctOptionIndex < answers.length
  ) {
    correctAnswerId = answers[raw.correctOptionIndex].id;
  }

  return {
    id: questionId,
    questionText: typeof raw?.questionText === 'string' ? raw.questionText : '',
    answers,
    correctAnswerId,
    shuffleAnswers: typeof raw?.shuffleAnswers === 'boolean' ? raw.shuffleAnswers : true,
    revealPolicy: normalizeRevealPolicy(raw?.revealPolicy),
    revealPolicySource,
    explanation: trimOrUndefined(raw?.explanation),
    customRightMsg: trimOrUndefined(raw?.customRightMsg ?? raw?.successMessage),
    customWrongMsg: trimOrUndefined(raw?.customWrongMsg ?? raw?.failureMessage),
    resourcesRight: normalizeResources(raw?.resourcesRight ?? raw?.successResources),
    resourcesWrong: normalizeResources(raw?.resourcesWrong ?? raw?.failureResources),
    // Медиа-файлы
    imageUrl: trimOrUndefined(raw?.imageUrl),
    audioUrl: trimOrUndefined(raw?.audioUrl),
    videoUrl: trimOrUndefined(raw?.videoUrl),
  };
}

function sanitizeQuestionForWrite(question: TestQuestion, index: number) {
  const questionId = ensureQuestionId(question.id, index);

  const answers = question.answers
    .slice(0, MAX_QUESTION_ANSWERS)
    .map((answer, answerIndex) => {
      const fallbackId = `${questionId}-answer-${answerIndex + 1}`;
      const baseId =
        typeof answer?.id === 'string' && answer.id.trim().length > 0
          ? answer.id.trim()
          : fallbackId;
      return {
        id: baseId,
        text: typeof answer?.text === 'string' ? answer.text : '',
      };
    });

  while (answers.length < MIN_QUESTION_ANSWERS) {
    const idx = answers.length;
    answers.push({
      id: `${questionId}-answer-${idx + 1}`,
      text: '',
    });
  }

  const uniqueIds = new Set<string>();
  answers.forEach((answer, answerIndex) => {
    let candidateId = answer.id;
    if (!candidateId || uniqueIds.has(candidateId)) {
      candidateId = `${questionId}-answer-${answerIndex + 1}`;
      let counter = 1;
      while (uniqueIds.has(candidateId)) {
        counter += 1;
        candidateId = `${questionId}-answer-${answerIndex + 1}-${counter}`;
      }
      answer.id = candidateId;
    }
    uniqueIds.add(answer.id);
  });

  const validCorrectAnswerId =
    question.correctAnswerId && answers.some((answer) => answer.id === question.correctAnswerId)
      ? question.correctAnswerId
      : null;

  const revealPolicySource =
    question.revealPolicySource === 'inherit' || question.revealPolicySource === 'custom'
      ? question.revealPolicySource
      : undefined;

  return removeUndefined({
    id: questionId,
    questionText: question.questionText,
    answers,
    correctAnswerId: validCorrectAnswerId,
    shuffleAnswers: question.shuffleAnswers,
    revealPolicy: sanitizeRevealPolicyForWrite(question.revealPolicy),
    revealPolicySource,
    explanation: trimOrUndefined(question.explanation),
    customRightMsg: trimOrUndefined(question.customRightMsg),
    customWrongMsg: trimOrUndefined(question.customWrongMsg),
    resourcesRight: sanitizeResourcesForWrite(question.resourcesRight),
    resourcesWrong: sanitizeResourcesForWrite(question.resourcesWrong),
    // Медиа-файлы
    imageUrl: trimOrUndefined(question.imageUrl),
    audioUrl: trimOrUndefined(question.audioUrl),
    videoUrl: trimOrUndefined(question.videoUrl),
  });
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
    questions: questions.map((question, index) => sanitizeQuestionForWrite(question, index)),
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

/**
 * Normalization and sanitization utilities for test data
 */
import type {
  TestQuestion,
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
import { removeUndefined } from '../utils/removeUndefined';
import { mergeAppearance } from '../utils/testAppearance';

/**
 * Normalize appearance data from Firestore
 */
export function normalizeAppearance(raw?: any): TestAppearance {
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

/**
 * Sanitize appearance for Firestore write
 */
export function sanitizeAppearanceForWrite(appearance?: TestAppearance) {
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
 * Trim string or return undefined if empty
 */
export function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Sanitize resources array for Firestore write
 */
export function sanitizeResourcesForWrite(resources?: TestResource[]) {
  if (!Array.isArray(resources)) return undefined;

  const normalized = resources
    .map((resource) => ({
      title: trimOrUndefined(resource?.title) ?? '',
      url: trimOrUndefined(resource?.url) ?? '',
    }))
    .filter((resource) => resource.title !== '' || resource.url !== '');

  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Normalize resources array from Firestore
 */
export function normalizeResources(raw: any): TestResource[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const normalized = raw
    .map((resource: any) => ({
      title: trimOrUndefined(resource?.title) ?? '',
      url: trimOrUndefined(resource?.url) ?? '',
    }))
    .filter((resource) => resource.title !== '' || resource.url !== '');

  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Clamp reveal attempts to valid range
 */
export function clampRevealAttempts(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return 1;
  }
  return Math.min(Math.max(numeric, 1), MAX_REVEAL_ATTEMPTS);
}

/**
 * Normalize reveal policy from Firestore
 */
export function normalizeRevealPolicy(raw: any): RevealPolicy {
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

/**
 * Sanitize reveal policy for Firestore write
 */
export function sanitizeRevealPolicyForWrite(policy: RevealPolicy | undefined): RevealPolicy {
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

/**
 * Ensure question has a valid ID
 */
export function ensureQuestionId(rawId: unknown, fallbackIndex: number): string {
  if (typeof rawId === 'string' && rawId.trim().length > 0) {
    return rawId.trim();
  }
  return `question-${fallbackIndex + 1}`;
}

/**
 * Normalize answers array from Firestore
 */
export function normalizeAnswers(raw: any, questionId: string): QuestionAnswer[] {
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

/**
 * Normalize a single question from Firestore
 */
export function normalizeQuestion(raw: any, index: number): TestQuestion {
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

/**
 * Sanitize question for Firestore write
 */
export function sanitizeQuestionForWrite(question: TestQuestion, index: number) {
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

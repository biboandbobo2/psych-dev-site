import { buildFactCandidateKey } from './timelineBiographyFacts.js';
import {
  buildEventFactKey,
  buildHeuristicLabel,
  isRawSentenceLabel,
  normalizeSphere,
  sanitizeTimelineEventPlan,
} from './timelineBiographyHeuristics.js';
import type {
  BiographyFactCandidate,
  BiographyLintIssue,
  BiographyTimelineBranchPlan,
  BiographyTimelineEventPlan,
  BiographyTimelinePlan,
} from './timelineBiographyTypes.js';

const GENERIC_LABEL_PATTERN =
  /^(?:учёба|обучение|публикация|новая публикация|новый карьерный этап|карьерный этап|ссылка|переезд|важное событие|формирующее детство)$/i;

function isGenericLabel(label: string) {
  return GENERIC_LABEL_PATTERN.test(label.trim());
}

function isTruncatedLabel(label: string) {
  return label.includes('«') && !label.includes('»');
}

function buildApproximateFactNote(fact: BiographyFactCandidate | undefined) {
  if (!fact) return '';
  if (Number.isFinite(fact.ageMin) && Number.isFinite(fact.ageMax)) {
    const minAge = Number(fact.ageMin);
    const maxAge = Number(fact.ageMax);
    return minAge === maxAge
      ? `Возраст примерный: около ${minAge} лет, точной даты в статье нет.`
      : `Возраст примерный: ${minAge}-${maxAge} лет, точной даты в статье нет.`;
  }
  if (fact.timePrecision === 'approximate') {
    return 'Возраст примерный, точной даты в статье нет.';
  }
  if (fact.timePrecision === 'inferred') {
    return 'Возраст определён по контексту статьи.';
  }
  return '';
}

type FactsIndex = {
  all: BiographyFactCandidate[];
  byAge: Map<number, BiographyFactCandidate[]>;
};

function isBirthLikeEvent(event: BiographyTimelineEventPlan) {
  return event.age <= 0 || /(рождени|родил)/i.test(`${event.label} ${event.notes ?? ''}`);
}

function scoreFactCandidateForEvent(event: BiographyTimelineEventPlan, fact: BiographyFactCandidate) {
  const age = Number.isFinite(fact.age) ? Number(fact.age) : undefined;
  const distance = Number.isFinite(age) ? Math.abs(Number(age) - Number(event.age)) : 3;
  const genericPenalty = isGenericLabel(fact.labelHint) ? -3 : 0;
  const importanceScore = fact.importance === 'high' ? 3 : fact.importance === 'medium' ? 2 : 1;
  const confidenceScore = fact.confidence === 'high' ? 3 : fact.confidence === 'medium' ? 2 : 1;
  const exactRangeBonus =
    Number.isFinite(fact.ageMin) && Number.isFinite(fact.ageMax) && event.age >= Number(fact.ageMin) && event.age <= Number(fact.ageMax)
      ? 2
      : 0;
  return importanceScore + confidenceScore + exactRangeBonus + genericPenalty - distance;
}

function collectMatchingFacts(event: BiographyTimelineEventPlan, factsIndex: FactsIndex) {
  const roundedAge = Math.round(event.age);
  const pool = new Map<string, BiographyFactCandidate>();
  const candidateFacts = [
    ...(factsIndex.byAge.get(roundedAge) ?? []),
    ...(factsIndex.byAge.get(roundedAge - 1) ?? []),
    ...(factsIndex.byAge.get(roundedAge + 1) ?? []),
    ...(factsIndex.byAge.get(roundedAge - 2) ?? []),
    ...(factsIndex.byAge.get(roundedAge + 2) ?? []),
    ...factsIndex.all.filter(
      (fact) =>
        Number.isFinite(fact.ageMin) &&
        Number.isFinite(fact.ageMax) &&
        event.age >= Number(fact.ageMin) &&
        event.age <= Number(fact.ageMax)
    ),
  ];

  for (const fact of candidateFacts) {
    pool.set(buildFactCandidateKey(fact), fact);
  }

  return [...pool.values()].sort((a, b) => scoreFactCandidateForEvent(event, b) - scoreFactCandidateForEvent(event, a));
}

function buildNotesFallback(event: BiographyTimelineEventPlan, factsIndex: FactsIndex) {
  if (event.notes?.trim()) return event.notes.trim();

  const matchingFact = collectMatchingFacts(event, factsIndex).find((fact) => {
    const normalizedLabel = event.label.toLowerCase();
    return fact.labelHint.toLowerCase().includes(normalizedLabel) || fact.evidence.toLowerCase().includes(normalizedLabel);
  }) ?? collectMatchingFacts(event, factsIndex)[0];

  const approximateNote = buildApproximateFactNote(matchingFact);
  return [approximateNote, matchingFact?.evidence?.trim() || event.label].filter(Boolean).join(' ');
}

function buildLabelFromFacts(event: BiographyTimelineEventPlan, factsIndex: FactsIndex) {
  return collectMatchingFacts(event, factsIndex)
    .map((fact) => fact.labelHint.trim())
    .find((label) => label && !isGenericLabel(label) && !isTruncatedLabel(label) && !isRawSentenceLabel(label));
}

function repairEventPlan(
  event: BiographyTimelineEventPlan,
  factsIndex: FactsIndex,
  fallbackSphere?: BiographyTimelineEventPlan['sphere']
) {
  const sphere = normalizeSphere(event.sphere) ?? fallbackSphere;
  const sourceText = buildNotesFallback(event, factsIndex);
  const needsLabelRepair = isGenericLabel(event.label) || isTruncatedLabel(event.label) || isRawSentenceLabel(event.label);
  const factLabel = buildLabelFromFacts(event, factsIndex);
  const repairedLabel = needsLabelRepair ? factLabel || buildHeuristicLabel(sourceText, sphere ?? 'other') : event.label;

  return sanitizeTimelineEventPlan(
    {
      ...event,
      label: repairedLabel,
      notes: sourceText,
      sphere,
    },
    sphere
  );
}

function buildFactsIndex(facts?: BiographyFactCandidate[]): FactsIndex {
  const map = new Map<number, BiographyFactCandidate[]>();
  const allFacts = facts ?? [];
  for (const fact of allFacts) {
    const age = Number.isFinite(fact.age) ? Math.round(Number(fact.age)) : undefined;
    if (!Number.isFinite(age)) continue;
    map.set(age, [...(map.get(age) ?? []), fact]);
  }
  return { all: allFacts, byAge: map };
}

export function repairBiographyPlan(params: {
  plan: BiographyTimelinePlan;
  facts?: BiographyFactCandidate[];
}) {
  const factsIndex = buildFactsIndex(params.facts);
  const repairedMainEvents = params.plan.mainEvents
    .map((event, originalIndex) => ({
      originalIndex,
      event: repairEventPlan(event, factsIndex),
    }))
    .filter((entry): entry is { originalIndex: number; event: BiographyTimelineEventPlan } => Boolean(entry.event));
  const mainKeys = new Map<string, number>();
  const mainIndexMap = new Map<number, number>();
  const dedupedMainEvents: BiographyTimelineEventPlan[] = [];

  repairedMainEvents.forEach(({ event, originalIndex }) => {
    if (isBirthLikeEvent(event)) return;
    const key = buildEventFactKey(event);
    const existingIndex = mainKeys.get(key);
    if (existingIndex !== undefined) {
      mainIndexMap.set(originalIndex, existingIndex);
      return;
    }

    const newIndex = dedupedMainEvents.length;
    mainKeys.set(key, newIndex);
    mainIndexMap.set(originalIndex, newIndex);
    dedupedMainEvents.push(event);
  });

  const repairedBranches = params.plan.branches
    .map((branch) => {
      const mappedSourceIndex = mainIndexMap.get(branch.sourceMainEventIndex);
      const sourceEvent = mappedSourceIndex !== undefined ? dedupedMainEvents[mappedSourceIndex] : undefined;
      if (!sourceEvent || sourceEvent.age === 0) return null;

      const branchKeys = new Set<string>();
      const events = branch.events
        .map((event) => repairEventPlan(event, factsIndex, branch.sphere))
        .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
        .filter((event) => event.age > sourceEvent.age)
        .filter((event) => !isBirthLikeEvent(event))
        .filter((event) => {
          const key = buildEventFactKey(event);
          if (mainKeys.has(key) || branchKeys.has(key)) return false;
          branchKeys.add(key);
          return true;
        });

      if (events.length < 2) return null;

      return {
        ...branch,
        sourceMainEventIndex: mappedSourceIndex,
        events,
      } satisfies BiographyTimelineBranchPlan;
    })
    .filter((branch): branch is BiographyTimelineBranchPlan => Boolean(branch));

  return {
    ...params.plan,
    mainEvents: dedupedMainEvents,
    branches: repairedBranches,
  } satisfies BiographyTimelinePlan;
}

export function lintBiographyPlan(plan: BiographyTimelinePlan) {
  const issues: BiographyLintIssue[] = [];
  const mainKeys = new Set<string>();

  for (const event of plan.mainEvents) {
    if (!event.notes?.trim()) {
      issues.push({ code: 'empty-notes', severity: 'error', message: `Событие "${event.label}" осталось без notes.`, age: event.age, label: event.label });
    }
    if (isGenericLabel(event.label)) {
      issues.push({ code: 'generic-label', severity: 'error', message: `Событие "${event.label}" слишком общее.`, age: event.age, label: event.label });
    }
    if (isTruncatedLabel(event.label)) {
      issues.push({ code: 'truncated-label', severity: 'warning', message: `Событие "${event.label}" выглядит обрезанным.`, age: event.age, label: event.label });
    }
    if (isRawSentenceLabel(event.label)) {
      issues.push({ code: 'sentence-fragment-label', severity: 'warning', message: `Событие "${event.label}" похоже на фрагмент предложения.`, age: event.age, label: event.label });
    }

    const key = buildEventFactKey(event);
    if (mainKeys.has(key)) {
      issues.push({ code: 'duplicate-main-event', severity: 'error', message: `Дублируется main event "${event.label}".`, age: event.age, label: event.label });
    }
    mainKeys.add(key);
  }

  const earlyLifeEvents = plan.mainEvents.filter((event) => event.age >= 0 && event.age <= 18).length;
  if (plan.currentAge >= 20 && earlyLifeEvents < 3) {
    issues.push({
      code: 'too-few-early-life-events',
      severity: 'error',
      message: 'Ранняя жизнь всё ещё покрыта слишком слабо: нужно минимум 3 события до 18 лет.',
    });
  }

  if (plan.mainEvents.length < 6) {
    issues.push({
      code: 'sparse-main-line',
      severity: 'error',
      message: 'Главная линия осталась слишком редкой для содержательной биографии.',
    });
  }

  for (const branch of plan.branches) {
    const sourceEvent = plan.mainEvents[branch.sourceMainEventIndex];
    if (!sourceEvent || sourceEvent.age === 0) {
      issues.push({
        code: 'birth-anchored-branch',
        severity: 'error',
        message: `Ветка "${branch.label}" якорится к рождению или невалидному main event.`,
        branchLabel: branch.label,
      });
    }
    if (branch.events.length === 0) {
      issues.push({
        code: 'empty-branch',
        severity: 'error',
        message: `Ветка "${branch.label}" оказалась пустой.`,
        branchLabel: branch.label,
      });
    }
    for (const event of branch.events) {
      if (!event.notes?.trim()) {
        issues.push({ code: 'empty-notes', severity: 'error', message: `Событие "${event.label}" осталось без notes.`, age: event.age, label: event.label, branchLabel: branch.label });
      }
      if (isGenericLabel(event.label)) {
        issues.push({ code: 'generic-label', severity: 'error', message: `Событие "${event.label}" слишком общее.`, age: event.age, label: event.label, branchLabel: branch.label });
      }
      if (isTruncatedLabel(event.label)) {
        issues.push({ code: 'truncated-label', severity: 'warning', message: `Событие "${event.label}" выглядит обрезанным.`, age: event.age, label: event.label, branchLabel: branch.label });
      }
      if (isRawSentenceLabel(event.label)) {
        issues.push({ code: 'sentence-fragment-label', severity: 'warning', message: `Событие "${event.label}" похоже на фрагмент предложения.`, age: event.age, label: event.label, branchLabel: branch.label });
      }
    }
  }

  return issues;
}

export function hasFatalBiographyIssues(issues: BiographyLintIssue[]) {
  return issues.some((issue) => issue.severity === 'error');
}

export function buildFactCoverageSummary(facts: BiographyFactCandidate[]) {
  const windows: Array<[number, number]> = [
    [0, 6],
    [7, 12],
    [13, 18],
  ];

  return windows.map(([minAge, maxAge]) =>
    facts.some((fact) => Number.isFinite(fact.age) && Number(fact.age) >= minAge && Number(fact.age) <= maxAge)
  );
}

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

function buildNotesFallback(event: BiographyTimelineEventPlan, factsByAge: Map<number, BiographyFactCandidate[]>) {
  if (event.notes?.trim()) return event.notes.trim();

  const candidates = factsByAge.get(Math.round(event.age)) ?? [];
  const matchingFact = candidates.find((fact) => {
    const normalizedLabel = event.label.toLowerCase();
    return fact.labelHint.toLowerCase().includes(normalizedLabel) || fact.evidence.toLowerCase().includes(normalizedLabel);
  });

  const approximateNote = buildApproximateFactNote(matchingFact);
  return [approximateNote, matchingFact?.evidence?.trim() || event.label].filter(Boolean).join(' ');
}

function buildLabelFromFacts(event: BiographyTimelineEventPlan, factsByAge: Map<number, BiographyFactCandidate[]>) {
  const candidates = factsByAge.get(Math.round(event.age)) ?? [];
  return candidates
    .map((fact) => fact.labelHint.trim())
    .find((label) => label && !isGenericLabel(label) && !isTruncatedLabel(label) && !isRawSentenceLabel(label));
}

function repairEventPlan(
  event: BiographyTimelineEventPlan,
  factsByAge: Map<number, BiographyFactCandidate[]>,
  fallbackSphere?: BiographyTimelineEventPlan['sphere']
) {
  const sphere = normalizeSphere(event.sphere) ?? fallbackSphere;
  const sourceText = buildNotesFallback(event, factsByAge);
  const needsLabelRepair = isGenericLabel(event.label) || isTruncatedLabel(event.label) || isRawSentenceLabel(event.label);
  const factLabel = buildLabelFromFacts(event, factsByAge);
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

function buildFactsByAgeMap(facts?: BiographyFactCandidate[]) {
  const map = new Map<number, BiographyFactCandidate[]>();
  for (const fact of facts ?? []) {
    const age = Number.isFinite(fact.age) ? Math.round(Number(fact.age)) : undefined;
    if (!Number.isFinite(age)) continue;
    map.set(age, [...(map.get(age) ?? []), fact]);
  }
  return map;
}

export function repairBiographyPlan(params: {
  plan: BiographyTimelinePlan;
  facts?: BiographyFactCandidate[];
}) {
  const factsByAge = buildFactsByAgeMap(params.facts);
  const repairedMainEvents = params.plan.mainEvents
    .map((event) => repairEventPlan(event, factsByAge))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event));
  const mainKeys = new Set<string>();
  const dedupedMainEvents = repairedMainEvents.filter((event) => {
    const key = buildEventFactKey(event);
    if (mainKeys.has(key)) return false;
    mainKeys.add(key);
    return true;
  });

  const repairedBranches = params.plan.branches
    .map((branch) => {
      const sourceEvent = dedupedMainEvents[branch.sourceMainEventIndex];
      if (!sourceEvent || sourceEvent.age === 0) return null;

      const branchKeys = new Set<string>();
      const events = branch.events
        .map((event) => repairEventPlan(event, factsByAge, branch.sphere))
        .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
        .filter((event) => event.age > sourceEvent.age)
        .filter((event) => {
          const key = buildEventFactKey(event);
          if (mainKeys.has(key) || branchKeys.has(key)) return false;
          branchKeys.add(key);
          return true;
        });

      if (events.length < 2) return null;

      return {
        ...branch,
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

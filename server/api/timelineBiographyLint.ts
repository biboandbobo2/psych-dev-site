import { buildFactCandidateKey } from './timelineBiographyFacts.js';
import {
  buildEventFactKey,
  buildHeuristicLabel,
  extractQuotedWorkTitle,
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

const REPAIR_STOP_WORDS = new Set([
  'после',
  'однако',
  'таким',
  'образом',
  'когда',
  'потом',
  'работе',
  'годы',
  'годы',
  'году',
  'желания',
  'поехать',
  'толстой',
  'писал',
  'выступил',
]);

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
  const quotedTitle = extractQuotedWorkTitle(event.label) || extractQuotedWorkTitle(event.notes ?? '');
  const semanticTokens = [event.label, event.notes ?? '']
    .join(' ')
    .split(/[^A-Za-zА-Яа-яЁё0-9-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 5)
    .filter((token) => !REPAIR_STOP_WORDS.has(token.toLowerCase()));
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
    ...factsIndex.all.filter((fact) => {
      if (quotedTitle) {
        return fact.labelHint.includes(quotedTitle) || fact.evidence.includes(quotedTitle);
      }
      return semanticTokens.some((token) => fact.labelHint.includes(token) || fact.evidence.includes(token));
    }),
  ];

  for (const fact of candidateFacts) {
    pool.set(buildFactCandidateKey(fact), fact);
  }

  return [...pool.values()].sort((a, b) => scoreFactCandidateForEvent(event, b) - scoreFactCandidateForEvent(event, a));
}

function isSpecificFactLabel(label: string | undefined) {
  return Boolean(label && !isGenericLabel(label) && !isTruncatedLabel(label) && !isRawSentenceLabel(label));
}

function scoreMatchedFactForRepair(event: BiographyTimelineEventPlan, fact: BiographyFactCandidate) {
  const baseScore = scoreFactCandidateForEvent(event, fact);
  const normalizedLabel = event.label.trim().toLowerCase();
  const normalizedNotes = event.notes?.trim().toLowerCase() ?? '';
  const eventTitle = extractQuotedWorkTitle(event.label)?.toLowerCase() || extractQuotedWorkTitle(event.notes ?? '')?.toLowerCase() || '';
  const factTitle = extractQuotedWorkTitle(fact.labelHint)?.toLowerCase() || extractQuotedWorkTitle(fact.evidence)?.toLowerCase() || '';
  const hint = fact.labelHint.trim().toLowerCase();
  const evidence = fact.evidence.trim().toLowerCase();
  const labelMatch =
    normalizedLabel && (hint.includes(normalizedLabel) || evidence.includes(normalizedLabel) || normalizedLabel.includes(hint))
      ? 6
      : 0;
  const notesMatch = normalizedNotes && evidence.includes(normalizedNotes.slice(0, 24)) ? 3 : 0;
  const titleMatch = eventTitle && factTitle && eventTitle === factTitle ? 12 : 0;
  const labelQuality = isSpecificFactLabel(fact.labelHint) ? 4 : 0;
  return baseScore + labelMatch + notesMatch + titleMatch + labelQuality;
}

function selectMatchingFact(event: BiographyTimelineEventPlan, factsIndex: FactsIndex) {
  const matchingFacts = collectMatchingFacts(event, factsIndex);
  if (matchingFacts.length === 0) return undefined;

  return [...matchingFacts]
    .sort((a, b) => scoreMatchedFactForRepair(event, b) - scoreMatchedFactForRepair(event, a))
    .at(0);
}

function buildNotesFromFact(event: BiographyTimelineEventPlan, matchingFact: BiographyFactCandidate | undefined) {
  if (!matchingFact) {
    return event.notes?.trim() || event.label;
  }

  const approximateNote = buildApproximateFactNote(matchingFact);
  return [approximateNote, matchingFact.evidence.trim()].filter(Boolean).join(' ');
}

function buildLabelFromFact(
  event: BiographyTimelineEventPlan,
  matchingFact: BiographyFactCandidate | undefined,
  fallbackSphere: BiographyTimelineEventPlan['sphere']
) {
  if (matchingFact && isSpecificFactLabel(matchingFact.labelHint)) {
    return matchingFact.labelHint.trim();
  }

  const sourceText = matchingFact?.evidence?.trim() || event.notes?.trim() || event.label;
  return buildHeuristicLabel(sourceText, fallbackSphere ?? 'other');
}

function isLowQualityEventLabel(label: string) {
  return isGenericLabel(label) || isTruncatedLabel(label) || isRawSentenceLabel(label);
}

function areEquivalentEvents(a: BiographyTimelineEventPlan, b: BiographyTimelineEventPlan) {
  if (buildEventFactKey(a) === buildEventFactKey(b)) {
    return true;
  }

  const titleA = extractQuotedWorkTitle(a.label);
  const titleB = extractQuotedWorkTitle(b.label);
  if (!titleA || !titleB || titleA !== titleB) {
    return false;
  }

  const isPublicationA = /^Публикац/i.test(a.label);
  const isPublicationB = /^Публикац/i.test(b.label);
  if (!isPublicationA || !isPublicationB) {
    return false;
  }

  return Math.abs(a.age - b.age) <= 4;
}

function findEquivalentEventIndex(events: BiographyTimelineEventPlan[], candidate: BiographyTimelineEventPlan) {
  const index = events.findIndex((event) => areEquivalentEvents(event, candidate));
  return index >= 0 ? index : undefined;
}

function buildEventFromFact(fact: BiographyFactCandidate, fallbackSphere?: BiographyTimelineEventPlan['sphere']) {
  const age = Number.isFinite(fact.age)
    ? Number(fact.age)
    : Number.isFinite(fact.ageMin)
      ? Number(fact.ageMin)
      : Number.isFinite(fact.ageMax)
        ? Number(fact.ageMax)
        : undefined;
  if (!Number.isFinite(age)) return null;

  const sphere = normalizeSphere(fact.sphere) ?? fallbackSphere;
  const label = isSpecificFactLabel(fact.labelHint) ? fact.labelHint.trim() : buildHeuristicLabel(fact.evidence, sphere ?? 'other');
  if (isLowQualityEventLabel(label)) return null;

  return sanitizeTimelineEventPlan(
    {
      age,
      label,
      notes: buildNotesFromFact({ age, label, isDecision: false }, fact),
      sphere,
      isDecision: false,
    },
    sphere
  );
}

function supplementMainEventsFromFacts(mainEvents: BiographyTimelineEventPlan[], facts: BiographyFactCandidate[]) {
  const initialMainEventsCount = mainEvents.length;
  const supplemented = [...mainEvents];
  const mainKeys = new Set(supplemented.map((event) => buildEventFactKey(event)));
  const addFactEvent = (fact: BiographyFactCandidate, fallbackSphere?: BiographyTimelineEventPlan['sphere']) => {
    const event = buildEventFromFact(fact, fallbackSphere);
    if (!event) return false;
    const key = buildEventFactKey(event);
    if (mainKeys.has(key)) return false;
    supplemented.push(event);
    mainKeys.add(key);
    return true;
  };

  if (supplemented.filter((event) => event.age >= 0 && event.age <= 18).length < 3) {
    const earlyFact = facts
      .filter((fact) => Number.isFinite(fact.age) && Number(fact.age) > 0 && Number(fact.age) <= 18)
      .find((fact) => addFactEvent(fact, fact.sphere));

    void earlyFact;
  }

  const hasTerminalEvent = supplemented.some((event) => /(смерт|дуэл|умер|погиб|astapov|астапов)/i.test(`${event.label} ${event.notes ?? ''}`));
  if (!hasTerminalEvent) {
    const terminalFact = [...facts]
      .filter((fact) => fact.eventType === 'death' || /(смерт|умер|погиб|скончал)/i.test(fact.evidence))
      .sort((a, b) => Number(b.age ?? b.year ?? 0) - Number(a.age ?? a.year ?? 0))
      .find((fact) => addFactEvent(fact, 'health'));

    void terminalFact;
  }

  const MIN_MAIN_EVENTS = 4;
  if (initialMainEventsCount === 0 && supplemented.length < MIN_MAIN_EVENTS) {
    const candidateFacts = [...facts]
      .filter((fact) => Number.isFinite(fact.age) && Number(fact.age) > 0)
      .sort((a, b) => {
        const importanceScore = (value: BiographyFactCandidate['importance']) =>
          value === 'high' ? 3 : value === 'medium' ? 2 : 1;
        const confidenceScore = (value: BiographyFactCandidate['confidence']) =>
          value === 'high' ? 3 : value === 'medium' ? 2 : 1;
        const scoreA = importanceScore(a.importance) + confidenceScore(a.confidence);
        const scoreB = importanceScore(b.importance) + confidenceScore(b.confidence);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return Number(a.age ?? 0) - Number(b.age ?? 0);
      });

    for (const fact of candidateFacts) {
      if (supplemented.length >= MIN_MAIN_EVENTS) break;
      addFactEvent(fact, fact.sphere);
    }
  }

  return supplemented.sort((a, b) => a.age - b.age);
}

function repairEventPlan(
  event: BiographyTimelineEventPlan,
  factsIndex: FactsIndex,
  fallbackSphere?: BiographyTimelineEventPlan['sphere']
) {
  const sphere = normalizeSphere(event.sphere) ?? fallbackSphere;
  const matchingFact = selectMatchingFact(event, factsIndex);
  const sourceText = buildNotesFromFact(event, matchingFact);
  const needsLabelRepair = isGenericLabel(event.label) || isTruncatedLabel(event.label) || isRawSentenceLabel(event.label);
  const factLabel = buildLabelFromFact(event, matchingFact, sphere);
  const repairedLabel = needsLabelRepair ? factLabel : event.label;

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
    if (isLowQualityEventLabel(event.label)) return;
    const key = buildEventFactKey(event);
    const existingIndex = mainKeys.get(key) ?? findEquivalentEventIndex(dedupedMainEvents, event);
    if (existingIndex !== undefined) {
      mainIndexMap.set(originalIndex, existingIndex);
      return;
    }

    const newIndex = dedupedMainEvents.length;
    mainKeys.set(key, newIndex);
    mainIndexMap.set(originalIndex, newIndex);
    dedupedMainEvents.push(event);
  });
  const supplementedMainEvents = supplementMainEventsFromFacts(dedupedMainEvents, factsIndex.all);
  const supplementedMainKeys = new Map<string, number>();
  supplementedMainEvents.forEach((event, index) => {
    supplementedMainKeys.set(buildEventFactKey(event), index);
  });
  const remappedMainIndexMap = new Map<number, number>();
  repairedMainEvents.forEach(({ event, originalIndex }) => {
    const key = buildEventFactKey(event);
    const nextIndex = supplementedMainKeys.get(key);
    if (nextIndex !== undefined) {
      remappedMainIndexMap.set(originalIndex, nextIndex);
    }
  });

  const repairedBranches = params.plan.branches
    .map((branch) => {
      const mappedSourceIndex = remappedMainIndexMap.get(branch.sourceMainEventIndex);
      const sourceEvent = mappedSourceIndex !== undefined ? supplementedMainEvents[mappedSourceIndex] : undefined;
      if (!sourceEvent || sourceEvent.age === 0) return null;

      const branchKeys = new Set<string>();
      const events: BiographyTimelineEventPlan[] = [];
      for (const branchEvent of branch.events) {
        const event = repairEventPlan(branchEvent, factsIndex, branch.sphere);
        if (!event) continue;
        if (isLowQualityEventLabel(event.label)) continue;
        if (event.age <= sourceEvent.age) continue;
        if (isBirthLikeEvent(event)) continue;

        const key = buildEventFactKey(event);
        const duplicatesMain = supplementedMainEvents.some((candidate) => areEquivalentEvents(candidate, event));
        const duplicatesBranch = events.some((candidate) => areEquivalentEvents(candidate, event));
        if (supplementedMainKeys.has(key) || branchKeys.has(key) || duplicatesMain || duplicatesBranch) continue;

        branchKeys.add(key);
        events.push(event);
      }

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
    mainEvents: supplementedMainEvents,
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

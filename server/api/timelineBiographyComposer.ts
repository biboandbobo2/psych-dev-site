import { buildFactCandidateKey } from './timelineBiographyFacts.js';
import {
  buildHeuristicLabel,
  inferBirthDetailsFromExtract,
  inferCanvasName,
  inferDeathYearFromExtract,
  inferDecisionFromSentence,
  inferIconFromSentence,
  inferSphereFromSentence,
  inferSubjectName,
  normalizeText,
  sanitizeTimelineEventPlan,
} from './timelineBiographyHeuristics.js';
import {
  SPHERE_META,
  type BiographyCompositionStats,
  type BiographyFactCandidate,
  type BiographyTimelineBranchPlan,
  type BiographyTimelineEventPlan,
  type BiographyTimelinePlan,
  type TimelineSphere,
} from './timelineBiographyTypes.js';

const GENERIC_LABEL_PATTERN =
  /^(?:учёба|обучение|публикация|новая публикация|новый карьерный этап|карьерный этап|ссылка|переезд|важное событие|формирующее детство)$/i;

type PreparedFactCandidate = BiographyFactCandidate & {
  resolvedAge: number;
  resolvedSphere: TimelineSphere;
};

function isGenericLabel(label: string | undefined) {
  return Boolean(label && GENERIC_LABEL_PATTERN.test(label.trim()));
}

function isTruncatedLabel(label: string | undefined) {
  if (!label) return false;
  const openQuotes = [...label].filter((char) => char === '«').length;
  const closeQuotes = [...label].filter((char) => char === '»').length;
  if (openQuotes > 0) return openQuotes > closeQuotes;
  return /^(?:.*\s(?:в|на|с|по|из|за|от|до|для|при|про|без|над|под|об)|[а-яё].*)$/iu.test(label);
}

function importanceScore(value: BiographyFactCandidate['importance']) {
  return value === 'high' ? 3 : value === 'medium' ? 2 : 1;
}

function confidenceScore(value: BiographyFactCandidate['confidence']) {
  return value === 'high' ? 3 : value === 'medium' ? 2 : 1;
}

function resolveSphere(fact: BiographyFactCandidate) {
  return fact.sphere ?? inferSphereFromSentence(fact.evidence) ?? 'other';
}

function prepareFactCandidates(facts: BiographyFactCandidate[], birthYear?: number) {
  return facts
    .map((fact) => {
      const resolvedAge =
        Number.isFinite(fact.age) ? Number(fact.age) : birthYear && Number.isFinite(fact.year) ? Number(fact.year) - birthYear : undefined;
      const resolvedSphere = resolveSphere(fact);

      if (!Number.isFinite(resolvedAge)) return null;
      if (Number(resolvedAge) < 0 || Number(resolvedAge) > 120) return null;

      return {
        ...fact,
        resolvedAge: Number(resolvedAge),
        resolvedSphere,
      };
    })
    .filter((fact): fact is PreparedFactCandidate => Boolean(fact))
    .sort((a, b) => a.resolvedAge - b.resolvedAge);
}

function buildSpecificLabel(fact: PreparedFactCandidate) {
  const rawLabel = normalizeText(fact.labelHint, 80) || '';
  if (rawLabel && !isGenericLabel(rawLabel) && !isTruncatedLabel(rawLabel) && rawLabel.split(/\s+/).length <= 7) {
    return rawLabel;
  }

  return normalizeText(buildHeuristicLabel(fact.evidence, fact.resolvedSphere), 80) || rawLabel || 'Событие';
}

function buildNotes(fact: PreparedFactCandidate, label: string) {
  return normalizeText(fact.evidence, 700) || normalizeText(fact.details, 700) || label;
}

function factToEventPlan(fact: PreparedFactCandidate) {
  const label = buildSpecificLabel(fact);
  const notes = buildNotes(fact, label);
  const sphere = fact.resolvedSphere;

  return sanitizeTimelineEventPlan(
    {
      age: fact.resolvedAge,
      label,
      notes,
      sphere,
      isDecision: inferDecisionFromSentence(fact.evidence),
      iconId: inferIconFromSentence(fact.evidence, sphere),
    },
    sphere
  );
}

function scoreFactForMain(fact: PreparedFactCandidate, currentAge: number) {
  let score = importanceScore(fact.importance) * 3 + confidenceScore(fact.confidence) * 2;

  if (fact.eventType === 'birth' || fact.resolvedAge === 0) score += 10;
  if (fact.eventType === 'death') score += 10;
  if (fact.resolvedAge <= 18 && ['education', 'family', 'friends', 'move'].includes(fact.eventType)) score += 4;
  if (fact.resolvedAge >= Math.max(0, currentAge - 7) && ['death', 'health', 'conflict', 'family'].includes(fact.eventType)) score += 4;
  if (!isGenericLabel(fact.labelHint)) score += 2;
  if (!isTruncatedLabel(fact.labelHint)) score += 1;

  return score;
}

function scoreFactForBranch(fact: PreparedFactCandidate) {
  return importanceScore(fact.importance) * 2 + confidenceScore(fact.confidence) + (isGenericLabel(fact.labelHint) ? 0 : 2);
}

function selectBestFactInWindow(
  facts: PreparedFactCandidate[],
  selectedKeys: Set<string>,
  minAge: number,
  maxAge: number,
  currentAge: number
) {
  return facts
    .filter((fact) => fact.resolvedAge >= minAge && fact.resolvedAge <= maxAge)
    .filter((fact) => !selectedKeys.has(buildFactCandidateKey(fact)))
    .map((fact) => ({ fact, score: scoreFactForMain(fact, currentAge) }))
    .sort((a, b) => b.score - a.score || a.fact.resolvedAge - b.fact.resolvedAge)[0]?.fact;
}

function addSelectedFact(
  selectedFacts: PreparedFactCandidate[],
  selectedKeys: Set<string>,
  fact: PreparedFactCandidate | undefined
) {
  if (!fact) return;
  const key = buildFactCandidateKey(fact);
  if (selectedKeys.has(key)) return;
  selectedKeys.add(key);
  selectedFacts.push(fact);
}

function determineCurrentAge(preparedFacts: PreparedFactCandidate[], extract: string, birthYear?: number) {
  const deathYear = inferDeathYearFromExtract(extract);
  if (birthYear && deathYear) {
    return Math.max(0, Math.min(120, deathYear - birthYear));
  }

  const lastFactAge = preparedFacts.reduce((max, fact) => Math.max(max, fact.resolvedAge), 0);
  return Math.max(25, Math.min(120, lastFactAge));
}

function selectMainFacts(preparedFacts: PreparedFactCandidate[], currentAge: number) {
  const selectedFacts: PreparedFactCandidate[] = [];
  const selectedKeys = new Set<string>();

  addSelectedFact(
    selectedFacts,
    selectedKeys,
    preparedFacts.find((fact) => fact.eventType === 'birth' || fact.resolvedAge === 0)
  );

  const earlyWindows: Array<[number, number]> = [
    [0, 6],
    [7, 12],
    [13, 18],
  ];
  for (const [minAge, maxAge] of earlyWindows) {
    addSelectedFact(selectedFacts, selectedKeys, selectBestFactInWindow(preparedFacts, selectedKeys, minAge, maxAge, currentAge));
  }

  for (let startAge = 19; startAge <= currentAge; startAge += 5) {
    addSelectedFact(
      selectedFacts,
      selectedKeys,
      selectBestFactInWindow(preparedFacts, selectedKeys, startAge, Math.min(startAge + 4, currentAge), currentAge)
    );
  }

  addSelectedFact(
    selectedFacts,
    selectedKeys,
    [...preparedFacts]
      .reverse()
      .find((fact) => fact.eventType === 'death' || /(смерт|дуэл|погиб|умер|death|died)/i.test(fact.evidence))
  );

  const targetMainCount = preparedFacts.length >= 20 ? 14 : preparedFacts.length >= 14 ? 12 : preparedFacts.length >= 10 ? 10 : 8;
  while (selectedFacts.length < targetMainCount) {
    const leftovers = preparedFacts
      .filter((fact) => !selectedKeys.has(buildFactCandidateKey(fact)))
      .map((fact) => {
        let score = scoreFactForMain(fact, currentAge);
        const selectedInSphere = selectedFacts.filter((selected) => selected.resolvedSphere === fact.resolvedSphere).length;
        const remainingInSphere = preparedFacts.filter(
          (candidate) => !selectedKeys.has(buildFactCandidateKey(candidate)) && candidate.resolvedSphere === fact.resolvedSphere
        ).length;

        if (!['other', 'health'].includes(fact.resolvedSphere)) {
          if (selectedInSphere === 0) score += 2;
          if (selectedInSphere >= 2 && remainingInSphere >= 2) score -= 6;
        }

        return { fact, score };
      })
      .sort((a, b) => b.score - a.score || a.fact.resolvedAge - b.fact.resolvedAge);

    const nextFact = leftovers[0]?.fact;
    if (!nextFact) break;
    addSelectedFact(selectedFacts, selectedKeys, nextFact);
  }

  return selectedFacts.sort((a, b) => a.resolvedAge - b.resolvedAge);
}

function findBranchAnchorIndex(mainEvents: BiographyTimelineEventPlan[], firstBranchAge: number, sphere: TimelineSphere) {
  let bestIndex = -1;
  let bestScore = -1;

  mainEvents.forEach((event, index) => {
    if (event.age >= firstBranchAge || event.age === 0) return;

    let score = 10 - Math.min(9, firstBranchAge - event.age);
    if ((event.sphere ?? 'other') === sphere) score += 5;
    if (event.age >= firstBranchAge - 6) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function buildBranchLabel(sphere: TimelineSphere) {
  return SPHERE_META[sphere]?.label || 'Дополнительная линия';
}

function buildBranches(
  preparedFacts: PreparedFactCandidate[],
  mainFacts: PreparedFactCandidate[],
  mainEvents: BiographyTimelineEventPlan[]
) {
  const mainKeys = new Set(mainFacts.map((fact) => buildFactCandidateKey(fact)));
  const leftovers = preparedFacts.filter((fact) => !mainKeys.has(buildFactCandidateKey(fact)));
  const bySphere = leftovers.reduce<Record<string, PreparedFactCandidate[]>>((acc, fact) => {
    if (fact.resolvedSphere === 'other' || fact.resolvedSphere === 'health') return acc;
    acc[fact.resolvedSphere] ??= [];
    acc[fact.resolvedSphere].push(fact);
    return acc;
  }, {});

  const branches = Object.entries(bySphere)
    .map(([sphere, facts]) => {
      const sortedFacts = [...facts]
        .sort((a, b) => b.resolvedAge - a.resolvedAge)
        .sort((a, b) => scoreFactForBranch(b) - scoreFactForBranch(a))
        .slice(0, 4)
        .sort((a, b) => a.resolvedAge - b.resolvedAge);

      const firstBranchAge = sortedFacts[0]?.resolvedAge;
      if (!Number.isFinite(firstBranchAge) || firstBranchAge <= 0 || sortedFacts.length < 2) {
        return null;
      }

      const anchorIndex = findBranchAnchorIndex(mainEvents, firstBranchAge, sphere as TimelineSphere);
      if (anchorIndex <= 0) return null;

      const anchorAge = mainEvents[anchorIndex]?.age ?? 0;
      const branchEvents = sortedFacts
        .filter((fact) => fact.resolvedAge > anchorAge)
        .map((fact) => factToEventPlan(fact))
        .filter((event): event is BiographyTimelineEventPlan => Boolean(event));

      if (branchEvents.length < 2) return null;

      return {
        label: buildBranchLabel(sphere as TimelineSphere),
        sphere: sphere as TimelineSphere,
        sourceMainEventIndex: anchorIndex,
        events: branchEvents,
      } satisfies BiographyTimelineBranchPlan;
    })
    .filter(Boolean) as BiographyTimelineBranchPlan[];

  return branches
    .sort((a, b) => b.events.length - a.events.length)
    .slice(0, 4);
}

export function composeBiographyPlanFromFacts(params: {
  facts: BiographyFactCandidate[];
  articleTitle: string;
  extract: string;
}) {
  const inferredBirth = inferBirthDetailsFromExtract(params.extract);
  const subjectName = inferSubjectName(params.articleTitle);
  const canvasName = inferCanvasName(subjectName);
  const preparedFacts = prepareFactCandidates(params.facts, inferredBirth.birthYear);
  const currentAge = determineCurrentAge(preparedFacts, params.extract, inferredBirth.birthYear);
  const mainFacts = selectMainFacts(preparedFacts, currentAge);
  const mainEvents = mainFacts
    .map((fact) => factToEventPlan(fact))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event));
  const branches = buildBranches(preparedFacts, mainFacts, mainEvents);

  const earlyLifeWindowsFilled = [
    [0, 6],
    [7, 12],
    [13, 18],
  ].filter(([minAge, maxAge]) => mainEvents.some((event) => event.age >= minAge && event.age <= maxAge)).length;

  const stats: BiographyCompositionStats = {
    facts: preparedFacts.length,
    selectedMainEvents: mainEvents.length,
    selectedBranchEvents: branches.reduce((total, branch) => total + branch.events.length, 0),
    discardedFacts: Math.max(
      0,
      preparedFacts.length - mainEvents.length - branches.reduce((total, branch) => total + branch.events.length, 0)
    ),
    earlyLifeWindowsFilled,
  };

  return {
    plan: {
      subjectName,
      canvasName,
      currentAge,
      selectedPeriodization: 'erikson' as const,
      birthDetails: inferredBirth.birthDetails,
      mainEvents,
      branches,
    } satisfies BiographyTimelinePlan,
    stats,
  };
}

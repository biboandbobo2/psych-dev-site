import { buildFactCandidateKey } from './timelineBiographyFacts.js';
import {
  buildHeuristicLabel,
  extractQuotedWorkTitle,
  inferBirthDetailsFromExtract,
  inferCanvasName,
  inferDeathYearFromExtract,
  inferDecisionFromSentence,
  inferIconFromSentence,
  isRawSentenceLabel,
  inferSphereFromSentence,
  inferSubjectName,
  normalizeText,
  sanitizeTimelineEventPlan,
} from './timelineBiographyHeuristics.js';
import { BIOGRAPHY_THEME_META, getFactThemes, pickPrimaryTheme } from './timelineBiographyThemes.js';
import {
  SPHERE_META,
  type BiographyCompositionStats,
  type BiographyEventTheme,
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
  resolvedThemes: BiographyEventTheme[];
  primaryTheme: BiographyEventTheme | null;
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

function isBirthFact(fact: PreparedFactCandidate) {
  return fact.eventType === 'birth' || fact.resolvedAge === 0;
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

      const resolvedThemes = getFactThemes(fact);

      return {
        ...fact,
        resolvedAge: Number(resolvedAge),
        resolvedSphere,
        resolvedThemes,
        primaryTheme: pickPrimaryTheme(fact),
      };
    })
    .filter((fact): fact is PreparedFactCandidate => Boolean(fact))
    .sort((a, b) => a.resolvedAge - b.resolvedAge);
}

function buildApproximateAgeNote(fact: PreparedFactCandidate) {
  if (fact.timePrecision === 'approximate' && Number.isFinite(fact.ageMin) && Number.isFinite(fact.ageMax)) {
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

function buildMetadataLabel(fact: PreparedFactCandidate) {
  const person = fact.people?.[0];
  const relation = fact.relationRoles?.[0];
  const workTitle = extractQuotedWorkTitle(fact.evidence || fact.labelHint);

  if (fact.resolvedThemes.includes('romance') && person) {
    return `Отношения с ${person}`;
  }
  if (fact.resolvedThemes.includes('losses') && relation) {
    return `Смерть ${relation}`;
  }
  if (fact.resolvedThemes.includes('conflict_duels') && relation) {
    return `Ссора с ${relation}`;
  }
  if (fact.resolvedThemes.includes('children')) {
    return person ? `Рождение ребёнка: ${person}` : 'Рождение ребёнка';
  }
  if (fact.resolvedThemes.includes('upbringing_mentors') && person) {
    return relation === 'няня' ? `Няня ${person}` : person;
  }
  if (workTitle && fact.resolvedThemes.includes('creative_work')) {
    return `Публикация «${workTitle}»`;
  }
  if (fact.primaryTheme && BIOGRAPHY_THEME_META[fact.primaryTheme].preserveForBranch && !isGenericLabel(fact.labelHint)) {
    return fact.labelHint;
  }
  return '';
}

function buildSpecificLabel(fact: PreparedFactCandidate) {
  const rawLabel = normalizeText(fact.labelHint, 80) || '';
  if (
    rawLabel &&
    !isGenericLabel(rawLabel) &&
    !isTruncatedLabel(rawLabel) &&
    !isRawSentenceLabel(rawLabel) &&
    rawLabel.split(/\s+/).length <= 7
  ) {
    return rawLabel;
  }

  const metadataLabel = normalizeText(buildMetadataLabel(fact), 80);
  if (metadataLabel && !isGenericLabel(metadataLabel) && !isTruncatedLabel(metadataLabel)) {
    return metadataLabel;
  }

  return normalizeText(buildHeuristicLabel(fact.evidence, fact.resolvedSphere), 80) || rawLabel || 'Событие';
}

function buildNotes(fact: PreparedFactCandidate, label: string) {
  const source = normalizeText(fact.evidence, 700) || normalizeText(fact.details, 700) || label;
  const approximateNote = buildApproximateAgeNote(fact);
  return normalizeText([approximateNote, source].filter(Boolean).join(' '), 700) || label;
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

  if (fact.eventType === 'death') score += 10;
  if (fact.resolvedAge <= 18 && ['education', 'family', 'friends', 'move'].includes(fact.eventType)) score += 4;
  if (fact.resolvedAge >= Math.max(0, currentAge - 7) && ['death', 'health', 'conflict', 'family'].includes(fact.eventType)) score += 4;
  if (!isGenericLabel(fact.labelHint)) score += 2;
  if (!isTruncatedLabel(fact.labelHint)) score += 1;
  if (fact.resolvedThemes.includes('losses') || fact.resolvedThemes.includes('conflict_duels')) score += 2;
  if (fact.primaryTheme && BIOGRAPHY_THEME_META[fact.primaryTheme]?.preserveForBranch) score += 1;

  return score;
}

function scoreFactForBranch(fact: PreparedFactCandidate) {
  const themeWeight = fact.primaryTheme && BIOGRAPHY_THEME_META[fact.primaryTheme]?.preserveForBranch ? 3 : 0;
  return importanceScore(fact.importance) * 2 + confidenceScore(fact.confidence) + (isGenericLabel(fact.labelHint) ? 0 : 2) + themeWeight;
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
    .filter((fact) => !isBirthFact(fact))
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

  const targetMainCount =
    preparedFacts.length >= 36
      ? 18
      : preparedFacts.length >= 28
        ? 16
        : preparedFacts.length >= 20
          ? 14
          : preparedFacts.length >= 14
            ? 12
            : preparedFacts.length >= 10
              ? 9
              : 7;
  while (selectedFacts.length < targetMainCount) {
    const leftovers = preparedFacts
      .filter((fact) => !selectedKeys.has(buildFactCandidateKey(fact)))
      .filter((fact) => !isBirthFact(fact))
      .map((fact) => {
        let score = scoreFactForMain(fact, currentAge);
        const selectedInSphere = selectedFacts.filter((selected) => selected.resolvedSphere === fact.resolvedSphere).length;
        const remainingInSphere = preparedFacts.filter(
          (candidate) => !selectedKeys.has(buildFactCandidateKey(candidate)) && candidate.resolvedSphere === fact.resolvedSphere
        ).length;
        const selectedInTheme = fact.primaryTheme
          ? selectedFacts.filter((selected) => selected.primaryTheme === fact.primaryTheme).length
          : 0;
        const remainingInTheme = fact.primaryTheme
          ? preparedFacts.filter(
              (candidate) => !selectedKeys.has(buildFactCandidateKey(candidate)) && candidate.primaryTheme === fact.primaryTheme
            ).length
          : 0;

        if (!['other', 'health'].includes(fact.resolvedSphere)) {
          if (selectedInSphere === 0) score += 2;
          if (selectedInSphere >= 2 && remainingInSphere >= 2) score -= 6;
        }
        if (fact.primaryTheme && BIOGRAPHY_THEME_META[fact.primaryTheme]?.preserveForBranch) {
          if (selectedInTheme >= 2 && remainingInTheme >= 2) score -= 7;
          if (selectedInTheme === 0) score += 1;
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
    if (event.age >= firstBranchAge) return;

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

function buildBranchLabel(theme: BiographyEventTheme | null, sphere: TimelineSphere) {
  if (theme) {
    return BIOGRAPHY_THEME_META[theme]?.branchLabel ?? SPHERE_META[sphere]?.label ?? 'Дополнительная линия';
  }
  return SPHERE_META[sphere]?.label || 'Дополнительная линия';
}

function buildBranches(
  preparedFacts: PreparedFactCandidate[],
  mainFacts: PreparedFactCandidate[],
  mainEvents: BiographyTimelineEventPlan[]
) {
  const mainKeys = new Set(mainFacts.map((fact) => buildFactCandidateKey(fact)));
  const leftovers = preparedFacts.filter((fact) => !mainKeys.has(buildFactCandidateKey(fact)) && !isBirthFact(fact));
  const byTheme = leftovers.reduce<Record<string, PreparedFactCandidate[]>>((acc, fact) => {
    const theme = fact.primaryTheme;
    if (!theme || !BIOGRAPHY_THEME_META[theme]?.preserveForBranch) return acc;
    acc[theme] ??= [];
    acc[theme].push(fact);
    return acc;
  }, {});

  const branches = Object.entries(byTheme)
    .map(([theme, facts]) => {
      const themeKey = theme as BiographyEventTheme;
      const themeMeta = BIOGRAPHY_THEME_META[themeKey];
      if (!themeMeta) return null;
      const sortedFacts = [...facts]
        .sort((a, b) => scoreFactForBranch(b) - scoreFactForBranch(a))
        .slice(0, facts.length >= 7 ? 7 : facts.length >= 5 ? 6 : 4)
        .sort((a, b) => a.resolvedAge - b.resolvedAge);

      const firstBranchAge = sortedFacts[0]?.resolvedAge;
      if (!Number.isFinite(firstBranchAge) || firstBranchAge <= 0 || sortedFacts.length < 2) {
        return null;
      }

      const anchorIndex = findBranchAnchorIndex(mainEvents, firstBranchAge, themeMeta.sphere);
      if (anchorIndex < 0) return null;

      const anchorAge = mainEvents[anchorIndex]?.age ?? 0;
      const branchEvents = sortedFacts
        .filter((fact) => fact.resolvedAge > anchorAge)
        .map((fact) => factToEventPlan(fact))
        .filter((event): event is BiographyTimelineEventPlan => Boolean(event));

      if (branchEvents.length < 2) return null;

      return {
        label: buildBranchLabel(themeKey, themeMeta.sphere),
        sphere: themeMeta.sphere,
        sourceMainEventIndex: anchorIndex,
        events: branchEvents,
      } satisfies BiographyTimelineBranchPlan;
    })
    .filter(Boolean) as BiographyTimelineBranchPlan[];

  return branches
    .sort((a, b) => b.events.length - a.events.length)
    .slice(0, 6);
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

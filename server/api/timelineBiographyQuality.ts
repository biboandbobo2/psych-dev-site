import {
  DEFAULT_BRANCH_LENGTH,
  TIMELINE_PERIODIZATION_IDS,
  inferBirthDetailsFromExtract,
  inferDeathYearFromExtract,
  normalizeText,
  normalizeSphere,
  pickBranchX,
  russianDateToISO,
  sanitizeTimelineEventPlan,
  buildEventFactKey,
  hasTerminalLifeEvent,
  splitBiographyExtractIntoSentences,
  extractPsychologicallySignificantEvents,
  buildHeuristicBiographyPlan,
} from './timelineBiographyHeuristics.js';
import {
  SPHERE_META,
  type BiographyPlanDiagnostics,
  type BiographyTimelineBranchPlan,
  type BiographyTimelineData,
  type BiographyTimelineEventPlan,
  type BiographyTimelinePlan,
  type OccupiedBranchLane,
  type TimelineSphere,
} from './timelineBiographyTypes.js';

function countBranchEvents(branches: BiographyTimelineBranchPlan[]) {
  return branches.reduce((total, branch) => total + branch.events.length, 0);
}

function buildBiographyPlanDiagnostics(
  source: BiographyPlanDiagnostics['source'],
  plan: BiographyTimelinePlan
): BiographyPlanDiagnostics {
  return {
    source,
    mainEvents: plan.mainEvents.length,
    branches: plan.branches.length,
    branchEvents: countBranchEvents(plan.branches),
    hasBirthDate: Boolean(plan.birthDetails?.date),
    hasBirthPlace: Boolean(plan.birthDetails?.place),
  };
}

function buildHeuristicFallback(heuristicPlan: BiographyTimelinePlan) {
  return {
    plan: heuristicPlan,
    diagnostics: buildBiographyPlanDiagnostics('heuristics-only', heuristicPlan),
  };
}

function isBranchSphereAllowedFromBirth(sphere: TimelineSphere) {
  return sphere === 'family' || sphere === 'health' || sphere === 'place';
}

function findBetterBranchAnchorIndex(
  branch: BiographyTimelineBranchPlan,
  mainEvents: BiographyTimelineEventPlan[]
) {
  const firstBranchAge = branch.events[0]?.age ?? 0;
  const currentAnchor = mainEvents[branch.sourceMainEventIndex];
  const candidates = mainEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.age <= firstBranchAge)
    .filter(({ event }) => (event.sphere ?? branch.sphere) === branch.sphere || Math.abs(event.age - firstBranchAge) <= 3)
    .sort((a, b) => b.event.age - a.event.age);

  if (!currentAnchor) {
    return candidates[0]?.index ?? 0;
  }

  if (
    currentAnchor.age === 0 &&
    firstBranchAge >= 6 &&
    !isBranchSphereAllowedFromBirth(branch.sphere)
  ) {
    return candidates[0]?.index ?? branch.sourceMainEventIndex;
  }

  return branch.sourceMainEventIndex;
}

function normalizeBranchPlan(
  branch: BiographyTimelineBranchPlan,
  mainEvents: BiographyTimelineEventPlan[],
  mainEventKeys: Set<string>
) {
  const sphere = normalizeSphere(branch.sphere) ?? 'other';
  const label = normalizeText(branch.label, 120);
  const branchEventKeys = new Set<string>();
  const normalizedEvents = (branch.events || [])
    .map((event) => sanitizeTimelineEventPlan(event, sphere))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
    .map((event) => ({ ...event, sphere }))
    .filter((event) => {
      const factKey = buildEventFactKey(event);
      if (mainEventKeys.has(factKey) || branchEventKeys.has(factKey)) {
        return false;
      }
      branchEventKeys.add(factKey);
      return true;
    })
    .sort((a, b) => a.age - b.age);

  if (!label || normalizedEvents.length === 0) return null;

  const sourceMainEventIndex = findBetterBranchAnchorIndex(
    {
      ...branch,
      sphere,
      events: normalizedEvents,
    },
    mainEvents
  );
  const sourceEvent = mainEvents[sourceMainEventIndex];
  const branchEvents = sourceEvent
    ? normalizedEvents.filter((event) => event.age >= sourceEvent.age)
    : normalizedEvents;

  if (!sourceEvent || branchEvents.length === 0) return null;
  if (sourceEvent.age === 0 && branchEvents[0].age >= 6 && !isBranchSphereAllowedFromBirth(sphere)) {
    return null;
  }

  return {
    label,
    sphere,
    sourceMainEventIndex,
    events: branchEvents,
  };
}

function enrichBranches(
  modelBranches: BiographyTimelineBranchPlan[],
  heuristicBranches: BiographyTimelineBranchPlan[],
  mainEvents: BiographyTimelineEventPlan[]
) {
  const coveredSpheres = new Set(modelBranches.map((branch) => branch.sphere));
  const mainEventKeys = new Set(mainEvents.map((event) => buildEventFactKey(event)));
  const additions = heuristicBranches
    .filter((branch) => !coveredSpheres.has(branch.sphere))
    .map((branch) => normalizeBranchPlan(branch, mainEvents, mainEventKeys))
    .filter(Boolean) as BiographyTimelineBranchPlan[];
  return [...modelBranches, ...additions].slice(0, 6);
}

export function getBiographyPlanReviewIssues(plan: BiographyTimelinePlan, extract: string) {
  const issues: string[] = [];
  const deathYear = inferDeathYearFromExtract(extract);
  const mainEvents = (plan.mainEvents || []).filter(Boolean);
  const branchFacts = (plan.branches || []).flatMap((branch) => branch.events || []);
  const mainFactKeys = new Set(mainEvents.map((event) => buildEventFactKey(event)));
  const duplicateBranchFacts = branchFacts.filter((event) => mainFactKeys.has(buildEventFactKey(event))).length;
  const genericLabels = mainEvents.filter((event) =>
    /^(Обучение|Публикация|Новая публикация|Карьерный этап|Новый карьерный этап|Учёба|Ссылка|Переезд|Новый этап|Важное событие)$/i.test(event.label)
  ).length;
  const otherCount = mainEvents.filter((event) => (event.sphere ?? 'other') === 'other').length;
  const currentAge = Math.max(0, Math.min(120, Number(plan.currentAge) || 0));
  const lastAge = mainEvents.reduce((max, event) => Math.max(max, event.age), 0);
  const earlyLifeEvents = mainEvents.filter((event) => event.age >= 0 && event.age <= 12).length;
  const friendEvents = [...mainEvents, ...branchFacts].filter((event) => event.sphere === 'friends').length;
  const emptyBranches = (plan.branches || []).filter((branch) => !branch.events?.length).length;
  const birthAnchoredEducation = (plan.branches || []).some((branch) => {
    const source = mainEvents[branch.sourceMainEventIndex];
    return branch.sphere === 'education' && source?.age === 0 && (branch.events?.[0]?.age ?? 0) >= 6;
  });

  if (mainEvents.length < 6) {
    issues.push('Слишком мало mainEvents для содержательной биографии; нужно покрыть жизнь плотнее.');
  }
  if (deathYear && !hasTerminalLifeEvent(mainEvents, currentAge || deathYear)) {
    issues.push('В mainEvents нет явного terminal event смерти/дуэли/гибели в конце жизни.');
  }
  if (currentAge > 0 && lastAge < currentAge - 3) {
    issues.push('Поздняя жизнь покрыта слабо: последние mainEvents заканчиваются слишком рано.');
  }
  if (currentAge >= 30 && earlyLifeEvents < 2) {
    issues.push('Детство до 12 лет покрыто слабо: если источник даёт опору, добавь 1-3 ранних события.');
  }
  if (friendEvents === 0 && /(лице|друз|переписк|декабр|кружок|общество)/i.test(extract)) {
    issues.push('В тексте есть значимый social context, но отсутствуют события по друзьям/окружению.');
  }
  if (otherCount >= Math.max(2, Math.ceil(mainEvents.length / 3))) {
    issues.push('Слишком много событий со sphere=other; их нужно уточнить и разнести по осмысленным сферам.');
  }
  if (genericLabels > 0) {
    issues.push('Есть слишком generic labels; названия должны быть конкретными фактами, а не общими категориями.');
  }
  if (duplicateBranchFacts > 0) {
    issues.push('Ветки дублируют факты главной линии; нужно убрать повторы и оставить только раскрывающие события.');
  }
  if (emptyBranches > 0) {
    issues.push('Есть пустые ветки; их нужно убрать.');
  }
  if (birthAnchoredEducation) {
    issues.push('Есть ветка education, ошибочно якорённая к рождению.');
  }

  // 5-year density check: find gaps where no events exist
  if (currentAge >= 20 && mainEvents.length >= 4) {
    const allEvents = [...mainEvents, ...branchFacts];
    const emptyPeriods: string[] = [];
    for (let startAge = 0; startAge < currentAge; startAge += 5) {
      const endAge = Math.min(startAge + 5, currentAge);
      const eventsInPeriod = allEvents.filter((e) => e.age >= startAge && e.age < endAge).length;
      if (eventsInPeriod === 0 && endAge - startAge >= 3) {
        emptyPeriods.push(`${startAge}-${endAge}`);
      }
    }
    if (emptyPeriods.length > 0) {
      issues.push(`Пустые 5-летние периоды без событий: ${emptyPeriods.join(', ')}. Если в статье есть факты для этих периодов, добавь события.`);
    }
  }

  return issues;
}

export function enrichBiographyPlan(params: {
  plan: BiographyTimelinePlan;
  articleTitle: string;
  extract: string;
}) {
  const heuristicPlan = buildHeuristicBiographyPlan({
    articleTitle: params.articleTitle,
    extract: params.extract,
    fallbackCurrentAge: Math.max(0, Math.min(120, Number(params.plan.currentAge) || 25)),
  });

  const inferredDeathYear = inferDeathYearFromExtract(params.extract);
  const inferredBirth = inferBirthDetailsFromExtract(params.extract);
  const normalizedMainEvents = (params.plan.mainEvents || [])
    .map((event) => sanitizeTimelineEventPlan(event))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
    .sort((a, b) => a.age - b.age);
  const mainEventKeys = new Set(normalizedMainEvents.map((event) => buildEventFactKey(event)));

  const sanitizedModelBranches = (params.plan.branches || [])
    .map((branch) => normalizeBranchPlan(branch, normalizedMainEvents, mainEventKeys))
    .filter(Boolean) as BiographyTimelineBranchPlan[];

  const modelCurrentAge = Math.max(0, Math.min(120, Number(params.plan.currentAge) || heuristicPlan.currentAge));
  const lateLifeCoverageThreshold = Math.max(heuristicPlan.currentAge - 7, 0);
  const hasLateLifeCoverage = normalizedMainEvents.some((event) => event.age >= lateLifeCoverageThreshold);
  const needsTerminalEvent = Boolean(inferredDeathYear && inferredBirth.birthYear);
  const minimumMainEvents = heuristicPlan.mainEvents.length >= 8 ? 6 : Math.max(4, heuristicPlan.mainEvents.length);
  const tooFewModelEvents = normalizedMainEvents.length < minimumMainEvents;
  const useHeuristicMainEvents = tooFewModelEvents;
  const useHeuristicBranches = countBranchEvents(sanitizedModelBranches) === 0;

  let finalMainEvents = useHeuristicMainEvents ? heuristicPlan.mainEvents : normalizedMainEvents;

  if (!finalMainEvents.some((event) => event.age === 0)) {
    const heuristicBirth = heuristicPlan.mainEvents.find((event) => event.age === 0);
    if (heuristicBirth) {
      finalMainEvents = [heuristicBirth, ...finalMainEvents];
    }
  }

  if (needsTerminalEvent && !hasTerminalLifeEvent(finalMainEvents, modelCurrentAge)) {
    const heuristicDeath = heuristicPlan.mainEvents.find((event) =>
      /(смерт|гибел|погиб|умер|дуэл|died|death)/i.test(`${event.label} ${event.notes ?? ''}`)
    );
    if (heuristicDeath) {
      finalMainEvents = [...finalMainEvents, heuristicDeath];
    }
  }

  // Fill early life (0-18) from heuristics if sparse
  if (!useHeuristicMainEvents && modelCurrentAge >= 20) {
    const earlyLifeEvents = finalMainEvents.filter((event) => event.age > 0 && event.age <= 18);
    const heuristicEarlyEvents = heuristicPlan.mainEvents.filter((event) => event.age > 0 && event.age <= 18);
    const earlyTarget = Math.max(3, Math.min(5, heuristicEarlyEvents.length));
    if (earlyLifeEvents.length < earlyTarget) {
      const existingKeys = new Set(finalMainEvents.map((event) => buildEventFactKey(event)));
      const missingEarly = heuristicEarlyEvents.filter(
        (event) => !existingKeys.has(buildEventFactKey(event))
      );
      finalMainEvents = [...finalMainEvents, ...missingEarly];
    }
  }

  // Fill late life from heuristics if sparse
  if (!useHeuristicMainEvents) {
    const modelAgeKeys = new Set(finalMainEvents.map((event) => buildEventFactKey(event)));
    const lateHeuristicEvents = heuristicPlan.mainEvents.filter(
      (event) => event.age >= lateLifeCoverageThreshold && !modelAgeKeys.has(buildEventFactKey(event))
    );
    if (!hasLateLifeCoverage || lateHeuristicEvents.length > 0) {
      finalMainEvents = [...finalMainEvents, ...lateHeuristicEvents];
    }
  }

  if (!useHeuristicMainEvents) {
    const sorted = [...finalMainEvents].sort((a, b) => a.age - b.age);
    const existingKeys = new Set(sorted.map((event) => buildEventFactKey(event)));
    const gapFills: BiographyTimelineEventPlan[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].age - sorted[i].age;
      if (gap <= 5) continue;
      const gapStart = sorted[i].age;
      const gapEnd = sorted[i + 1].age;
      const candidates = heuristicPlan.mainEvents.filter(
        (event) => event.age > gapStart && event.age < gapEnd && !existingKeys.has(buildEventFactKey(event))
      );
      for (const candidate of candidates) {
        existingKeys.add(buildEventFactKey(candidate));
        gapFills.push(candidate);
      }
    }
    if (gapFills.length > 0) {
      finalMainEvents = [...finalMainEvents, ...gapFills];
    }
  }

  const psychEvents = extractPsychologicallySignificantEvents(params.extract, inferredBirth.birthYear ?? undefined);
  if (psychEvents.length > 0) {
    const existingKeys = new Set(finalMainEvents.map((event) => buildEventFactKey(event)));
    const missingPsychEvents = psychEvents.filter((event) => !existingKeys.has(buildEventFactKey(event)));
    if (missingPsychEvents.length > 0) {
      finalMainEvents = [...finalMainEvents, ...missingPsychEvents];
    }
  }

  finalMainEvents = [...new Map(finalMainEvents.map((event) => [buildEventFactKey(event), event])).values()].sort(
    (a, b) => a.age - b.age
  );

  const mergedPlan: BiographyTimelinePlan = {
    subjectName: normalizeText(params.plan.subjectName, 120) || heuristicPlan.subjectName,
    canvasName: normalizeText(params.plan.canvasName, 80) || heuristicPlan.canvasName,
    currentAge: modelCurrentAge,
    selectedPeriodization:
      typeof params.plan.selectedPeriodization === 'string' &&
      TIMELINE_PERIODIZATION_IDS.includes(params.plan.selectedPeriodization)
        ? params.plan.selectedPeriodization
        : heuristicPlan.selectedPeriodization,
    birthDetails: {
      date: normalizeText(params.plan.birthDetails?.date, 100) || heuristicPlan.birthDetails?.date,
      place: normalizeText(params.plan.birthDetails?.place, 150) || heuristicPlan.birthDetails?.place,
      notes: normalizeText(params.plan.birthDetails?.notes, 400) || heuristicPlan.birthDetails?.notes,
    },
    mainEvents: finalMainEvents,
    branches: useHeuristicBranches
      ? heuristicPlan.branches
          .map((branch) => normalizeBranchPlan(branch, finalMainEvents, new Set(finalMainEvents.map(buildEventFactKey))))
          .filter(Boolean) as BiographyTimelineBranchPlan[]
      : enrichBranches(sanitizedModelBranches, heuristicPlan.branches, finalMainEvents),
  };

  if (mergedPlan.mainEvents.length === 0) {
    return buildHeuristicFallback(heuristicPlan);
  }

  if (mergedPlan.branches.some((branch) => branch.events.length === 0)) {
    return buildHeuristicFallback(heuristicPlan);
  }

  if (!mergedPlan.birthDetails?.date && !mergedPlan.birthDetails?.place && !mergedPlan.branches.length) {
    return buildHeuristicFallback(heuristicPlan);
  }

  return {
    plan: mergedPlan,
    diagnostics: buildBiographyPlanDiagnostics(
      useHeuristicMainEvents || useHeuristicBranches ? 'merged-with-heuristics' : 'model',
      mergedPlan
    ),
  };
}

export function buildTimelineDataFromBiographyPlan(plan: BiographyTimelinePlan): BiographyTimelineData {
  const mainEvents = (plan.mainEvents || [])
    .map((event) => sanitizeTimelineEventPlan(event))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
    .sort((a, b) => a.age - b.age);

  const nodes: BiographyTimelineData['nodes'] = [];
  const edges: BiographyTimelineData['edges'] = [];
  const mainNodeIds: string[] = [];

  mainEvents.forEach((event) => {
    const nodeId = crypto.randomUUID();
    mainNodeIds.push(nodeId);
    nodes.push({
      id: nodeId,
      age: event.age,
      label: event.label,
      notes: event.notes,
      sphere: event.sphere,
      isDecision: event.isDecision,
      iconId: event.iconId,
    });
  });

  const occupiedLanes: OccupiedBranchLane[] = [];
  (plan.branches || []).forEach((branch) => {
    const sphere = normalizeSphere(branch.sphere) ?? 'other';
    const sourceNodeId = mainNodeIds[branch.sourceMainEventIndex];
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode) return;

    const branchEvents = (branch.events || [])
      .map((event) => sanitizeTimelineEventPlan(event, sphere))
      .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
      .filter((event) => event.age >= sourceNode.age)
      .sort((a, b) => a.age - b.age);

    if (branchEvents.length === 0) return;

    const highestAge = branchEvents[branchEvents.length - 1]?.age ?? sourceNode.age;
    const endAge = Math.max(sourceNode.age + DEFAULT_BRANCH_LENGTH, highestAge + 1);
    const x = pickBranchX(sphere, sourceNode.age, endAge, occupiedLanes);

    edges.push({
      id: crypto.randomUUID(),
      x,
      startAge: sourceNode.age,
      endAge,
      color: SPHERE_META[sphere].color,
      nodeId: sourceNode.id,
    });

    branchEvents.forEach((event) => {
      nodes.push({
        id: crypto.randomUUID(),
        age: event.age,
        x,
        parentX: x,
        label: event.label,
        notes: event.notes,
        sphere: event.sphere ?? sphere,
        isDecision: event.isDecision,
        iconId: event.iconId,
      });
    });
  });

  const maxNodeAge = nodes.reduce((max, node) => Math.max(max, node.age), 0);
  const maxEdgeAge = edges.reduce((max, edge) => Math.max(max, edge.endAge), 0);
  const computedCurrentAge = Math.max(0, Math.min(120, Number(plan.currentAge) || maxNodeAge || 25));
  const ageMax = Math.min(
    120,
    Math.max(Math.ceil((Math.max(computedCurrentAge, maxNodeAge, maxEdgeAge) + 3) / 5) * 5, 25)
  );

  return {
    currentAge: computedCurrentAge,
    ageMax,
    nodes,
    edges,
    birthDetails: {
      date: russianDateToISO(normalizeText(plan.birthDetails?.date, 100)),
      place: normalizeText(plan.birthDetails?.place, 150),
      notes: normalizeText(plan.birthDetails?.notes, 400),
    },
    selectedPeriodization:
      typeof plan.selectedPeriodization === 'string' &&
      TIMELINE_PERIODIZATION_IDS.includes(plan.selectedPeriodization)
        ? plan.selectedPeriodization
        : null,
  };
}

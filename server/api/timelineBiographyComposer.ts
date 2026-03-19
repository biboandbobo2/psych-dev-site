import {
  inferIconFromSentence,
  normalizeText,
} from './timelineBiographyHeuristics.js';
import {
  SPHERE_META,
  type BiographyCompositionResult,
  type BiographyFactCandidate,
  type BiographyTimelineBranchPlan,
  type BiographyTimelineEventPlan,
  type BiographyTimelinePlan,
  type TimelineSphere,
} from './timelineBiographyTypes.js';

// ---------------------------------------------------------------------------
// Sphere mapping: composition returns free-form sphere strings,
// BiographyTimelinePlan uses the TimelineSphere enum.
// ---------------------------------------------------------------------------

const SPHERE_MAPPING: Record<string, TimelineSphere> = {
  politics: 'career',
  conflict: 'health',
  legacy: 'other',
  exile: 'place',
  upbringing_education: 'education',
  family_romance: 'family',
  creative_work: 'creativity',
  family_household: 'family',
  travel_politics: 'place',
  politics_service: 'career',
  service_career: 'career',
  politics_economy: 'career',
  politics_conflict: 'career',
  exile_politics_creative: 'place',
  politics_analysis: 'career',
  travel_exile: 'place',
  exile_conflict: 'place',
  politics_creative: 'creativity',
  politics_public_pressure: 'career',
  conflict_duels: 'health',
  travel_moves_exile: 'place',
  friends_network: 'friends',
  losses: 'family',
};

function mapSphere(sphere: string): TimelineSphere {
  if (sphere in SPHERE_META) return sphere as TimelineSphere;
  return SPHERE_MAPPING[sphere] ?? 'other';
}

// ---------------------------------------------------------------------------
// Icon inference from category/themes
// ---------------------------------------------------------------------------

function pickIcon(fact: BiographyFactCandidate): string | undefined {
  const cat = fact.category ?? fact.eventType ?? '';
  if (cat === 'birth') return 'baby-feet';
  if (cat === 'death') return 'thermometer';
  if (cat === 'family' && /бра[кч]|свадьб|женил|вышла замуж/i.test(fact.details)) return 'wedding-rings';
  if (cat === 'family' && /ребён|сын|дочь|родил/i.test(fact.details)) return 'baby-stroller';
  if (cat === 'education') return 'graduation-cap';
  if (cat === 'move') return 'passport';
  if (cat === 'publication') return 'idea-book';
  if (cat === 'career') return 'briefcase';
  if (cat === 'award') return 'trophy';
  if (cat === 'conflict' && /арест/i.test(fact.details)) return 'id-card';
  // Fall back to evidence-based inference
  const sphere = mapSphere(fact.sphere ?? fact.category ?? 'other');
  return inferIconFromSentence(fact.details ?? fact.evidence ?? '', sphere) ?? undefined;
}

// ---------------------------------------------------------------------------
// Label truncation
// ---------------------------------------------------------------------------

function truncateLabel(text: string, maxLen = 35): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.5 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

// ---------------------------------------------------------------------------
// Year → age conversion
// ---------------------------------------------------------------------------

function yearToAge(year: number, birthYear: number, lifespan: number): number {
  const raw = year - birthYear;
  return Math.max(0.5, Math.min(raw, lifespan + 3));
}

// ---------------------------------------------------------------------------
// Fact → EventPlan conversion
// ---------------------------------------------------------------------------

function factToEventPlan(
  fact: BiographyFactCandidate,
  birthYear: number,
  lifespan: number,
): BiographyTimelineEventPlan | null {
  if (fact.year == null) return null;
  const age = yearToAge(fact.year, birthYear, lifespan);
  const label = truncateLabel(fact.shortLabel ?? fact.details ?? 'Событие');
  const sphere = mapSphere(fact.sphere ?? fact.category ?? 'other');

  return {
    age,
    label,
    notes: normalizeText(fact.details ?? fact.evidence ?? '', 700) || label,
    sphere,
    isDecision: fact.importance === 'high',
    iconId: pickIcon(fact) as BiographyTimelineEventPlan['iconId'],
  };
}

// ---------------------------------------------------------------------------
// Birth detection helpers
// ---------------------------------------------------------------------------

function findBirthFact(facts: BiographyFactCandidate[]): BiographyFactCandidate | undefined {
  return facts.find(f => f.eventType === 'birth' || f.category === 'birth');
}

function findDeathFact(facts: BiographyFactCandidate[]): BiographyFactCandidate | undefined {
  return facts.find(f => f.eventType === 'death' || f.category === 'death')
    ?? facts.find(f =>
      f.themes?.includes('losses') &&
      /скончал|умер|смерть|погиб/i.test(f.details ?? '')
    );
}

// ---------------------------------------------------------------------------
// Build birth details from fact
// ---------------------------------------------------------------------------

function buildBirthDetails(birthFact: BiographyFactCandidate | undefined) {
  const details: { date?: string; place?: string; notes?: string } = {};

  if (birthFact) {
    const text = birthFact.details ?? '';
    if (birthFact.year) {
      if (birthFact.month) {
        const months = ['', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
          'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        const monthName = months[birthFact.month] ?? '';
        details.date = monthName ? `${birthFact.month}/${birthFact.year}` : String(birthFact.year);
      } else {
        details.date = String(birthFact.year);
      }
    }
    const placeMatch = text.match(/(?:в\s+|город[ае]?\s+)([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁа-яё\-]+){0,3})/u);
    if (placeMatch) {
      details.place = placeMatch[1].trim();
    }
    // Use birth fact text as notes
    details.notes = normalizeText(text, 400) || undefined;
  }

  return details;
}

// ---------------------------------------------------------------------------
// Merge same-age events in a branch:
//   4 events at same age → merge to 2
//   5+ events at same age → merge to 3
// ---------------------------------------------------------------------------

function mergeSameAgeEvents(events: BiographyTimelineEventPlan[]): BiographyTimelineEventPlan[] {
  const byAge = new Map<number, BiographyTimelineEventPlan[]>();
  for (const e of events) {
    const group = byAge.get(e.age) ?? [];
    group.push(e);
    byAge.set(e.age, group);
  }

  const result: BiographyTimelineEventPlan[] = [];
  for (const [age, group] of [...byAge.entries()].sort((a, b) => a[0] - b[0])) {
    if (group.length <= 3) {
      result.push(...group);
      continue;
    }

    const targetCount = group.length === 4 ? 2 : 3;
    // Keep first and last, merge middle into combined events
    const kept = [group[0]];

    if (targetCount === 3 && group.length > 4) {
      // Keep middle representative
      const midIdx = Math.floor(group.length / 2);
      kept.push(group[midIdx]);
    }

    // Last event — combine remaining labels into its notes
    const last = group[group.length - 1];
    const skippedLabels = group
      .filter(e => !kept.includes(e) && e !== last)
      .map(e => e.label);
    const combinedNotes = skippedLabels.length > 0
      ? `${last.notes ?? last.label}. Также: ${skippedLabels.join('; ')}.`
      : last.notes;

    kept.push({ ...last, notes: combinedNotes });

    result.push(...kept);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main converter: CompositionResult + facts → BiographyTimelinePlan
// ---------------------------------------------------------------------------

export function buildPlanFromCompositionResult(params: {
  subjectName: string;
  facts: BiographyFactCandidate[];
  composition: BiographyCompositionResult;
}): BiographyTimelinePlan {
  const { facts, composition, subjectName } = params;

  const birthFact = findBirthFact(facts);
  const deathFact = findDeathFact(facts);

  const birthYear = birthFact?.year ?? facts[0]?.year ?? 0;
  const allYears = facts.map(f => f.year ?? 0).filter(y => y > 0 && y < 2100);
  const deathYear = deathFact?.year ?? (allYears.length > 0 ? Math.max(...allYears) : birthYear + 80);
  const lifespan = deathYear - birthYear;
  const currentAge = Math.max(0, Math.min(120, lifespan));
  const legacyThreshold = deathYear + 15;

  // Filter birth from mainLine — it goes into birthDetails, not events
  const mainLineIndices = composition.mainLine.filter(idx => {
    const fact = facts[idx];
    if (!fact) return false;
    return fact.eventType !== 'birth' && fact.category !== 'birth';
  });

  // Build main events
  const mainEvents = mainLineIndices
    .map(idx => {
      const fact = facts[idx];
      if (!fact) return null;
      return factToEventPlan(fact, birthYear, lifespan);
    })
    .filter((e): e is BiographyTimelineEventPlan => e != null)
    .sort((a, b) => a.age - b.age);

  // Enrich last mainLine event with death info if it's a death event
  if (mainEvents.length > 0 && deathFact) {
    const lastEvent = mainEvents[mainEvents.length - 1];
    const deathText = normalizeText(deathFact.details ?? '', 400);
    if (deathText && lastEvent.notes !== deathText) {
      mainEvents[mainEvents.length - 1] = {
        ...lastEvent,
        notes: deathText,
      };
    }
  }

  // Collect posthumous facts (>15 years after death) across all branches for legacy branch
  const legacyFacts: BiographyFactCandidate[] = [];

  // Build branches
  const branches: BiographyTimelineBranchPlan[] = [];

  for (const branch of composition.branches) {
    const branchFacts = branch.facts
      .map(idx => facts[idx])
      .filter((f): f is BiographyFactCandidate =>
        f != null && f.year != null &&
        f.eventType !== 'birth' && f.category !== 'birth'
      );

    if (branchFacts.length === 0) continue;

    // Split: facts within lifespan+15 vs legacy facts
    const nearFacts: BiographyFactCandidate[] = [];
    for (const f of branchFacts) {
      if (f.year! > legacyThreshold) {
        legacyFacts.push(f);
      } else {
        nearFacts.push(f);
      }
    }

    if (nearFacts.length === 0) continue;

    const sphere = mapSphere(branch.sphere);

    const branchEvents = nearFacts
      .map(f => factToEventPlan(f, birthYear, lifespan))
      .filter((e): e is BiographyTimelineEventPlan => e != null)
      .sort((a, b) => a.age - b.age);

    if (branchEvents.length === 0) continue;

    // Merge same-age collisions
    const mergedEvents = mergeSameAgeEvents(branchEvents);

    // Find best anchor: closest main event at or before first branch event
    const firstBranchAge = mergedEvents[0].age;
    let bestMainIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < mainEvents.length; i++) {
      const mainAge = mainEvents[i].age;
      if (mainAge <= firstBranchAge) {
        const dist = firstBranchAge - mainAge;
        if (dist < bestDist) {
          bestDist = dist;
          bestMainIdx = i;
        }
      }
    }

    branches.push({
      label: branch.name,
      sphere,
      sourceMainEventIndex: bestMainIdx,
      events: mergedEvents,
    });
  }

  // Build legacy branch if we have posthumous facts
  if (legacyFacts.length > 0) {
    // Sort by year, then assign synthetic ages: deathAge+1, +3, +5, ...
    legacyFacts.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    const legacyEvents: BiographyTimelineEventPlan[] = legacyFacts.map((f, i) => ({
      age: currentAge + 1 + i * 2,
      label: truncateLabel(f.shortLabel ?? f.details ?? 'Наследие'),
      notes: normalizeText(f.details ?? '', 700) || 'Наследие',
      sphere: 'other' as TimelineSphere,
      isDecision: false,
      iconId: undefined,
    }));

    // Merge if too many
    const mergedLegacy = mergeSameAgeEvents(legacyEvents);

    // Anchor to last main event (death)
    const lastMainIdx = mainEvents.length > 0 ? mainEvents.length - 1 : 0;

    branches.push({
      label: 'Наследие',
      sphere: 'other',
      sourceMainEventIndex: lastMainIdx,
      events: mergedLegacy,
    });
  }

  // Remove empty branches (0 events after filtering)
  const validBranches = branches.filter(b => b.events.length > 0);

  return {
    subjectName,
    canvasName: subjectName,
    currentAge,
    selectedPeriodization: 'erikson',
    birthDetails: buildBirthDetails(birthFact),
    mainEvents,
    branches: validBranches,
  };
}

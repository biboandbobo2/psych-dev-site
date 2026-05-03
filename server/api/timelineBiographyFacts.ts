import {
  inferBirthDetailsFromExtract,
  inferDeathYearFromExtract,
  normalizeFactText,
  normalizeSphere,
  normalizeText,
} from './timelineBiographyHeuristics.js';
import { isGenericBiographyLabel } from './timelineBiographyLabelQuality.js';
import type {
  BiographyEventTheme,
  BiographyEventType,
  BiographyFactCandidate,
  BiographyTimePrecision,
  BiographyTimelineFact,
  TimelineSphere,
} from './timelineBiographyTypes.js';

function parseImportance(value: string | undefined): BiographyTimelineFact['importance'] {
  return value === 'high' || value === 'low' ? value : 'medium';
}

function parseConfidence(value: string | undefined): BiographyFactCandidate['confidence'] {
  return value === 'high' || value === 'low' ? value : 'medium';
}

function parseTimePrecision(value: string | undefined): BiographyTimePrecision | undefined {
  switch ((value || '').trim().toLowerCase()) {
    case 'exact':
    case 'year':
    case 'approximate':
    case 'inferred':
      return value!.trim().toLowerCase() as BiographyTimePrecision;
    default:
      return undefined;
  }
}

function normalizeTheme(value: string | undefined): BiographyEventTheme | null {
  switch ((value || '').trim().toLowerCase()) {
    case 'upbringing_mentors':
      return 'upbringing_mentors';
    case 'education':
      return 'education';
    case 'friends_network':
      return 'friends_network';
    case 'romance':
      return 'romance';
    case 'family_household':
      return 'family_household';
    case 'children':
      return 'children';
    case 'travel_moves_exile':
      return 'travel_moves_exile';
    case 'service_career':
      return 'service_career';
    case 'creative_work':
      return 'creative_work';
    case 'conflict_duels':
      return 'conflict_duels';
    case 'losses':
      return 'losses';
    case 'politics_public_pressure':
      return 'politics_public_pressure';
    case 'health':
      return 'health';
    case 'legacy':
      return 'legacy';
    default:
      return null;
  }
}

function parsePipeList(value: string | undefined) {
  return (value || '')
    .split('|')
    .map((item) => normalizeText(item, 120))
    .filter(Boolean);
}

function parseThemes(value: string | undefined) {
  return parsePipeList(value)
    .map((item) => normalizeTheme(item))
    .filter((item): item is BiographyEventTheme => Boolean(item));
}

function normalizeEventType(value: string | undefined): BiographyEventType {
  switch ((value || '').trim().toLowerCase()) {
    case 'birth':
    case 'education':
    case 'move':
    case 'publication':
    case 'career':
    case 'family':
    case 'friends':
    case 'health':
    case 'conflict':
    case 'award':
    case 'project':
    case 'death':
      return value!.trim().toLowerCase() as BiographyEventType;
    default:
      return 'other';
  }
}

function inferEventTypeFromSphere(sphere: TimelineSphere | undefined): BiographyEventType {
  switch (sphere) {
    case 'education':
      return 'education';
    case 'career':
      return 'career';
    case 'creativity':
      return 'publication';
    case 'family':
      return 'family';
    case 'friends':
      return 'friends';
    case 'health':
      return 'health';
    case 'place':
      return 'move';
    default:
      return 'other';
  }
}

function normalizeFactSphereValue(
  sphere: TimelineSphere | undefined,
  eventType: BiographyEventType
): TimelineSphere | undefined {
  if (eventType === 'birth') return 'family';
  if (eventType === 'death') return 'health';
  if (eventType === 'move') return 'place';
  if (eventType === 'publication' || eventType === 'project') return 'creativity';
  if (eventType === 'friends') return 'friends';
  if (eventType === 'education') return 'education';
  if (eventType === 'family') return 'family';
  if (eventType === 'health') return 'health';
  if (eventType === 'career' || eventType === 'award' || eventType === 'conflict') return sphere ?? 'career';
  return sphere;
}

function normalizeNumber(value: string | number | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isRegistryMetadataEvidence(value: string) {
  return /метрическ.*книг|в числе прочих|приходится такая запись|запис[ья][^.!?]{0,40}(?:церкв|книг)/i.test(value);
}

function isGenericLabel(label: string | undefined) {
  return isGenericBiographyLabel(label);
}

function scoreFactCandidateForDedupe(candidate: BiographyFactCandidate) {
  const importanceScore = candidate.importance === 'high' ? 6 : candidate.importance === 'medium' ? 4 : 2;
  const confidenceScore = candidate.confidence === 'high' ? 6 : candidate.confidence === 'medium' ? 4 : 2;
  const sourceScore = candidate.source === 'model' ? 1 : 0;
  const specificityScore = isGenericLabel(candidate.labelHint) ? 0 : 3;
  const themeScore = Math.min(3, candidate.themes?.length || 0);
  const peopleScore = Math.min(2, candidate.people?.length || 0);
  const precisionScore =
    candidate.timePrecision === 'exact'
      ? 3
      : candidate.timePrecision === 'year'
        ? 2
        : candidate.timePrecision === 'approximate'
          ? 1
          : 0;

  return importanceScore + confidenceScore + sourceScore + specificityScore + themeScore + peopleScore + precisionScore;
}

function normalizeEvidence(value: string | undefined, fallback: string) {
  return normalizeText(value, 700) || normalizeText(fallback, 700) || fallback;
}

function isBrokenFactFragment(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim();
  if (normalized.length < 4) return true;
  if (/^(?:[А-ЯA-Z]\.){1,4}$/u.test(normalized)) return true;
  if (/^\d{4}[^А-Яа-яA-Za-zЁё]*[А-ЯA-Z]\.$/u.test(normalized)) return true;
  return false;
}

function inferThemesFromCandidate(candidate: {
  eventType: BiographyEventType;
  sphere?: TimelineSphere;
  evidence: string;
}): BiographyEventTheme[] {
  const normalized = candidate.evidence.toLowerCase();
  const themes = new Set<BiographyEventTheme>();

  if (candidate.eventType === 'birth' || /нян|гуверн|настав|воспит|детств|ранн/i.test(normalized)) {
    themes.add('upbringing_mentors');
  }
  if (candidate.eventType === 'education' || candidate.sphere === 'education') {
    themes.add('education');
  }
  if (candidate.eventType === 'friends' || candidate.sphere === 'friends') {
    themes.add('friends_network');
  }
  if (candidate.eventType === 'family' || candidate.sphere === 'family') {
    themes.add('family_household');
  }
  if (/сын|доч|ребён|ребен/i.test(normalized)) {
    themes.add('children');
  }
  if (candidate.eventType === 'move' || candidate.sphere === 'place') {
    themes.add('travel_moves_exile');
  }
  if (candidate.eventType === 'career' || candidate.eventType === 'award' || candidate.sphere === 'career') {
    themes.add('service_career');
  }
  if (candidate.eventType === 'publication' || candidate.eventType === 'project' || candidate.sphere === 'creativity') {
    themes.add('creative_work');
  }
  if (candidate.eventType === 'conflict' || /дуэл|ссор|конфликт|разрыв|арест|надзор/i.test(normalized)) {
    themes.add('conflict_duels');
  }
  if (candidate.eventType === 'death' || /смерт|потер|скончал|умер/i.test(normalized)) {
    themes.add('losses');
  }
  if (/декабр|восстан|полит|цензур|надзор|казн|сослан/i.test(normalized)) {
    themes.add('politics_public_pressure');
  }
  if (candidate.eventType === 'health' || candidate.sphere === 'health') {
    themes.add('health');
  }
  if (/любов|роман|отношен|увлеч|сватов|влюб|любим/i.test(normalized)) {
    themes.add('romance');
  }

  return [...themes];
}

export function buildFactCandidateKey(candidate: Pick<BiographyFactCandidate, 'age' | 'year' | 'eventType' | 'labelHint' | 'evidence'>) {
  const ageOrYear =
    Number.isFinite(candidate.age) ? `age:${candidate.age}` : Number.isFinite(candidate.year) ? `year:${candidate.year}` : 'unknown';
  const normalizedText = normalizeFactText(candidate.evidence || candidate.labelHint).slice(0, 96);
  return `${ageOrYear}|${candidate.eventType}|${normalizedText}`;
}

export function normalizeFactCandidate(candidate: BiographyFactCandidate): BiographyFactCandidate | null {
  let labelHint = normalizeText(candidate.labelHint, 120);
  const evidence = normalizeEvidence(candidate.evidence || candidate.details, labelHint || '');
  const year = normalizeNumber(candidate.year);
  const explicitAge = normalizeNumber(candidate.age);
  const ageMin = normalizeNumber(candidate.ageMin);
  const ageMax = normalizeNumber(candidate.ageMax);
  const inferredAge =
    explicitAge ??
    (Number.isFinite(ageMin) && Number.isFinite(ageMax)
      ? Math.round((Number(ageMin) + Number(ageMax)) / 2)
      : Number.isFinite(ageMin)
        ? Number(ageMin)
        : Number.isFinite(ageMax)
          ? Number(ageMax)
          : undefined);
  const rawSphere = normalizeSphere(candidate.sphere) ?? undefined;
  let eventType = normalizeEventType(candidate.eventType || candidate.category) || inferEventTypeFromSphere(rawSphere);
  let sphere = normalizeFactSphereValue(rawSphere, eventType) ?? undefined;
  if (isRegistryMetadataEvidence(evidence)) {
    eventType = 'birth';
    sphere = 'family';
    labelHint = 'Рождение';
  }
  const timePrecision =
    parseTimePrecision(candidate.timePrecision) ??
    (Number.isFinite(year)
      ? 'year'
      : Number.isFinite(ageMin) || Number.isFinite(ageMax)
        ? 'approximate'
        : Number.isFinite(inferredAge)
          ? 'inferred'
          : undefined);
  const themes = candidate.themes?.length ? candidate.themes : inferThemesFromCandidate({ eventType, sphere, evidence });
  const people = candidate.people?.map((person) => normalizeText(person, 120)).filter(Boolean);
  const relationRoles = candidate.relationRoles?.map((role) => normalizeText(role, 80)).filter(Boolean);

  if (isBrokenFactFragment(labelHint)) {
    labelHint = undefined;
  }
  if (!labelHint && !evidence) return null;
  if (!labelHint && isBrokenFactFragment(evidence)) return null;
  if (!Number.isFinite(inferredAge) && !Number.isFinite(year)) return null;
  if (Number.isFinite(inferredAge) && Number(inferredAge) === 0 && eventType !== 'birth') return null;

  const normalized: BiographyFactCandidate = {
    year,
    age: inferredAge,
    sphere,
    category: candidate.category || eventType,
    eventType,
    labelHint: labelHint || normalizeText(evidence, 120) || 'Событие',
    details: evidence,
    evidence,
    importance: parseImportance(candidate.importance),
    confidence: parseConfidence(candidate.confidence),
    section: normalizeText(candidate.section, 120),
    timePrecision,
    ageMin,
    ageMax,
    ageLabel: normalizeText(candidate.ageLabel, 80),
    people: people?.length ? people : undefined,
    relationRoles: relationRoles?.length ? relationRoles : undefined,
    themes: themes.length ? themes : undefined,
    source: candidate.source,
  };

  if (!normalized.evidence) return null;
  if (isGenericLabel(normalized.labelHint) && normalized.evidence.trim() === normalized.labelHint.trim()) {
    return null;
  }

  return normalized;
}

export function dedupeFactCandidates(candidates: BiographyFactCandidate[]) {
  const deduped = new Map<string, BiographyFactCandidate>();
  for (const candidate of candidates) {
    const key = buildFactCandidateKey(candidate);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, candidate);
      continue;
    }

    const existingScore = scoreFactCandidateForDedupe(existing);
    const nextScore = scoreFactCandidateForDedupe(candidate);
    if (nextScore > existingScore || (nextScore === existingScore && candidate.evidence.length > existing.evidence.length)) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    const ageA = Number.isFinite(a.age) ? Number(a.age) : Number(a.year) || 999;
    const ageB = Number.isFinite(b.age) ? Number(b.age) : Number(b.year) || 999;
    return ageA - ageB;
  });
}

export function normalizeFactCandidates(candidates: BiographyFactCandidate[]) {
  return dedupeFactCandidates(
    candidates
      .map((candidate) => normalizeFactCandidate(candidate))
      .filter((candidate): candidate is BiographyFactCandidate => Boolean(candidate))
  );
}

export function parseLineBasedBiographyFactCandidates(rawText: string): BiographyFactCandidate[] {
  const facts: BiographyFactCandidate[] = [];
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [kind, ...rest] = line.split('\t').map((part) => part.trim());
    if (kind !== 'FACT') continue;

    // Detect format: new format has month at rest[1] (18 fields), old format has age at rest[1] (17 fields)
    const hasMonth = rest.length >= 18 || (rest[1] === 'unknown' && rest[2] && rest[2] !== 'unknown' && !isNaN(Number(rest[2])));
    const offset = hasMonth ? 1 : 0;

    facts.push({
      year: rest[0] && rest[0] !== 'unknown' ? normalizeNumber(rest[0]) : undefined,
      month: hasMonth && rest[1] && rest[1] !== 'unknown' ? normalizeNumber(rest[1]) : undefined,
      age: rest[1 + offset] && rest[1 + offset] !== 'unknown' ? normalizeNumber(rest[1 + offset]) : undefined,
      category: rest[2 + offset] || 'other',
      eventType: normalizeEventType(rest[2 + offset]),
      sphere: normalizeSphere(rest[3 + offset]) ?? undefined,
      importance: parseImportance(rest[4 + offset]),
      labelHint: rest[5 + offset] || '',
      details: rest[6 + offset] || '',
      evidence: rest[6 + offset] || rest[5 + offset] || '',
      section: rest[7 + offset] || undefined,
      confidence: parseConfidence(rest[8 + offset]),
      timePrecision: parseTimePrecision(rest[9 + offset]),
      ageMin: rest[10 + offset] && rest[10 + offset] !== 'unknown' ? normalizeNumber(rest[10 + offset]) : undefined,
      ageMax: rest[11 + offset] && rest[11 + offset] !== 'unknown' ? normalizeNumber(rest[11 + offset]) : undefined,
      themes: parseThemes(rest[12 + offset]),
      people: parsePipeList(rest[13 + offset]),
      relationRoles: parsePipeList(rest[14 + offset]),
      ageLabel: rest[15 + offset] || undefined,
      source: 'model',
    });
  }

  if (facts.length === 0) {
    throw new Error('Gemini facts parse failed');
  }

  return normalizeFactCandidates(facts);
}

function hasFactInAgeWindow(facts: BiographyFactCandidate[], minAge: number, maxAge: number) {
  return facts.some((fact) => Number.isFinite(fact.age) && Number(fact.age) >= minAge && Number(fact.age) <= maxAge);
}

function buildFactSemanticTokens(candidate: Pick<BiographyFactCandidate, 'labelHint' | 'evidence'>) {
  return new Set(
    normalizeFactText(candidate.evidence || candidate.labelHint)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 5)
  );
}

function factsShareApproximateTime(a: BiographyFactCandidate, b: BiographyFactCandidate) {
  if (Number.isFinite(a.age) && Number.isFinite(b.age)) {
    return Math.abs(Number(a.age) - Number(b.age)) <= 1;
  }

  if (Number.isFinite(a.year) && Number.isFinite(b.year)) {
    return Math.abs(Number(a.year) - Number(b.year)) <= 1;
  }

  return false;
}

function factsSharePeople(a: BiographyFactCandidate, b: BiographyFactCandidate) {
  if (!a.people?.length || !b.people?.length) return false;
  const peopleA = new Set(a.people.map((person) => normalizeFactText(person)));
  return b.people.some((person) => peopleA.has(normalizeFactText(person)));
}

function hasEquivalentFact(facts: BiographyFactCandidate[], candidate: BiographyFactCandidate) {
  return facts.some((fact) => {
    if (buildFactCandidateKey(fact) === buildFactCandidateKey(candidate)) {
      return true;
    }

    if (fact.eventType !== candidate.eventType || !factsShareApproximateTime(fact, candidate)) {
      return false;
    }

    const tokensA = buildFactSemanticTokens(fact);
    const tokensB = buildFactSemanticTokens(candidate);
    const sharedTokens = [...tokensA].filter((token) => tokensB.has(token));
    if (sharedTokens.length >= 2) {
      return true;
    }

    if (factsSharePeople(fact, candidate)) {
      return true;
    }

    return false;
  });
}

function selectBestFactForWindow(candidates: BiographyFactCandidate[], minAge: number, maxAge: number) {
  const windowCandidates = candidates
    .filter((fact) => Number.isFinite(fact.age) && Number(fact.age) >= minAge && Number(fact.age) <= maxAge)
    .sort((a, b) => {
      const importanceScore = { high: 3, medium: 2, low: 1 } as const;
      const confidenceScore = { high: 3, medium: 2, low: 1 } as const;
      const scoreA = importanceScore[a.importance] + confidenceScore[a.confidence] + (isGenericLabel(a.labelHint) ? 0 : 1);
      const scoreB = importanceScore[b.importance] + confidenceScore[b.confidence] + (isGenericLabel(b.labelHint) ? 0 : 1);
      return scoreB - scoreA;
    });

  return windowCandidates[0];
}

export function ensureEarlyLifeFactCoverage(
  facts: BiographyFactCandidate[],
  heuristicFacts: BiographyFactCandidate[],
  currentAge: number
) {
  if (currentAge < 12) return facts;

  const merged = [...facts];
  const windows: Array<[number, number]> = [
    [0, 6],
    [7, 12],
    [13, 18],
  ];

  for (const [minAge, maxAge] of windows) {
    if (hasFactInAgeWindow(merged, minAge, maxAge)) continue;
    const supplemental = selectBestFactForWindow(heuristicFacts, minAge, maxAge);
    if (supplemental) {
      merged.push({ ...supplemental, source: supplemental.source });
    }
  }

  return dedupeFactCandidates(merged);
}

export function mergeFactCandidates(params: {
  modelFacts: BiographyFactCandidate[];
  heuristicFacts: BiographyFactCandidate[];
  extract: string;
}) {
  const inferredBirth = inferBirthDetailsFromExtract(params.extract);
  const inferredDeathYear = inferDeathYearFromExtract(params.extract);
  const birthYear = inferredBirth.birthYear;
  const currentAge = birthYear
    ? Math.max(0, (inferredDeathYear ?? new Date().getFullYear()) - birthYear)
    : 40;

  const supplementalHeuristicFacts = params.heuristicFacts.filter((fact) => {
    if (hasEquivalentFact(params.modelFacts, fact)) {
      return false;
    }

    if (fact.importance === 'high') {
      return true;
    }

    return fact.importance === 'medium' && Boolean(fact.themes?.length) && !isGenericLabel(fact.labelHint);
  });
  let merged = dedupeFactCandidates([...params.modelFacts, ...supplementalHeuristicFacts]);

  merged = ensureEarlyLifeFactCoverage(merged, params.heuristicFacts, currentAge);

  const hasTerminalEvent = merged.some((fact) => fact.eventType === 'death');
  if (!hasTerminalEvent) {
    const heuristicDeath = params.heuristicFacts.find((fact) => fact.eventType === 'death');
    if (heuristicDeath) {
      merged = dedupeFactCandidates([...merged, heuristicDeath]);
    }
  }

  return merged;
}

import {
  buildHeuristicBiographyFacts,
  inferBirthDetailsFromExtract,
  inferDeathYearFromExtract,
  normalizeFactText,
  normalizeSphere,
  normalizeText,
} from './timelineBiographyHeuristics.js';
import type {
  BiographyEventType,
  BiographyFactCandidate,
  BiographyTimelineFact,
  TimelineSphere,
} from './timelineBiographyTypes.js';

const GENERIC_LABEL_PATTERN =
  /^(?:учёба|обучение|публикация|новая публикация|новый карьерный этап|карьерный этап|ссылка|переезд|важное событие|формирующее детство)$/i;

function parseImportance(value: string | undefined): BiographyTimelineFact['importance'] {
  return value === 'high' || value === 'low' ? value : 'medium';
}

function parseConfidence(value: string | undefined): BiographyFactCandidate['confidence'] {
  return value === 'high' || value === 'low' ? value : 'medium';
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

function isGenericLabel(label: string | undefined) {
  return Boolean(label && GENERIC_LABEL_PATTERN.test(label.trim()));
}

function normalizeEvidence(value: string | undefined, fallback: string) {
  return normalizeText(value, 700) || normalizeText(fallback, 700) || fallback;
}

export function buildFactCandidateKey(candidate: Pick<BiographyFactCandidate, 'age' | 'year' | 'eventType' | 'labelHint' | 'evidence'>) {
  const ageOrYear =
    Number.isFinite(candidate.age) ? `age:${candidate.age}` : Number.isFinite(candidate.year) ? `year:${candidate.year}` : 'unknown';
  const normalizedText = normalizeFactText(candidate.evidence || candidate.labelHint).slice(0, 96);
  return `${ageOrYear}|${candidate.eventType}|${normalizedText}`;
}

export function normalizeFactCandidate(candidate: BiographyFactCandidate): BiographyFactCandidate | null {
  const labelHint = normalizeText(candidate.labelHint, 120);
  const evidence = normalizeEvidence(candidate.evidence || candidate.details, labelHint || '');
  const year = normalizeNumber(candidate.year);
  const age = normalizeNumber(candidate.age);
  const rawSphere = normalizeSphere(candidate.sphere) ?? undefined;
  const eventType = normalizeEventType(candidate.eventType || candidate.category) || inferEventTypeFromSphere(rawSphere);
  const sphere = normalizeFactSphereValue(rawSphere, eventType) ?? undefined;

  if (!labelHint && !evidence) return null;
  if (!Number.isFinite(age) && !Number.isFinite(year)) return null;

  const normalized: BiographyFactCandidate = {
    year,
    age,
    sphere,
    category: candidate.category || eventType,
    eventType,
    labelHint: labelHint || normalizeText(evidence, 120) || 'Событие',
    details: evidence,
    evidence,
    importance: parseImportance(candidate.importance),
    confidence: parseConfidence(candidate.confidence),
    section: normalizeText(candidate.section, 120),
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

    const existingScore = `${existing.source}:${existing.importance}:${existing.confidence}:${existing.evidence.length}`;
    const nextScore = `${candidate.source}:${candidate.importance}:${candidate.confidence}:${candidate.evidence.length}`;
    if (nextScore > existingScore) {
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

    facts.push({
      year: rest[0] && rest[0] !== 'unknown' ? normalizeNumber(rest[0]) : undefined,
      age: rest[1] && rest[1] !== 'unknown' ? normalizeNumber(rest[1]) : undefined,
      category: rest[2] || 'other',
      eventType: normalizeEventType(rest[2]),
      sphere: normalizeSphere(rest[3]) ?? undefined,
      importance: parseImportance(rest[4]),
      labelHint: rest[5] || '',
      details: rest[6] || '',
      evidence: rest[6] || rest[5] || '',
      section: rest[7] || undefined,
      confidence: parseConfidence(rest[8]),
      source: 'model',
    });
  }

  if (facts.length === 0) {
    throw new Error('Gemini facts parse failed');
  }

  return normalizeFactCandidates(facts);
}

export function buildHeuristicFactCandidates(extract: string, articleTitle: string): BiographyFactCandidate[] {
  const heuristicFacts = buildHeuristicBiographyFacts(extract, articleTitle);

  return normalizeFactCandidates(
    heuristicFacts.map((fact) => ({
      ...fact,
      eventType: normalizeEventType(fact.category) || inferEventTypeFromSphere(normalizeSphere(fact.sphere)),
      evidence: fact.details,
      confidence: fact.importance,
      source: 'heuristics' as const,
    }))
  );
}

function hasFactInAgeWindow(facts: BiographyFactCandidate[], minAge: number, maxAge: number) {
  return facts.some((fact) => Number.isFinite(fact.age) && Number(fact.age) >= minAge && Number(fact.age) <= maxAge);
}

function hasEquivalentFact(facts: BiographyFactCandidate[], candidate: BiographyFactCandidate) {
  return facts.some((fact) => {
    const sameAge = Number.isFinite(fact.age) && Number.isFinite(candidate.age) && Number(fact.age) === Number(candidate.age);
    const sameYear = Number.isFinite(fact.year) && Number.isFinite(candidate.year) && Number(fact.year) === Number(candidate.year);
    return fact.eventType === candidate.eventType && (sameAge || sameYear);
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

  const supplementalHeuristicFacts = params.heuristicFacts.filter(
    (fact) => fact.importance === 'high' && !hasEquivalentFact(params.modelFacts, fact)
  );
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

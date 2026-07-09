/**
 * Метрики biography benchmark: структурная валидность (инварианты I1–I13),
 * полнота/точность против ground truth, качество лейблов, стоимость.
 *
 * Все метрики считаются из payload pipeline'а детерминированно — на
 * кэшированных ответах модели пересчёт стоит 0 токенов.
 */
import {
  buildPlanFromCompositionResult,
  cleanGenericEventLabels,
  hasFatalBiographyIssues,
  isGenericBiographyLabel,
  lintBiographyPlan,
} from '../../server/api/timelineBiography.js';
import type { BiographyExtractorSuccessPayload } from '../../server/api/timelineBiographyRuntime.js';
import { normalizeImportedTimelineData } from '../../src/pages/timeline/persistence';
import {
  duplicateIds,
  referentialViolations,
} from '../../src/pages/timeline/utils/__tests__/graphGen';
import type { EdgeT, NodeT, TimelineData } from '../../src/pages/timeline/types';
import type { BiographyBenchmarkFact } from './biographyBenchmarks';
import { matchesBenchmarkText } from './biographyBenchmarkMatchers';
import type { BiographyBenchmarkCategory, BiographyBenchmarkEntry } from './biographyBenchmarkSet';
import { biographyBenchmarkGroundTruth } from './biographyBenchmarkGroundTruth';
import type { CachingClientStats } from './biographyGeminiCache';

const LINE_X = 2000;

export type NormalizeEdits = {
  droppedEdges: number;
  reanchoredNodes: number;
  expandedWindows: number;
  droppedNodes: number;
  total: number;
};

export type ArticleMetrics = {
  articleId: string;
  set: 'worker' | 'holdout';
  categories: BiographyBenchmarkCategory[];
  failed?: boolean;
  failureMessage?: string;
  structure: {
    nodes: number;
    edges: number;
    mainLineNodes: number;
    branchNodes: number;
    referentialViolations: number;
    duplicateIds: number;
    eventsOutsideBranchWindow: number;
    sharedXOverlappingLanes: number;
    normalizeEdits: NormalizeEdits;
  };
  labels: {
    genericNodeLabels: number;
    branchLabelsFilled: number;
    branchLabelsTotal: number;
    genericBranchLabels: number;
  };
  lint: {
    fatal: boolean;
    errors: number;
    warnings: number;
    errorCodes: Record<string, number>;
  };
  coverage: {
    totalFacts: number;
    criticalFacts: number;
    timelineMatched: number;
    criticalMatched: number;
    dateAccurate: number;
    dateChecked: number;
    missing: Array<{ id: string; label: string; critical: boolean }>;
    dateErrors: Array<{ id: string; expectedAge: number; actualAge: number }>;
  } | null;
  facts: {
    extracted: number;
    undated: number;
    beforeBirth: number;
    /** B6: доля фактов, получивших разметку (TSV-строки могли потеряться). */
    annotatedShare: number | null;
    redactedShare: number | null;
  };
  cost: {
    totalTokens: number;
    liveCalls: number;
    cachedCalls: number;
    modelDurationMs: number;
    wallClockMs: number;
    byStep: Record<string, { calls: number; tokens: number }>;
  };
  manualFixNeeded: boolean;
  manualFixReasons: string[];
};

function toTimelineData(payload: BiographyExtractorSuccessPayload): TimelineData {
  const timeline = payload.timeline!;
  return {
    currentAge: timeline.currentAge,
    ageMax: timeline.ageMax,
    nodes: timeline.nodes as NodeT[],
    edges: timeline.edges as EdgeT[],
    birthDetails: timeline.birthDetails ?? {},
    selectedPeriodization: timeline.selectedPeriodization ?? null,
  };
}

function countNormalizeEdits(data: TimelineData): NormalizeEdits {
  const normalized = normalizeImportedTimelineData(JSON.parse(JSON.stringify(data)));

  const beforeEdges = new Map(data.edges.map((e) => [e.id, e]));
  const afterEdges = new Map(normalized.edges.map((e) => [e.id, e]));
  const beforeNodes = new Map(data.nodes.map((n) => [n.id, n]));
  const afterNodes = new Map(normalized.nodes.map((n) => [n.id, n]));

  let droppedEdges = 0;
  let expandedWindows = 0;
  for (const [id, edge] of beforeEdges) {
    const after = afterEdges.get(id);
    if (!after) {
      droppedEdges += 1;
    } else if (after.startAge !== edge.startAge || after.endAge !== edge.endAge) {
      expandedWindows += 1;
    }
  }

  let reanchoredNodes = 0;
  let droppedNodes = 0;
  for (const [id, node] of beforeNodes) {
    const after = afterNodes.get(id);
    if (!after) {
      droppedNodes += 1;
    } else if (after.parentX !== node.parentX) {
      reanchoredNodes += 1;
    }
  }

  return {
    droppedEdges,
    reanchoredNodes,
    expandedWindows,
    droppedNodes,
    total: droppedEdges + reanchoredNodes + expandedWindows + droppedNodes,
  };
}

function countEventsOutsideWindow(data: TimelineData): number {
  const edgesByX = new Map<number, EdgeT[]>();
  for (const edge of data.edges) {
    const group = edgesByX.get(edge.x) ?? [];
    group.push(edge);
    edgesByX.set(edge.x, group);
  }
  let outside = 0;
  for (const node of data.nodes) {
    if (node.parentX === undefined || node.parentX === LINE_X) continue;
    const candidates = edgesByX.get(node.parentX);
    if (!candidates) continue; // это уже referential violation, не окно
    const inWindow = candidates.some((e) => node.age >= e.startAge && node.age <= e.endAge);
    if (!inWindow) outside += 1;
  }
  return outside;
}

function countSharedXOverlaps(data: TimelineData): number {
  let overlaps = 0;
  for (let i = 0; i < data.edges.length; i++) {
    for (let j = i + 1; j < data.edges.length; j++) {
      const a = data.edges[i];
      const b = data.edges[j];
      if (a.x !== b.x) continue;
      if (!(a.endAge + 1 < b.startAge || b.endAge + 1 < a.startAge)) overlaps += 1;
    }
  }
  return overlaps;
}

function nodeText(node: NodeT) {
  return [node.label, node.notes ?? '', node.sphere ?? ''].filter(Boolean).join(' ');
}

function evaluateCoverage(
  payload: BiographyExtractorSuccessPayload,
  groundTruth: BiographyBenchmarkFact[] | undefined,
  birthYear: number | null
): ArticleMetrics['coverage'] {
  if (!groundTruth || groundTruth.length === 0 || !payload.timeline) return null;

  const nodes = payload.timeline.nodes as NodeT[];
  const birthText = [
    payload.timeline.birthDetails?.date ?? '',
    payload.timeline.birthDetails?.place ?? '',
    payload.timeline.birthDetails?.notes ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  let timelineMatched = 0;
  let criticalMatched = 0;
  let dateAccurate = 0;
  let dateChecked = 0;
  const missing: Array<{ id: string; label: string; critical: boolean }> = [];
  const dateErrors: Array<{ id: string; expectedAge: number; actualAge: number }> = [];

  for (const fact of groundTruth) {
    // Рождение канонически живёт в birthDetails — проверяем его первым,
    // иначе «рождение» ложно матчится на узлы с упоминанием места рождения.
    const matchedBirth = Boolean(birthText && matchesBenchmarkText(birthText, fact.timeline));
    const matchingNodes = nodes.filter((node) => matchesBenchmarkText(nodeText(node), fact.timeline));
    const matched = matchedBirth || matchingNodes.length > 0;

    if (matched) {
      timelineMatched += 1;
      if (fact.critical) criticalMatched += 1;
      // Точность даты: факт представлен на правильном возрасте, если ХОТЬ ОДИН
      // совпавший узел лежит в ±1 от year - birthYear (первый-попавшийся узел
      // давал ложные ошибки: «смерть» матчилась на смерть отца и т.п.).
      if (matchingNodes.length > 0 && fact.year != null && birthYear != null) {
        const expectedAge = fact.year - birthYear;
        const closest = matchingNodes.reduce((best, node) =>
          Math.abs(node.age - expectedAge) < Math.abs(best.age - expectedAge) ? node : best
        );
        if (Math.abs(closest.age - expectedAge) <= 1) {
          dateChecked += 1;
          dateAccurate += 1;
        } else if (!matchedBirth) {
          dateChecked += 1;
          dateErrors.push({ id: fact.id, expectedAge, actualAge: closest.age });
        }
        // matchedBirth && узлы мимо возраста — дата подтверждена birthDetails,
        // возрастную проверку узлов не засчитываем ни в плюс, ни в минус
      }
    } else {
      missing.push({ id: fact.id, label: fact.label, critical: Boolean(fact.critical) });
    }
  }

  return {
    totalFacts: groundTruth.length,
    criticalFacts: groundTruth.filter((f) => f.critical).length,
    timelineMatched,
    criticalMatched,
    dateAccurate,
    dateChecked,
    missing,
    dateErrors,
  };
}

export function buildArticleMetrics(params: {
  entry: BiographyBenchmarkEntry;
  payload: BiographyExtractorSuccessPayload;
  stats: CachingClientStats;
  wallClockMs: number;
}): ArticleMetrics {
  const { entry, payload, stats } = params;
  if (!payload.timeline) {
    return {
      articleId: entry.id,
      set: entry.set,
      categories: entry.categories,
      failed: true,
      failureMessage: 'pipeline вернул payload без timeline',
    } as ArticleMetrics;
  }

  const data = toTimelineData(payload);
  const violations = referentialViolations({ nodes: data.nodes, edges: data.edges });
  const dupes = [...duplicateIds(data.nodes), ...duplicateIds(data.edges)];

  const birthFact = payload.facts.find((f) => f.eventType === 'birth' || f.category === 'birth');
  const birthYear = birthFact?.year ?? null;

  // Лейблы веток: EdgeT.label (опциональное поле, появилось в PR #68)
  const edgeLabels = data.edges.map((e) => e.label).filter((l): l is string => Boolean(l));

  // Линт пересобранного плана (тот же путь, что в CF qualityMetrics)
  const plan = cleanGenericEventLabels({
    plan: buildPlanFromCompositionResult({
      subjectName: payload.subjectName ?? entry.subject,
      facts: payload.facts,
      composition: payload.composition!,
    }),
    facts: payload.facts,
  });
  const lintIssues = lintBiographyPlan(plan);

  const normalizeEdits = countNormalizeEdits(data);
  const eventsOutsideWindow = countEventsOutsideWindow(data);
  const sharedX = countSharedXOverlaps(data);
  const coverage = evaluateCoverage(payload, biographyBenchmarkGroundTruth[entry.id], birthYear);

  const manualFixReasons: string[] = [];
  if (violations.length > 0) manualFixReasons.push(`referentialViolations=${violations.length}`);
  if (dupes.length > 0) manualFixReasons.push(`duplicateIds=${dupes.length}`);
  if (eventsOutsideWindow > 0) manualFixReasons.push(`eventsOutsideWindow=${eventsOutsideWindow}`);
  if (sharedX > 0) manualFixReasons.push(`sharedXOverlap=${sharedX}`);
  if (normalizeEdits.total > 0) manualFixReasons.push(`normalizeEdits=${normalizeEdits.total}`);
  if (coverage && coverage.criticalMatched < coverage.criticalFacts) {
    manualFixReasons.push(
      `missingCritical=${coverage.criticalFacts - coverage.criticalMatched}`
    );
  }
  if (hasFatalBiographyIssues(lintIssues)) manualFixReasons.push('fatalLint');
  // Слепое пятно, найденное на lite/frankl: без birth-факта birthYear берётся
  // из первого попавшегося факта и ВСЯ возрастная шкала сдвигается, а проверка
  // дат вырождается в пустую (0 из 0). Отсутствие рождения = ручная правка.
  if (birthYear == null) manualFixReasons.push('noBirthFact');
  // BPT-12: composition-fallback (все факты на главной линии, 0 веток) —
  // деградация, невидимая через fail-счётчик
  if (data.edges.length === 0 && data.nodes.length > 20) manualFixReasons.push('compositionFallback');

  return {
    articleId: entry.id,
    set: entry.set,
    categories: entry.categories,
    structure: {
      nodes: data.nodes.length,
      edges: data.edges.length,
      mainLineNodes: data.nodes.filter((n) => n.parentX === undefined || n.parentX === LINE_X).length,
      branchNodes: data.nodes.filter((n) => n.parentX !== undefined && n.parentX !== LINE_X).length,
      referentialViolations: violations.length,
      duplicateIds: dupes.length,
      eventsOutsideBranchWindow: eventsOutsideWindow,
      sharedXOverlappingLanes: sharedX,
      normalizeEdits,
    },
    labels: {
      genericNodeLabels: data.nodes.filter((n) => isGenericBiographyLabel(n.label)).length,
      branchLabelsFilled: edgeLabels.length,
      branchLabelsTotal: data.edges.length,
      genericBranchLabels: edgeLabels.filter((l) => isGenericBiographyLabel(l)).length,
    },
    lint: {
      fatal: hasFatalBiographyIssues(lintIssues),
      errors: lintIssues.filter((i) => i.severity === 'error').length,
      warnings: lintIssues.filter((i) => i.severity === 'warning').length,
      errorCodes: lintIssues
        .filter((i) => i.severity === 'error')
        .reduce<Record<string, number>>((acc, i) => {
          acc[i.code] = (acc[i.code] ?? 0) + 1;
          return acc;
        }, {}),
    },
    coverage,
    facts: {
      extracted: payload.facts.length,
      undated: payload.facts.filter((f) => f.year == null).length,
      beforeBirth: birthYear != null ? payload.facts.filter((f) => f.year != null && f.year < birthYear).length : 0,
      annotatedShare: payload.meta.stepCoverage
        ? Math.round((payload.meta.stepCoverage.annotated / Math.max(1, payload.meta.stepCoverage.factsTotal)) * 1000) / 10
        : null,
      redactedShare: payload.meta.stepCoverage
        ? Math.round((payload.meta.stepCoverage.redacted / Math.max(1, payload.meta.stepCoverage.factsTotal)) * 1000) / 10
        : null,
    },
    cost: {
      totalTokens: stats.totalTokens,
      liveCalls: stats.liveCalls,
      cachedCalls: stats.hits,
      modelDurationMs: stats.totalDurationMs,
      wallClockMs: params.wallClockMs,
      byStep: stats.byStep,
    },
    manualFixNeeded: manualFixReasons.length > 0,
    manualFixReasons,
  };
}

// ---------------------------------------------------------------------------
// Агрегация и сравнение
// ---------------------------------------------------------------------------

export type AggregateRow = {
  group: string;
  articles: number;
  failed: number;
  refViolations: number;
  normalizeEdits: number;
  outsideWindow: number;
  sharedX: number;
  coveragePct: number | null;
  criticalPct: number | null;
  dateAccuracyPct: number | null;
  genericLabels: number;
  manualFixShare: number;
  avgTokens: number;
};

function buildRow(group: string, items: ArticleMetrics[]): AggregateRow {
  const ok = items.filter((m) => !m.failed);
  const withCoverage = ok.filter((m) => m.coverage);
  const sum = (fn: (m: ArticleMetrics) => number) => ok.reduce((acc, m) => acc + fn(m), 0);
  const covTotal = withCoverage.reduce((acc, m) => acc + m.coverage!.totalFacts, 0);
  const covMatched = withCoverage.reduce((acc, m) => acc + m.coverage!.timelineMatched, 0);
  const critTotal = withCoverage.reduce((acc, m) => acc + m.coverage!.criticalFacts, 0);
  const critMatched = withCoverage.reduce((acc, m) => acc + m.coverage!.criticalMatched, 0);
  const dateChecked = withCoverage.reduce((acc, m) => acc + m.coverage!.dateChecked, 0);
  const dateAccurate = withCoverage.reduce((acc, m) => acc + m.coverage!.dateAccurate, 0);

  return {
    group,
    articles: items.length,
    failed: items.filter((m) => m.failed).length,
    refViolations: sum((m) => m.structure.referentialViolations),
    normalizeEdits: sum((m) => m.structure.normalizeEdits.total),
    outsideWindow: sum((m) => m.structure.eventsOutsideBranchWindow),
    sharedX: sum((m) => m.structure.sharedXOverlappingLanes),
    coveragePct: covTotal > 0 ? Math.round((covMatched / covTotal) * 1000) / 10 : null,
    criticalPct: critTotal > 0 ? Math.round((critMatched / critTotal) * 1000) / 10 : null,
    dateAccuracyPct: dateChecked > 0 ? Math.round((dateAccurate / dateChecked) * 1000) / 10 : null,
    genericLabels: sum((m) => m.labels.genericNodeLabels),
    manualFixShare:
      items.length > 0
        ? Math.round(
            ((items.filter((m) => m.failed || m.manualFixNeeded).length) / items.length) * 1000
          ) / 10
        : 0,
    avgTokens: ok.length > 0 ? Math.round(sum((m) => m.cost.totalTokens) / ok.length) : 0,
  };
}

export function aggregateMetrics(results: ArticleMetrics[], meta: { variant: string }) {
  const groups = new Map<string, ArticleMetrics[]>();
  groups.set('ALL', results);
  groups.set('set:worker', results.filter((m) => m.set === 'worker'));
  groups.set('set:holdout', results.filter((m) => m.set === 'holdout'));
  const categories = [...new Set(results.flatMap((m) => m.categories ?? []))].sort();
  for (const category of categories) {
    groups.set(`cat:${category}`, results.filter((m) => m.categories?.includes(category)));
  }

  return {
    variant: meta.variant,
    generatedAt: new Date().toISOString(),
    rows: [...groups.entries()]
      .filter(([, items]) => items.length > 0)
      .map(([group, items]) => buildRow(group, items)),
  };
}

export function formatAggregateTable(aggregate: ReturnType<typeof aggregateMetrics>): string {
  const header =
    'group                | n  | fail | refV | normEd | outWin | shX | cover% | crit% | date% | genL | manual% | avgTok';
  const lines = [header, '-'.repeat(header.length)];
  for (const row of aggregate.rows) {
    lines.push(
      [
        row.group.padEnd(20),
        String(row.articles).padStart(2),
        String(row.failed).padStart(4),
        String(row.refViolations).padStart(4),
        String(row.normalizeEdits).padStart(6),
        String(row.outsideWindow).padStart(6),
        String(row.sharedX).padStart(3),
        String(row.coveragePct ?? '—').padStart(6),
        String(row.criticalPct ?? '—').padStart(5),
        String(row.dateAccuracyPct ?? '—').padStart(5),
        String(row.genericLabels).padStart(4),
        String(row.manualFixShare).padStart(7),
        String(row.avgTokens).padStart(6),
      ].join(' | ')
    );
  }
  return lines.join('\n');
}

export function compareAggregates(
  tagA: string,
  resultsA: ArticleMetrics[],
  tagB: string,
  resultsB: ArticleMetrics[]
): string {
  const aggA = aggregateMetrics(resultsA, { variant: tagA });
  const aggB = aggregateMetrics(resultsB, { variant: tagB });
  const rowsB = new Map(aggB.rows.map((r) => [r.group, r]));

  const lines: string[] = [`Δ ${tagA} → ${tagB} (метрика: A → B)`];
  for (const rowA of aggA.rows) {
    const rowB = rowsB.get(rowA.group);
    if (!rowB) continue;
    const deltas: string[] = [];
    const numericKeys: Array<keyof AggregateRow> = [
      'failed', 'refViolations', 'normalizeEdits', 'outsideWindow', 'sharedX',
      'coveragePct', 'criticalPct', 'dateAccuracyPct', 'genericLabels', 'manualFixShare', 'avgTokens',
    ];
    for (const key of numericKeys) {
      const a = rowA[key];
      const b = rowB[key];
      if (typeof a === 'number' && typeof b === 'number' && a !== b) {
        deltas.push(`${key}: ${a} → ${b}`);
      } else if (a === null && typeof b === 'number') {
        deltas.push(`${key}: — → ${b}`);
      }
    }
    if (deltas.length > 0) {
      lines.push(`  ${rowA.group}: ${deltas.join('; ')}`);
    }
  }
  if (lines.length === 1) lines.push('  без изменений');
  return lines.join('\n');
}

/**
 * Единый biography pipeline (BPT-2): извлечение → gap-filling → annotation →
 * redaktura → composition → render. Оркестрация существует в ОДНОМ месте;
 * Cloud Function и Vercel automation runtime — тонкие обёртки.
 *
 * Модуль транспорт-агностичен: модель инжектится через callModel, логи и
 * прогресс — через callbacks. Никаких импортов Vercel/Firebase/debug —
 * иначе CF не сможет его импортировать.
 *
 * Разнесено по модулям (публичная поверхность реэкспортируется отсюда):
 * - timelineBiographyPipelineTypes.ts — типы и модельные константы
 * - timelineBiographyGemini.ts — конфиги вызовов, схемы, разбор ответа
 * - timelineBiographySteps.ts — step-функции (extraction/markup/composition)
 */
import { buildBiographyGapFillingPrompt } from './timelineBiographyPrompts.js';
import { fetchWikipediaPlainExtract } from './timelineBiographyWikipedia.js';
import {
  filterFactsBeyondDeath,
  resolveGapFillingMode,
  stripFabricatedYearClusters,
  stripUnreliableMonths,
} from './timelineBiographyFacts.js';
import {
  deduplicateFacts,
  parseSimpleJsonFacts,
  type AnnotationEntry,
} from './timelineBiographyParsers.js';
import {
  buildPlanFromCompositionResult,
  findDeathFact,
} from './timelineBiographyComposer.js';
import { cleanGenericEventLabels } from './timelineBiographyLint.js';
import { buildTimelineDataFromBiographyPlan } from './timelineBiographyQuality.js';
import {
  collectGeminiResultText,
  extractTotalTokens,
  extractionCallConfig,
  isLiteProfile,
  LITE_DATING_EXAMPLES,
  resolvedExtractionEmphasis,
} from './timelineBiographyGemini.js';
import {
  annotateBiographyFacts,
  composeBiographyFactsIntoTimeline,
  generateSimpleBiographyFacts,
  markupBiographyFactsMerged,
  redaktBiographyFacts,
} from './timelineBiographySteps.js';
import {
  DEFAULT_BIOGRAPHY_MODEL,
  type BiographyPipelineDeps,
  type BiographyPipelineResult,
  type BiographyPipelineStageData,
} from './timelineBiographyPipelineTypes.js';
import type {
  BiographyFactCandidate,
  BiographyTimelineData,
  BiographyTimelinePlan,
  WikipediaPageExtract,
} from './timelineBiographyTypes.js';

// ---------------------------------------------------------------------------
// Публичная поверхность модуля (сохранена при разносе по файлам)
// ---------------------------------------------------------------------------

export { DEFAULT_BIOGRAPHY_MODEL, BIOGRAPHY_PROD_MODEL } from './timelineBiographyPipelineTypes.js';
export type {
  BiographyGenerateRequest,
  BiographyGenAiClient,
  CallBiographyModel,
  BiographyProgressCallback,
  BiographyPipelineStage,
  BiographyPipelineStageData,
  BiographyPipelineDeps,
  BiographyPipelineResult,
} from './timelineBiographyPipelineTypes.js';
export { collectGeminiResultText, buildLiteExtractionEmphasis } from './timelineBiographyGemini.js';

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runBiographyPipelineCore(params: {
  sourceUrl: string;
  /** Pre-fetched страница (fixtures в бенчмарках/тестах) — сеть не трогается. */
  page?: WikipediaPageExtract;
  deps: BiographyPipelineDeps;
}): Promise<BiographyPipelineResult> {
  const { deps } = params;
  const progress = deps.onProgress ?? (() => {});
  const TOTAL_STEPS = 6;

  progress(1, TOTAL_STEPS, 'Загрузка статьи из Wikipedia');
  const wikiPage = params.page ?? (await fetchWikipediaPlainExtract(params.sourceUrl));
  const fullExtract = wikiPage.biographyExtract || wikiPage.extract;
  const len = fullExtract.length;

  // Те же слайсы, что готовит Wikipedia-модуль (28K + overlap + lead-контекст)
  const slices = wikiPage.factExtractSlices?.length ? wikiPage.factExtractSlices : [fullExtract];

  const subjectName = wikiPage.title;
  progress(1, TOTAL_STEPS, 'Загрузка статьи из Wikipedia', `${subjectName} — ${Math.round(len / 1000)}K символов`);
  deps.log?.('extraction start', { subjectName, chars: len, slices: slices.length });

  progress(2, TOTAL_STEPS, 'Извлечение биографических фактов', `${slices.length} ${slices.length === 1 ? 'часть' : 'части'}`);

  // Последовательно — параллельные вызовы ловят 429 на free tier
  let allFacts: BiographyFactCandidate[] = [];
  let factsModel = deps.model ?? DEFAULT_BIOGRAPHY_MODEL;
  for (let index = 0; index < slices.length; index++) {
    const baseFocusHint = slices.length > 1
      ? `Персона: ${subjectName}. Это часть ${index + 1} из ${slices.length}. Извлекай ВСЕ факты из этого фрагмента — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`
      : `Персона: ${subjectName}. Извлекай максимум фактов — включая мелкие семейные детали, конкретные произведения, второстепенные эпизоды, аресты, организации.`;
    const emphasis = resolvedExtractionEmphasis(deps, slices[index].length);
    const focusHint = emphasis ? `${baseFocusHint}\n${emphasis}` : baseFocusHint;

    // F1 (verifier): падение слайса после ретраев — ошибка импорта, а не
    // молча обрезанная биография (прод-семантика старого CF).
    const result = await generateSimpleBiographyFacts({
      deps,
      articleTitle: subjectName,
      extract: slices[index],
      focusHint,
      label: `extraction slice ${index + 1}/${slices.length}`,
    });
    allFacts.push(...result.facts);
    factsModel = result.model;
    deps.log?.(`slice ${index + 1}/${slices.length} done`, { facts: result.facts.length });
  }

  if (allFacts.length === 0) {
    throw new Error('two-pass-flash-failed: all slices returned 0 facts');
  }

  allFacts = deduplicateFacts(allFacts);

  // Post-death фильтр: посмертные факты (памятники, издания) не должны
  // доезжать до composition.
  const extractedBirthFact = allFacts.find(f => f.category === 'birth' || f.eventType === 'birth');
  const extractedBirthYear = extractedBirthFact?.year ?? null;
  const extractedDeathYear = findDeathFact(allFacts, extractedBirthYear ?? undefined)?.year ?? null;
  {
    const beforeFilter = allFacts.length;
    allFacts = filterFactsBeyondDeath(allFacts, extractedDeathYear);
    const filtered = beforeFilter - allFacts.length;
    if (filtered > 0) {
      deps.log?.(`post-death filter: removed ${filtered} facts`, { deathYear: extractedDeathYear });
    }
  }

  const { mode: gapFillingMode, factDensity, lifespanYears } = resolveGapFillingMode(
    allFacts,
    extractedBirthYear,
    extractedDeathYear
  );
  deps.log?.('density analysis', {
    facts: allFacts.length, lifespanYears, density: factDensity.toFixed(2), gapFillingMode,
  });

  const stageData = (): BiographyPipelineStageData => ({
    facts: allFacts,
    subjectName,
    extract: fullExtract,
    rawTextChars: len,
    slicesTotal: slices.length,
    gapFillingMode,
    factDensity,
  });
  await deps.onStage?.('extraction', stageData());

  progress(2, TOTAL_STEPS, 'Извлечение биографических фактов', `${allFacts.length} фактов извлечено`);

  progress(3, TOTAL_STEPS, 'Добивочный проход (gap-filling)');
  // Gap-filling pass: also send undated facts for dating
  try {
    const datedFacts = allFacts.filter(f => f.year != null);
    const undatedFacts = allFacts.filter(f => f.year == null);

    if (gapFillingMode === 'dating-only' && undatedFacts.length === 0) {
      deps.log?.('skipping gap-filling: density high, no undated facts');
    } else {
      const gapPrompt = buildBiographyGapFillingPrompt({
        articleTitle: subjectName,
        extract: fullExtract,
        existingFacts: datedFacts.map(f => `[${f.year}] ${f.details}`),
        undatedFacts: undatedFacts.length > 0 ? undatedFacts.map(f => f.details) : undefined,
        mode: gapFillingMode,
        deathYear: extractedDeathYear,
        emphasis: isLiteProfile(deps)
          ? `МЕТОД РАБОТЫ: перечитай статью РАЗДЕЛ ЗА РАЗДЕЛОМ и сверь каждый раздел со списком выше — всё недостающее выпиши.\n${LITE_DATING_EXAMPLES}`
          : undefined,
      });
      const gapResult = await deps.callModel(
        {
          model: params.deps.model ?? DEFAULT_BIOGRAPHY_MODEL,
          contents: [{ role: 'user', parts: [{ text: gapPrompt }] }],
          config: extractionCallConfig(deps),
        },
        'gap-filling'
      );
      deps.onTokens?.(extractTotalTokens(gapResult));

      // Start from dated facts only; gap-filling returns both new facts and re-dated old ones
      allFacts = [...datedFacts];
      const gapFacts = parseSimpleJsonFacts(collectGeminiResultText(gapResult));
      if (gapFacts.length > 0) {
        allFacts.push(...gapFacts);
      }
      allFacts = deduplicateFacts(allFacts);
      // gap-filling может добавить посмертный мусор — фильтр повторно
      allFacts = filterFactsBeyondDeath(allFacts, extractedDeathYear);
    }
  } catch (error) {
    // Gap-filling is best-effort
    deps.logError?.('gap-filling failed', { error: String(error) });
  }

  // Гард фабрикации годов: аномальный кластер одного года (не-thinking
  // модели сваливают нарративные факты в один год) → год снимается.
  // Размещение ПОСЛЕ gap-filling: промпты не меняются, кэш реплеится.
  const yearGuard = stripFabricatedYearClusters(allFacts);
  allFacts = yearGuard.facts;
  if (yearGuard.yearsStripped > 0) {
    deps.log?.('date guard: год снят с аномального кластера', { yearsStripped: yearGuard.yearsStripped });
  }

  await deps.onStage?.('gap-filling', stageData());
  progress(3, TOTAL_STEPS, 'Добивочный проход (gap-filling)', `${allFacts.length} фактов после добивки`);

  progress(4, TOTAL_STEPS, 'Аннотация и тематизация', `${allFacts.length} фактов`);
  let finalFacts: BiographyFactCandidate[];
  let annotations: Map<number, AnnotationEntry>;
  let redactedCount: number;
  if (deps.mergedMarkup || isLiteProfile(deps)) {
    // BPT-9: один вызов вместо двух
    const merged = await markupBiographyFactsMerged({ deps, subjectName, facts: allFacts });
    finalFacts = merged.facts;
    annotations = merged.annotations;
    redactedCount = merged.redactedCount;
    progress(5, TOTAL_STEPS, 'Редактура и ранжирование', `${finalFacts.length} фактов`);
  } else {
    const annotated = await annotateBiographyFacts({
      deps,
      subjectName,
      facts: allFacts,
    });
    annotations = annotated.annotations;

    progress(5, TOTAL_STEPS, 'Редактура и ранжирование', `${annotated.annotatedFacts.length} фактов`);
    const redacted = await redaktBiographyFacts({
      deps,
      subjectName,
      facts: annotated.annotatedFacts,
      annotations,
    });
    finalFacts = redacted.facts;
    redactedCount = redacted.redactedCount;
  }
  const stepCoverage = {
    factsTotal: finalFacts.length,
    annotated: annotations.size,
    redacted: redactedCount,
  };
  // Гард фиктивных месяцев (после annotation/redaktura — месяцы финальны;
  // в downstream-промптах месяцев нет, кэш реплеится).
  const monthGuard = stripUnreliableMonths(finalFacts);
  const guardedFacts = monthGuard.facts;
  if (monthGuard.monthsStripped > 0) {
    deps.log?.('date guard: месяцы фиктивны (модальный месяц)', { monthsStripped: monthGuard.monthsStripped });
  }
  const dateSanity = {
    monthsStripped: monthGuard.monthsStripped,
    yearsStripped: yearGuard.yearsStripped,
  };
  allFacts = guardedFacts;
  await deps.onStage?.('redaktura', stageData());

  progress(6, TOTAL_STEPS, 'Композиция и визуализация');
  const composition = await composeBiographyFactsIntoTimeline({
    deps,
    subjectName,
    facts: guardedFacts,
  });

  // Convert composition → plan → timeline data
  let timeline: BiographyTimelineData | undefined;
  let plan: BiographyTimelinePlan | undefined;
  let planDiagnostics: BiographyPipelineResult['planDiagnostics'];
  let timelineStats: BiographyPipelineResult['timelineStats'];

  try {
    const rawPlan = buildPlanFromCompositionResult({
      subjectName,
      facts: guardedFacts,
      composition,
    });
    plan = cleanGenericEventLabels({ plan: rawPlan, facts: guardedFacts });

    timeline = buildTimelineDataFromBiographyPlan(plan);

    planDiagnostics = {
      source: 'facts-first',
      mainEvents: plan.mainEvents.length,
      branches: plan.branches.length,
      branchEvents: plan.branches.reduce((sum, b) => sum + b.events.length, 0),
      hasBirthDate: Boolean(plan.birthDetails?.date),
      hasBirthPlace: Boolean(plan.birthDetails?.place),
    };

    timelineStats = {
      nodes: timeline.nodes.length,
      edges: timeline.edges.length,
      hasBirthDate: Boolean(timeline.birthDetails?.date),
      hasBirthPlace: Boolean(timeline.birthDetails?.place),
    };

    deps.log?.('timeline built', {
      mainEvents: plan.mainEvents.length,
      branches: plan.branches.length,
      nodes: timeline.nodes.length,
      edges: timeline.edges.length,
    });
  } catch (error) {
    deps.logError?.('plan/timeline conversion failed — returning facts without timeline', { error: String(error) });
  }

  return {
    wikiPage,
    subjectName,
    rawTextChars: len,
    factsModel,
    stepCoverage,
    dateSanity,
    facts: guardedFacts,
    composition,
    timeline,
    plan,
    planDiagnostics,
    timelineStats,
  };
}

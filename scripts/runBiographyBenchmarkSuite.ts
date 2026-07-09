/**
 * Benchmark-suite для biography import pipeline.
 *
 * Режимы:
 *   --fetch-fixtures            скачать статьи Wikipedia в fixtures (0 токенов)
 *   --set=worker|holdout|all    прогнать pipeline по набору (по умолчанию worker)
 *   --articles=id1,id2          явный список статей
 *   --live                      разрешить live-вызовы Gemini при cache miss
 *                               (только после одобрения бюджета!)
 *   --variant=a|b               b = второй независимый прогон (стабильность)
 *   --tag=baseline              подпись прогона; отчёт кладётся в
 *                               tests/fixtures/biography/reports/<tag>.json
 *   --compare=tagA,tagB         сравнить два сохранённых отчёта
 *
 * Без --live прогон детерминированно реплеится из кэша (0 токенов).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  fetchWikipediaPlainExtract,
  type WikipediaPageExtract,
} from '../server/api/timelineBiography.js';
import {
  runBiographyImport,
  setBiographyGenAiClientFactory,
} from '../server/api/timelineBiographyRuntime.js';
import { biographyBenchmarkSet, type BiographyBenchmarkEntry } from './lib/biographyBenchmarkSet';
import {
  createCachingBiographyClient,
  createEmptyStats,
  type CachingClientStats,
} from './lib/biographyGeminiCache';
import {
  buildArticleMetrics,
  aggregateMetrics,
  formatAggregateTable,
  compareAggregates,
  type ArticleMetrics,
} from './lib/biographyBenchmarkMetrics';

const WIKI_FIXTURES_DIR = path.resolve(process.cwd(), 'tests/fixtures/biography/wiki');
const REPORTS_DIR = path.resolve(process.cwd(), 'tests/fixtures/biography/reports');

type CliOptions = {
  fetchFixtures: boolean;
  set: 'worker' | 'holdout' | 'all';
  articles: string[] | null;
  live: boolean;
  variant: 'a' | 'b';
  tag: string | null;
  compare: [string, string] | null;
  maxLiveCalls: number | null;
  model: string | null;
  minFacts: number | null;
  mergedMarkup: boolean;
  structured: boolean;
  fewShot: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    fetchFixtures: false,
    set: 'worker',
    articles: null,
    live: false,
    variant: 'a',
    tag: null,
    compare: null,
    maxLiveCalls: null,
    model: null,
    minFacts: null,
    mergedMarkup: false,
    structured: false,
    fewShot: false,
  };
  for (const arg of argv) {
    if (arg === '--fetch-fixtures') options.fetchFixtures = true;
    else if (arg.startsWith('--set=')) options.set = arg.slice(6) as CliOptions['set'];
    else if (arg.startsWith('--articles=')) options.articles = arg.slice(11).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--live') options.live = true;
    else if (arg.startsWith('--variant=')) options.variant = arg.slice(10) as 'a' | 'b';
    else if (arg.startsWith('--tag=')) options.tag = arg.slice(6).trim() || null;
    else if (arg.startsWith('--compare=')) {
      const [a, b] = arg.slice(10).split(',').map((s) => s.trim());
      if (a && b) options.compare = [a, b];
    }
    else if (arg.startsWith('--max-live-calls=')) {
      const n = parseInt(arg.slice(17), 10);
      if (Number.isFinite(n) && n > 0) options.maxLiveCalls = n;
    }
    else if (arg.startsWith('--model=')) {
      options.model = arg.slice(8).trim() || null;
    }
    else if (arg === '--merged-markup') options.mergedMarkup = true;
    else if (arg === '--structured') options.structured = true;
    else if (arg === '--few-shot') options.fewShot = true;
    else if (arg.startsWith('--min-facts=')) {
      const n = parseInt(arg.slice(12), 10);
      if (Number.isFinite(n) && n > 0) options.minFacts = n;
    }
  }
  return options;
}

/** Собирает экспериментальную добавку к focusHint: процедурное дробление
 *  (--min-facts) и few-shot про честное year=null (--few-shot). */
function buildEmphasis(options: CliOptions): string | undefined {
  const parts: string[] = [];
  if (options.minFacts) {
    parts.push(
      `ВАЖНО — метод дробления: каждое предложение статьи, содержащее дату, имя, произведение, место или перемену статуса — это ОТДЕЛЬНЫЙ факт. Составное предложение с несколькими событиями дели на несколько фактов. Не обобщай и не сжимай. Верни не менее ${options.minFacts} фактов.`
    );
  }
  if (options.fewShot) {
    parts.push(
      [
        'ПРИМЕРЫ ПРАВИЛЬНОЙ ДАТИРОВКИ:',
        'Текст: «В 1927 году переехал в Париж.» → {"year": 1927, "text": "Переехал в Париж", "category": "move", "sphere": "place"}',
        'Текст: «Позднее активно выступал против войны.» (год из текста НЕ следует) → {"year": null, "text": "Активно выступал против войны", "category": "other", "sphere": "other"}',
        'Текст: «В эти годы много путешествовал по Европе.» (точного года нет) → {"year": null, "text": "Много путешествовал по Европе", "category": "move", "sphere": "place"}',
        'НИКОГДА не приписывай факту год соседнего события или начала десятилетия. Нет года в тексте — ставь null.',
      ].join('\n')
    );
  }
  return parts.length > 0 ? parts.join('\n') : undefined;
}

function printLine(value = '') {
  process.stdout.write(`${value}\n`);
}

function selectEntries(options: CliOptions): BiographyBenchmarkEntry[] {
  if (options.articles) {
    return options.articles.map((id) => {
      const entry = biographyBenchmarkSet.find((e) => e.id === id);
      if (!entry) throw new Error(`Неизвестная статья benchmark'а: ${id}`);
      return entry;
    });
  }
  if (options.set === 'all') return biographyBenchmarkSet;
  return biographyBenchmarkSet.filter((e) => e.set === options.set);
}

function wikiFixturePath(id: string) {
  return path.join(WIKI_FIXTURES_DIR, `${id}.json`);
}

function loadWikiFixture(id: string): WikipediaPageExtract {
  const filePath = wikiFixturePath(id);
  if (!existsSync(filePath)) {
    throw new Error(`Нет fixture статьи «${id}» — запусти сначала --fetch-fixtures.`);
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as WikipediaPageExtract;
}

async function fetchFixtures(entries: BiographyBenchmarkEntry[]) {
  mkdirSync(WIKI_FIXTURES_DIR, { recursive: true });
  for (const entry of entries) {
    const filePath = wikiFixturePath(entry.id);
    if (existsSync(filePath)) {
      const existing = JSON.parse(readFileSync(filePath, 'utf8')) as WikipediaPageExtract;
      printLine(`= ${entry.id}: fixture уже есть (${Math.round(existing.biographyExtract.length / 1000)}K), пропуск`);
      continue;
    }
    const page = await fetchWikipediaPlainExtract(entry.sourceUrl);
    writeFileSync(filePath, JSON.stringify(page, null, 2), 'utf8');
    printLine(
      `+ ${entry.id}: «${page.title}» — extract ${Math.round(page.extract.length / 1000)}K, ` +
        `biography ${Math.round(page.biographyExtract.length / 1000)}K, slices ${page.factExtractSlices.length}`
    );
  }
}

async function runSuite(options: CliOptions) {
  const entries = selectEntries(options);
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.MY_GEMINI_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    'cache-only';

  const results: ArticleMetrics[] = [];
  for (const entry of entries) {
    const page = loadWikiFixture(entry.id);
    const stats: CachingClientStats = createEmptyStats();
    setBiographyGenAiClientFactory(() =>
      createCachingBiographyClient({
        articleId: entry.id,
        variant: options.variant,
        live: options.live,
        apiKey,
        stats,
        maxLiveCalls: options.maxLiveCalls ?? undefined,
      })
    );

    printLine(`\n=== ${entry.id} (${entry.set}, ${entry.categories.join(', ')}) ===`);
    const startedAt = Date.now();
    try {
      const payload = await runBiographyImport({
        sourceUrl: entry.sourceUrl,
        apiKey,
        page,
        model: options.model ?? undefined,
        mergedMarkup: options.mergedMarkup || undefined,
        structuredExtraction: options.structured || undefined,
        extractionEmphasis: buildEmphasis(options),
      });
      if (stats.dailyQuotaHit) {
        // 429 мог быть проглочен best-effort шагами pipeline (redaktura,
        // composition-fallback) — такие метрики это мусор, а не замер.
        throw new Error('дневная квота выбита посреди статьи — метрики отброшены');
      }
      const metrics = buildArticleMetrics({ entry, payload, stats, wallClockMs: Date.now() - startedAt });
      results.push(metrics);
      printLine(
        `  nodes=${metrics.structure.nodes} edges=${metrics.structure.edges} ` +
          `refViolations=${metrics.structure.referentialViolations} ` +
          `normalizeEdits=${metrics.structure.normalizeEdits.total} ` +
          `coverage=${metrics.coverage ? `${metrics.coverage.timelineMatched}/${metrics.coverage.totalFacts}` : 'n/a'} ` +
          `tokens=${metrics.cost.totalTokens} (live=${stats.liveCalls}, cached=${stats.hits})`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      printLine(`  FAILED: ${message}`);
      results.push({
        articleId: entry.id,
        set: entry.set,
        categories: entry.categories,
        failed: true,
        failureMessage: message,
      } as ArticleMetrics);
    } finally {
      setBiographyGenAiClientFactory(null);
    }

    if (stats.dailyQuotaHit) {
      printLine('\n!! Дневная квота free tier выбита — прогон остановлен, продолжение завтра/другим ключом (кэш сохранён).');
      break;
    }
  }

  const aggregate = aggregateMetrics(results, { variant: options.variant });
  printLine('');
  printLine(formatAggregateTable(aggregate));

  if (options.tag) {
    mkdirSync(REPORTS_DIR, { recursive: true });
    const reportPath = path.join(REPORTS_DIR, `${options.tag}.json`);
    writeFileSync(reportPath, JSON.stringify({ aggregate, results }, null, 2), 'utf8');
    printLine(`\nОтчёт: ${reportPath}`);
  }
}

function runCompare(tags: [string, string]) {
  const load = (tag: string) => {
    const filePath = path.join(REPORTS_DIR, `${tag}.json`);
    if (!existsSync(filePath)) throw new Error(`Нет отчёта ${filePath}`);
    return JSON.parse(readFileSync(filePath, 'utf8')) as { aggregate: unknown; results: ArticleMetrics[] };
  };
  const a = load(tags[0]);
  const b = load(tags[1]);
  printLine(compareAggregates(tags[0], a.results, tags[1], b.results));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.compare) {
    runCompare(options.compare);
    return;
  }
  if (options.fetchFixtures) {
    await fetchFixtures(selectEntries({ ...options, set: 'all', articles: options.articles }));
    return;
  }
  await runSuite(options);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});

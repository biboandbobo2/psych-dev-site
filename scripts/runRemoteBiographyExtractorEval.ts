import fs from 'node:fs/promises';
import path from 'node:path';

type RemoteExtractorEvalOptions = {
  apiKey: string;
  baseUrl: string;
  extractionMode: 'general' | 'editorial';
  filenamePrefix: string | null;
  outDir: string;
  sourceUrl: string;
};

type ExtractorSuccessPayload = {
  ok: true;
  sourceUrl: string;
  subjectName: string | null;
  facts: Array<Record<string, unknown>>;
  meta: Record<string, unknown>;
};

function parseArgs(argv: string[]): RemoteExtractorEvalOptions {
  let baseUrl = process.env.TIMELINE_AUTOMATION_BASE_URL?.trim() || '';
  let sourceUrl = '';
  let outDir = path.resolve(process.cwd(), 'tmp/extractor-runs');
  let filenamePrefix: string | null = null;
  let extractionMode: 'general' | 'editorial' = 'general';
  let apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.MY_GEMINI_KEY?.trim() ||
    process.env.VITE_GEMINI_KEY?.trim() ||
    '';

  argv.forEach((arg) => {
    if (arg.startsWith('--base-url=')) {
      baseUrl = arg.slice('--base-url='.length).trim();
      return;
    }

    if (arg.startsWith('--source-url=')) {
      sourceUrl = arg.slice('--source-url='.length).trim();
      return;
    }

    if (arg.startsWith('--out-dir=')) {
      outDir = path.resolve(process.cwd(), arg.slice('--out-dir='.length).trim());
      return;
    }

    if (arg.startsWith('--filename=')) {
      filenamePrefix = arg.slice('--filename='.length).trim() || null;
      return;
    }

    if (arg.startsWith('--mode=')) {
      extractionMode = arg.slice('--mode='.length).trim() === 'editorial' ? 'editorial' : 'general';
      return;
    }

    if (arg.startsWith('--api-key=')) {
      apiKey = arg.slice('--api-key='.length).trim();
    }
  });

  if (!baseUrl) {
    throw new Error('Укажите --base-url или TIMELINE_AUTOMATION_BASE_URL.');
  }

  if (!sourceUrl) {
    throw new Error('Укажите --source-url.');
  }

  if (!apiKey) {
    throw new Error('Укажите --api-key или GEMINI_API_KEY.');
  }

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    extractionMode,
    filenamePrefix,
    outDir,
    sourceUrl,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'extractor-run';
}

function buildRunName(options: RemoteExtractorEvalOptions, payload?: ExtractorSuccessPayload) {
  if (options.filenamePrefix) {
    return slugify(options.filenamePrefix);
  }

  if (payload?.subjectName) {
    return slugify(payload.subjectName);
  }

  return slugify(options.sourceUrl);
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const response = await fetch(`${options.baseUrl}/api/timeline-biography-extractor-automation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gemini-Api-Key': options.apiKey,
    },
    body: JSON.stringify({
      extractionMode: options.extractionMode,
      sourceUrl: options.sourceUrl,
    }),
  });

  const payload = (await response.json()) as ExtractorSuccessPayload | { ok: false; error?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload && 'error' in payload && payload.error ? payload.error : `HTTP ${response.status}`);
  }

  const runName = buildRunName(options, payload);
  const runDir = path.join(options.outDir, runName);
  await ensureDir(runDir);
  await writeJson(path.join(runDir, 'response.json'), payload);

  const summary = {
    baseUrl: options.baseUrl,
    extractionMode: options.extractionMode,
    sourceUrl: options.sourceUrl,
    subjectName: payload.subjectName,
    factCount: payload.facts.length,
    files: {
      response: path.join(runDir, 'response.json'),
    },
    meta: payload.meta,
  };

  await writeJson(path.join(runDir, 'summary.json'), summary);

  process.stdout.write(`Remote extractor run complete: ${runDir}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write('Remote extractor eval failed\n');
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});

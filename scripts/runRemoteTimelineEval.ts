import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

type RemoteEvalOptions = {
  apiKey: string;
  automationPath: string;
  baseUrl: string;
  filenamePrefix: string | null;
  outDir: string;
  sourceUrl: string;
};

type AutomationSuccessPayload = {
  ok: true;
  canvasName: string;
  subjectName: string;
  timeline: {
    currentAge: number;
    ageMax: number;
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
    birthDetails?: Record<string, unknown>;
    selectedPeriodization?: string | null;
  };
  meta: Record<string, unknown>;
};

function parseArgs(argv: string[]): RemoteEvalOptions {
  let baseUrl = process.env.TIMELINE_AUTOMATION_BASE_URL?.trim() || '';
  let sourceUrl = '';
  let outDir = path.resolve(process.cwd(), 'tmp/timeline-runs');
  let filenamePrefix: string | null = null;
  let apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.MY_GEMINI_KEY?.trim() ||
    process.env.VITE_GEMINI_KEY?.trim() ||
    '';
  let automationPath = '/_timeline/automation';

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

    if (arg.startsWith('--api-key=')) {
      apiKey = arg.slice('--api-key='.length).trim();
      return;
    }

    if (arg.startsWith('--automation-path=')) {
      automationPath = arg.slice('--automation-path='.length).trim() || automationPath;
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
    automationPath,
    baseUrl: baseUrl.replace(/\/+$/, ''),
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
    .slice(0, 80) || 'timeline-run';
}

function buildRunName(options: RemoteEvalOptions, payload?: AutomationSuccessPayload) {
  if (options.filenamePrefix) {
    return slugify(options.filenamePrefix);
  }

  if (payload?.subjectName) {
    return slugify(payload.subjectName);
  }

  return slugify(options.sourceUrl);
}

async function callAutomationEndpoint(options: RemoteEvalOptions) {
  const response = await fetch(`${options.baseUrl}/api/timeline-biography-automation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gemini-Api-Key': options.apiKey,
    },
    body: JSON.stringify({
      sourceUrl: options.sourceUrl,
    }),
  });

  const payload = (await response.json()) as AutomationSuccessPayload | { ok: false; error?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload && 'error' in payload && payload.error ? payload.error : `HTTP ${response.status}`);
  }

  return payload;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath: string, value: unknown) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function downloadArtifacts(options: RemoteEvalOptions, payload: AutomationSuccessPayload, runDir: string, runName: string) {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: {
        width: 1600,
        height: 1200,
      },
    });

    const page = await context.newPage();
    await page.addInitScript((injectedPayload) => {
      (globalThis as { __TIMELINE_AUTOMATION_PAYLOAD__?: unknown }).__TIMELINE_AUTOMATION_PAYLOAD__ = injectedPayload;
    }, payload);

    const renderUrl = `${options.baseUrl}${options.automationPath}?filename=${encodeURIComponent(runName)}`;
    await page.goto(renderUrl, {
      timeout: 120000,
      waitUntil: 'load',
    });
    await page.getByTestId('timeline-automation-ready').waitFor();

    const jsonDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('timeline-automation-download-json').click();
    const jsonDownload = await jsonDownloadPromise;
    await jsonDownload.saveAs(path.join(runDir, `${runName}.json`));

    const pdfDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('timeline-automation-download-pdf').click();
    const pdfDownload = await pdfDownloadPromise;
    await pdfDownload.saveAs(path.join(runDir, `${runName}.pdf`));

    await page.screenshot({
      path: path.join(runDir, `${runName}.png`),
      fullPage: true,
    });

    await context.close();
  } finally {
    await browser.close();
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const payload = await callAutomationEndpoint(options);
  const runName = buildRunName(options, payload);
  const runDir = path.join(options.outDir, runName);

  await ensureDir(runDir);
  await writeJson(path.join(runDir, 'response.json'), payload);

  await downloadArtifacts(options, payload, runDir, runName);

  const summary = {
    baseUrl: options.baseUrl,
    files: {
      json: path.join(runDir, `${runName}.json`),
      pdf: path.join(runDir, `${runName}.pdf`),
      screenshot: path.join(runDir, `${runName}.png`),
      response: path.join(runDir, 'response.json'),
    },
    sourceUrl: options.sourceUrl,
    subjectName: payload.subjectName,
    timeline: {
      currentAge: payload.timeline.currentAge,
      ageMax: payload.timeline.ageMax,
      edges: payload.timeline.edges.length,
      nodes: payload.timeline.nodes.length,
    },
  };

  await writeJson(path.join(runDir, 'summary.json'), summary);

  console.log(`Remote timeline run complete: ${runDir}`);
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error('Remote timeline eval failed');
  console.error(error);
  process.exit(1);
});

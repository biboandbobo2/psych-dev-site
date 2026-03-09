#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const expected = {
  firebaseRuntime: 'nodejs22',
  functionsEngine: '22',
  rootNodeRange: '>=22 <23',
  nvmrc: '22',
};

function readJson(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  return fs.readFileSync(filePath, 'utf8').trim();
}

const checks = [
  {
    label: 'firebase runtime',
    actual: readJson('firebase.json').functions?.runtime,
    expected: expected.firebaseRuntime,
    fix: 'Обновите firebase.json -> functions.runtime до nodejs22.',
  },
  {
    label: 'functions engines.node',
    actual: readJson('functions/package.json').engines?.node,
    expected: expected.functionsEngine,
    fix: 'Обновите functions/package.json -> engines.node до 22.',
  },
  {
    label: 'root engines.node',
    actual: readJson('package.json').engines?.node,
    expected: expected.rootNodeRange,
    fix: 'Обновите package.json -> engines.node до >=22 <23.',
  },
  {
    label: '.nvmrc',
    actual: readText('.nvmrc'),
    expected: expected.nvmrc,
    fix: 'Обновите .nvmrc до 22.',
  },
];

const failures = checks.filter((check) => check.actual !== check.expected);
const legacyConfigHits = [];

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'lib' || entry.name === 'node_modules') {
        continue;
      }
      walk(fullPath);
      continue;
    }

    if (!fullPath.endsWith('.ts')) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('functions.config(')) {
      legacyConfigHits.push(path.relative(projectRoot, fullPath));
    }
  }
}

walk(path.join(projectRoot, 'functions', 'src'));

if (failures.length === 0 && legacyConfigHits.length === 0) {
  process.stdout.write('Functions runtime check passed: project is pinned to Node 22 and legacy config is not used.\n');
  process.exit(0);
}

const lines = [
  'Deploy blocked: Cloud Functions must stay on Node 22 and avoid legacy functions.config().',
  '',
  ...failures.flatMap((failure) => [
    `- ${failure.label}: expected "${failure.expected}", got "${failure.actual ?? 'undefined'}"`,
    `  ${failure.fix}`,
  ]),
  ...(legacyConfigHits.length > 0
    ? [
        ...legacyConfigHits.map(
          (file) => `- legacy functions.config() detected in ${file}`
        ),
        '  Перенесите конфиг в Secret Manager или env/params и уберите functions.config().',
      ]
    : []),
  '',
  'Исправьте конфиг и повторите команду.',
];

process.stderr.write(`${lines.join('\n')}\n`);
process.exit(1);

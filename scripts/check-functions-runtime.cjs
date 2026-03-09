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

if (failures.length === 0) {
  process.stdout.write('Functions runtime check passed: project is pinned to Node 22.\n');
  process.exit(0);
}

const lines = [
  'Deploy blocked: Cloud Functions runtime must stay on Node 22.',
  '',
  ...failures.flatMap((failure) => [
    `- ${failure.label}: expected "${failure.expected}", got "${failure.actual ?? 'undefined'}"`,
    `  ${failure.fix}`,
  ]),
  '',
  'Исправьте конфиг и повторите команду.',
];

process.stderr.write(`${lines.join('\n')}\n`);
process.exit(1);

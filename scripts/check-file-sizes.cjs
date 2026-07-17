#!/usr/bin/env node
/**
 * Гейт «светофора размеров» из docs/architecture/guidelines.md.
 *
 * Правило: новый файл > LIMIT строк блокирует коммит (exit 1).
 * Легаси-список LEGACY заморожен на 2026-07-17: эти файлы дают только warning.
 * НЕ добавляйте новые записи в LEGACY — новые крупные файлы надо разбивать.
 * Когда легаси-файл похудел ниже лимита, скрипт подскажет убрать его из списка.
 */
const fs = require('node:fs');
const path = require('node:path');

const LIMIT = 500;
const ROOTS = ['src', 'api', 'functions/src', 'server'];

const LEGACY = new Set([
  'server/api/timelineBiographyPipeline.ts',
  'functions/src/billingExport.ts',
  'src/pages/DisorderTable.tsx',
  'src/pages/Timeline.tsx',
  'server/api/timelineBiographyFacts.ts',
  'src/pages/timeline/components/TimelineCanvas.tsx',
  'src/pages/timeline/utils/exporters/svgRenderer.ts',
  'server/api/timelineBiographyLint.ts',
  'server/api/timelineBiographyHeuristics.ts',
]);

// Исключения светофора (см. guidelines): тесты, типы, константы, данные, конфиги
const EXEMPT_RE =
  /(\.test\.tsx?$|\.d\.ts$|__tests__|[\\/]data[\\/]|types?\.tsx?$|constants?\.tsx?$|config\.tsx?$)/i;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = ROOTS.filter((root) => fs.existsSync(root)).flatMap((root) => walk(root, []));

const violations = [];
const legacyOver = [];
const legacySlim = [];

for (const file of files) {
  const rel = file.split(path.sep).join('/');
  if (EXEMPT_RE.test(rel)) continue;
  const content = fs.readFileSync(file, 'utf8');
  // как wc -l: считаем переводы строк, а не фрагменты
  const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
  if (LEGACY.has(rel)) {
    if (lines > LIMIT) legacyOver.push({ rel, lines });
    else legacySlim.push({ rel, lines });
    continue;
  }
  if (lines > LIMIT) violations.push({ rel, lines });
}

if (legacyOver.length) {
  console.log(`⚠️  Легаси-файлы над лимитом ${LIMIT} (заморожены, рефакторить по мере касания):`);
  for (const { rel, lines } of legacyOver) console.log(`   ${lines}\t${rel}`);
}
if (legacySlim.length) {
  console.log('💡 Эти файлы похудели ниже лимита — уберите их из LEGACY в scripts/check-file-sizes.cjs:');
  for (const { rel, lines } of legacySlim) console.log(`   ${lines}\t${rel}`);
}

if (violations.length) {
  console.error(`\n❌ Новые файлы больше ${LIMIT} строк (светофор: разбейте перед коммитом):`);
  for (const { rel, lines } of violations) console.error(`   ${lines}\t${rel}`);
  console.error('   См. docs/architecture/guidelines.md → «Правила размера файлов».');
  process.exit(1);
}

console.log(`✅ check:file-sizes OK (${files.length} файлов, лимит ${LIMIT})`);

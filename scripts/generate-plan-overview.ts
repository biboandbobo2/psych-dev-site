import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type PlanEntry = {
  subsystem: string;
  plan: string;
  docLink: string;
  status: string;
  nextStep: string;
  artifacts: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const configPath = path.resolve(repoRoot, 'docs/plan-overview.json');
const docPath = path.resolve(repoRoot, 'docs/PLANS_OVERVIEW.md');

const entries: PlanEntry[] = JSON.parse(readFileSync(configPath, 'utf8'));

const header =
  '| Подсистема | План | Документ | Текущий статус | Следующий шаг | Ключевые артефакты |';
const separator =
  '|------------|------|----------|----------------|---------------|--------------------|';

const tableRows = entries
  .map((entry) => {
    const artifacts = entry.artifacts.join(', ');
    const docLink = `[${entry.docLink}](${entry.docLink})`;
    return `| ${entry.subsystem} | ${entry.plan} | ${docLink} | ${entry.status} | ${entry.nextStep} | ${artifacts} |`;
  })
  .join('\n');

const table = [header, separator, tableRows].join('\n');

const startMarker = '<!-- plans:table:start -->';
const endMarker = '<!-- plans:table:end -->';

const docContent = readFileSync(docPath, 'utf8');
const startIndex = docContent.indexOf(startMarker);
const endIndex = docContent.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  throw new Error('Не удалось найти маркеры таблицы в docs/PLANS_OVERVIEW.md');
}

const before = docContent.slice(0, startIndex + startMarker.length);
const after = docContent.slice(endIndex);
const nextContent = `${before}\n\n${table}\n\n${after}`.replace(/\n{3,}/g, '\n\n');

writeFileSync(docPath, nextContent.trimEnd() + '\n');

console.log('Таблица планов обновлена.');

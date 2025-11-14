import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Entry = {
  label: string;
  filePath: string;
};

type DocConfig = {
  docPath: string;
  entries: Entry[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const docs: DocConfig[] = [
  {
    docPath: 'docs/TestingSystemGuide.md',
    entries: [
      { label: 'TestEditorForm.tsx', filePath: 'src/components/TestEditorForm.tsx' },
      { label: 'QuestionEditor.tsx', filePath: 'src/components/QuestionEditor.tsx' },
      { label: 'TestEditorModal.tsx', filePath: 'src/components/TestEditorModal.tsx' },
      { label: 'Tests.tsx', filePath: 'src/pages/TestsPage.tsx' },
      { label: 'AgeTests.tsx', filePath: 'src/pages/TestsPage.tsx' },
      { label: 'DynamicTest.tsx', filePath: 'src/pages/DynamicTest.tsx' },
    ],
  },
  {
    docPath: 'docs/TimelineGuide.md',
    entries: [{ label: 'Timeline.tsx', filePath: 'src/pages/Timeline.tsx' }],
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countLines(relativePath: string) {
  const absolute = path.resolve(repoRoot, relativePath);
  const fileContent = readFileSync(absolute, 'utf8');
  return fileContent.split('\n').length;
}

let totalUpdates = 0;

for (const doc of docs) {
  const absoluteDocPath = path.resolve(repoRoot, doc.docPath);
  let docContent = readFileSync(absoluteDocPath, 'utf8');
  let docUpdated = false;

  for (const entry of doc.entries) {
    const lineCount = countLines(entry.filePath);
    const patterns = [
      new RegExp(
        `(${escapeRegExp(entry.label)}[^\\n]*?\\()(~?)(\\d+)(?=\\s+строк[аи]?)`,
        'g',
      ),
      new RegExp(
        `(${escapeRegExp(entry.label)}[^\\n]*?#\\s*)(~?)(\\d+)(?=\\s+строк[аи]?)`,
        'g',
      ),
    ];

    let entryUpdated = false;

    for (const regex of patterns) {
      let localMatch = false;
      docContent = docContent.replace(regex, (_, prefix: string, tilde: string) => {
        docUpdated = true;
        localMatch = true;
        return `${prefix}${tilde ?? ''}${lineCount}`;
      });

      if (localMatch) {
        entryUpdated = true;
      }
    }

    if (!entryUpdated) {
      throw new Error(
        `Не удалось найти блок с метрикой для "${entry.label}" в ${doc.docPath}`,
      );
    }
  }

  if (docUpdated) {
    writeFileSync(absoluteDocPath, docContent);
    totalUpdates += 1;
    console.log(`Обновлены метрики: ${doc.docPath}`);
  }
}

console.log(`Готово. Документов обновлено: ${totalUpdates}`);

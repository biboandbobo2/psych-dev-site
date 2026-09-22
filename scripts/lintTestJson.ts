/**
 * Линтер JSON-исходника теста: ловит «угадайки» и нарушения чек-листа
 * из docs/guides/testing-system.md до публикации.
 *
 * Использование:
 *   npx tsx scripts/lintTestJson.ts <json-path> [<json-path> ...]
 *
 * Ошибки (exit 1): уникальный маркер форматирования в части вариантов
 * (кавычки, скобки), правильный ответ заметно длиннее/короче остальных,
 * правильный — самый длинный в >40% вопросов, пустые explanation/resourcesRight,
 * shuffleAnswers/revealPolicy не по дефолту, БРЭ в ссылках, таймкод в названии
 * ссылки не совпадает с t= в URL, буквенные ссылки на варианты в explanation
 * (при shuffle буквы меняются).
 * Предупреждения: «лектор/лекция» в тексте вопроса, resourcesWrong ≠ resourcesRight.
 *
 * publishTestFromJson.ts вызывает lintTest() перед записью и не публикует при ошибках.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Resource { title: string; url: string }
interface Answer { id: string; text: string }
interface Question {
  id: string;
  questionText: string;
  answers: Answer[];
  correctAnswerId: string;
  shuffleAnswers?: boolean;
  revealPolicy?: { mode: string };
  explanation?: string;
  resourcesRight?: Resource[];
  resourcesWrong?: Resource[];
}

export interface LintReport { errors: string[]; warnings: string[] }

const MARKERS = ['«', '"', '('];
const LONGEST_SHARE_LIMIT = 0.4;

function lengthGap(maxOther: number): number {
  return Math.max(8, Math.round(maxOther * 0.1));
}

function timecodeSeconds(title: string): number | null {
  const m = title.match(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
  if (!m) return null;
  return m[3]
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    : Number(m[1]) * 60 + Number(m[2]);
}

function lintQuestion(q: Question, errors: string[], warnings: string[]): 'longest' | 'shortest' | null {
  const p = `${q.id}:`;
  const correct = q.answers.find((a) => a.id === q.correctAnswerId);
  if (!correct) {
    errors.push(`${p} correctAnswerId не найден среди answers`);
    return null;
  }

  for (const marker of MARKERS) {
    const withMarker = q.answers.filter((a) => a.text.includes(marker)).length;
    if (withMarker > 0 && withMarker < q.answers.length) {
      errors.push(`${p} маркер ${marker} есть только в ${withMarker} из ${q.answers.length} вариантов`);
    }
  }

  const others = q.answers.filter((a) => a.id !== q.correctAnswerId).map((a) => a.text.length);
  const c = correct.text.length;
  const maxOther = Math.max(...others);
  const minOther = Math.min(...others);
  if (c > maxOther + lengthGap(maxOther)) errors.push(`${p} правильный длиннее всех на ${c - maxOther} симв.`);
  if (c < minOther - lengthGap(minOther)) errors.push(`${p} правильный короче всех на ${minOther - c} симв.`);

  if (q.shuffleAnswers !== true) errors.push(`${p} shuffleAnswers должен быть true`);
  if (q.revealPolicy?.mode !== 'immediately') errors.push(`${p} revealPolicy.mode должен быть immediately`);
  if (!q.explanation?.trim()) errors.push(`${p} пустой explanation`);
  if (q.explanation && /\(([A-DА-Г])\)|вариант\s+[A-DА-Г]\b/.test(q.explanation)) {
    errors.push(`${p} буквенная ссылка на вариант в explanation (при shuffle буквы меняются)`);
  }
  if (!q.resourcesRight?.length) errors.push(`${p} пустой resourcesRight`);

  for (const r of [...(q.resourcesRight ?? []), ...(q.resourcesWrong ?? [])]) {
    if (r.url.includes('bigenc.ru')) errors.push(`${p} БРЭ запрещена: ${r.url}`);
    const tc = timecodeSeconds(r.title);
    const tParam = r.url.match(/[?&]t=(\d+)/);
    if (tc !== null && tParam && Number(tParam[1]) !== tc) {
      errors.push(`${p} «${r.title}» ≠ t=${tParam[1]} (ожидалось t=${tc})`);
    }
  }

  if (/лектор|лекци/i.test(q.questionText)) warnings.push(`${p} «лектор/лекция» в тексте вопроса`);
  if (JSON.stringify(q.resourcesWrong ?? []) !== JSON.stringify(q.resourcesRight ?? [])) {
    warnings.push(`${p} resourcesWrong ≠ resourcesRight`);
  }

  if (c > maxOther) return 'longest';
  if (c < minOther) return 'shortest';
  return null;
}

export function lintTest(questions: Question[]): LintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  let longest = 0;
  let shortest = 0;
  for (const q of questions) {
    const extreme = lintQuestion(q, errors, warnings);
    if (extreme === 'longest') longest++;
    if (extreme === 'shortest') shortest++;
  }
  const limit = Math.floor(questions.length * LONGEST_SHARE_LIMIT);
  if (longest > limit) errors.push(`правильный — самый длинный в ${longest}/${questions.length} вопросах (лимит ${limit})`);
  if (shortest > limit) errors.push(`правильный — самый короткий в ${shortest}/${questions.length} вопросах (лимит ${limit})`);
  return { errors, warnings };
}

function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error('Usage: tsx scripts/lintTestJson.ts <json-path> [...]');
    process.exit(1);
  }
  let failed = false;
  for (const path of paths) {
    const source = JSON.parse(readFileSync(resolve(path), 'utf8'));
    const { errors, warnings } = lintTest(source.test.questions);
    console.log(`\n${source.test.title} (${path})`);
    for (const e of errors) console.log(`  ✗ ${e}`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    if (!errors.length) console.log('  ✓ ошибок нет');
    failed ||= errors.length > 0;
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main();
}

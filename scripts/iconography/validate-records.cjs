#!/usr/bin/env node
// Редакторский гейт паспортов иконографии. Запуск: node scripts/iconography/validate-records.cjs [id ...]
// Проверяет схему и педагогические правила из docs/guides/iconography-quiz-design.md.
const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');

const base = resolve(__dirname, '../../public/iconography');
const only = new Set(process.argv.slice(2));
const files = readdirSync(resolve(base, 'records')).filter((f) => f.endsWith('.json'));
const records = files.map((f) => JSON.parse(readFileSync(resolve(base, 'records', f), 'utf8'))).filter((r) => !only.size || only.has(r.id));

const LEVELS = ['beginner', 'explorer', 'expert'];
const VISUAL_TOPICS = new Set(['subject', 'people', 'type', 'attribute', 'mary', 'feast']);
const ABSURD = [/XX век/i, /XXI век/i, /до н\. ?э\./i, /Прадо/i, /Уффици/i, /Национальная галерея, Лондон/i, /Рафаэл/i, /автопортрет/i, /достоверная подпись/i, /Лувр/i];
const LEAK = /требует сверки|не уточн|не указан|расходятся|по записи репродукции|по актуальной карточке|не сверен/i;
const GROUPS = new Set(['christ', 'mary', 'nicholas', 'george', 'apostle', 'annunciation', 'nativity', 'baptism', 'transfiguration', 'entry', 'resurrection', 'dormition', 'ascension', 'baptist', 'elijah', 'archangel', 'presentation', 'pentecost', 'theodore', 'crucifixion', 'lazarus', 'noli', 'eustace', 'mary-entry', 'chrysostom', 'demetrius', 'deesis', 'trinity', 'boris-gleb', 'hierarchs', 'warrior', 'prophet', 'evangelist', 'saint']);

const norm = (s) => String(s || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const stem = (w) => w.length > 5 ? w.slice(0, w.length - 2) : w;
const leaksAnswer = (text, answer) => {
  const t = norm(text);
  const words = norm(answer).split(' ').filter((w) => w.length >= 5);
  return words.length > 0 && words.every((w) => t.includes(stem(w)));
};

const errors = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const promptsByLevel = { beginner: new Map(), explorer: new Map(), expert: new Map() };

function checkQuestion(id, q, label, { minOptions }) {
  if (!q || typeof q !== 'object') return err(id, `${label}: вопрос отсутствует`);
  for (const f of ['id', 'topic', 'prompt', 'answer', 'distractors', 'hint', 'explanation']) if (!q[f]) err(id, `${label}: нет поля ${f}`);
  if (!Array.isArray(q.distractors) || q.distractors.length < minOptions - 1) err(id, `${label}: нужно минимум ${minOptions - 1} дистрактора`);
  if (q.distractors?.includes(q.answer)) err(id, `${label}: дистрактор совпадает с ответом`);
  if (new Set(q.distractors).size !== q.distractors?.length) err(id, `${label}: дистракторы повторяются`);
  const rationale = q.rationale || {};
  for (const d of q.distractors || []) {
    if (!rationale[d] || rationale[d].length < 25) err(id, `${label}: нет разбора «почему неверно» для «${d}»`);
    if (ABSURD.some((re) => re.test(d))) err(id, `${label}: абсурдный дистрактор «${d}»`);
    if (Math.abs(d.length - q.answer.length) > Math.max(25, q.answer.length * 1.5)) err(id, `${label}: дистрактор «${d}» резко отличается длиной от ответа`);
  }
  if (norm(q.hint) === norm(q.explanation)) err(id, `${label}: подсказка совпадает с объяснением`);
  if (leaksAnswer(q.hint, q.answer)) err(id, `${label}: подсказка содержит ответ «${q.answer}»`);
  if (leaksAnswer(q.prompt, q.answer)) err(id, `${label}: вопрос содержит ответ «${q.answer}»`);
  if ((q.explanation || '').length < 60) err(id, `${label}: объяснение короче 60 символов`);
  if ((q.hint || '').length < 20) err(id, `${label}: подсказка короче 20 символов`);
  if (q.iconId && q.iconId !== id) err(id, `${label}: iconId указывает на другую запись`);
}

for (const r of records) {
  const id = r.id;
  for (const f of ['period', 'museum', 'region', 'title', 'attribution']) if (LEAK.test(String(r[f] || ''))) err(id, `поле ${f} содержит редакторскую пометку: «${r[f]}»`);
  if (!Array.isArray(r.centuries) || !r.centuries.length) err(id, 'centuries пустой — фильтр по веку не найдёт запись');
  if (!r.recognitionGroup) err(id, 'нет recognitionGroup — икона не попадёт в викторину');
  else if (!GROUPS.has(r.recognitionGroup)) err(id, `неизвестный recognitionGroup «${r.recognitionGroup}» — добавь в GROUPS валидатора и в groupOrder`);
  if (!r.recognition) { err(id, 'нет блока recognition'); continue; }
  const texts = { hint: new Set(), explanation: new Set(), prompt: new Set() };
  for (const level of LEVELS) {
    const q = r.recognition[level];
    checkQuestion(id, q, `recognition.${level}`, { minOptions: level === 'beginner' ? 3 : 4 });
    if (!q) continue;
    for (const k of Object.keys(texts)) texts[k].add(norm(q[k]));
    if (q.id !== `${id}-recognition-${level}`) err(id, `recognition.${level}: id должен быть ${id}-recognition-${level}`);
    const m = promptsByLevel[level]; m.set(norm(q.prompt), (m.get(norm(q.prompt)) || 0) + 1);
  }
  if (texts.hint.size < 3) err(id, 'подсказки на трёх уровнях должны различаться');
  if (texts.explanation.size < 3) err(id, 'объяснения на трёх уровнях должны различаться');
  const b = r.recognition.beginner, e = r.recognition.explorer;
  if (b && e && leaksAnswer(b.explanation, e.answer) && norm(b.answer) !== norm(e.answer)) err(id, `объяснение начального уровня называет ответ среднего («${e.answer}»)`);
  if (r.recognition.detail) { const d = r.recognition.detail; if (!(d.x >= 0 && d.y >= 0 && d.x + d.width <= 1 && d.y + d.height <= 1 && d.label)) err(id, 'detail: координаты вне [0,1] или нет label'); }
  if (!Array.isArray(r.questions) || r.questions.length < 3 || r.questions.length > 5) err(id, `questions: ожидается 3–5 визуальных вопросов, сейчас ${r.questions?.length}`);
  const seenPrompts = new Set();
  for (const q of r.questions || []) {
    checkQuestion(id, q, `questions.${q.topic}`, { minOptions: 3 });
    if (!VISUAL_TOPICS.has(q.topic)) err(id, `questions.${q.topic}: тема не визуальная — такие вопросы убраны из практики`);
    if (seenPrompts.has(norm(q.prompt))) err(id, `questions: повторяющийся вопрос «${q.prompt}»`); seenPrompts.add(norm(q.prompt));
    if (LEVELS.some((l) => r.recognition[l] && norm(r.recognition[l].prompt) === norm(q.prompt) && norm(r.recognition[l].answer) === norm(q.answer))) err(id, `questions.${q.topic}: дублирует вопрос викторины «${q.prompt}»`);
  }
  if (!Array.isArray(r.clues) || r.clues.length < 3) err(id, 'нужно минимум 3 подсказки-наблюдения (clues)');
  for (const c of r.clues || []) { if (norm(c.text) === norm(r.description)) err(id, `clue «${c.title}» дословно повторяет description`); if (/^как узнать образ$/i.test(c.title)) err(id, 'clue с шаблонным заголовком «Как узнать образ»'); }
}
for (const level of LEVELS) for (const [p, n] of promptsByLevel[level]) if (level === 'expert' && n > 2) err('*', `углублённый вопрос «${p}» повторяется у ${n} икон — нужны разные ракурсы`);

// Пишем синхронно: console.error в пайп асинхронный, и process.exit обрезал бы вывод на 64 КБ.
const { writeSync } = require('node:fs');
if (errors.length) {
  const failed = new Set(errors.map((e) => e.split(':')[0]));
  writeSync(2, `${errors.join('\n')}\n\n✗ ${errors.length} замечаний, не прошли ${failed.size} из ${records.length} записей: ${[...failed].join(' ')}\n`);
  process.exitCode = 1;
} else {
  writeSync(1, `✓ ${records.length} записей прошли редакторский гейт\n`);
}

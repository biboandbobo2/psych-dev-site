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
const VISUAL_TOPICS = new Set(['subject', 'people', 'type', 'attribute', 'mary', 'feast', 'composition', 'material']);
// Начальный и средний уровень викторины узнают «кто / что за сюжет / какой тип», а не деталь.
const NAME_TOPICS = new Set(['subject', 'people', 'type', 'mary', 'feast']);
const ABSURD = [/XX век/i, /XXI век/i, /до н\. ?э\./i, /Прадо/i, /Уффици/i, /Национальная галерея, Лондон/i, /Рафаэл/i, /автопортрет/i, /достоверная подпись/i, /Лувр/i];
const LEAK = /требует сверки|не уточн|не указан|расходятся|по записи репродукции|по актуальной карточке|не сверен/i;

// Словарь канонических сюжетов: recognitionGroup → допустимые значения поля subject (событие или кто).
const SUBJECTS = {
  christ: ['Христос'], mary: ['Богоматерь с Младенцем', 'Богоматерь', 'Поклонение Владимирской иконе'], nicholas: ['Николай Чудотворец'],
  george: ['Чудо Георгия о змие', 'Георгий Победоносец'], apostle: ['Апостол'], annunciation: ['Благовещение'], nativity: ['Рождество Христово'],
  baptism: ['Крещение Господне'], transfiguration: ['Преображение'], entry: ['Вход в Иерусалим'], resurrection: ['Воскресение Христово'],
  dormition: ['Успение Богородицы'], ascension: ['Вознесение Господне'], baptist: ['Иоанн Предтеча'], elijah: ['Пророк Илия'],
  archangel: ['Архангел', 'Собор архангелов'], presentation: ['Сретение'], pentecost: ['Сошествие Святого Духа'], theodore: ['Феодор Тирон'],
  crucifixion: ['Распятие'], lazarus: ['Воскрешение Лазаря'], noli: ['Явление Христа Марии Магдалине'], eustace: ['Обращение Евстафия Плакиды'],
  'mary-entry': ['Введение Богородицы во храм'], chrysostom: ['Иоанн Златоуст'], demetrius: ['Димитрий Солунский'], deesis: ['Деисус'],
  trinity: ['Новозаветная Троица'], 'boris-gleb': ['Борис и Глеб'], hierarchs: ['Три святителя'], warrior: ['Святой воин'], prophet: ['Пророк'],
  evangelist: ['Евангелист'], saint: ['Святой'],
};
const GROUPS = new Set(Object.keys(SUBJECTS));

const norm = (s) => String(s || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ALL_SUBJECTS = new Set(Object.values(SUBJECTS).flat().map(norm));
const FEASTS = new Set(['Благовещение', 'Рождество Христово', 'Сретение', 'Сретение Господне', 'Крещение Господне', 'Крещение', 'Богоявление', 'Преображение', 'Преображение Господне',
  'Вход в Иерусалим', 'Вход Господень в Иерусалим', 'Воскресение Христово', 'Воскресение', 'Сошествие во ад', 'Вознесение Господне', 'Вознесение', 'Сошествие Святого Духа', 'Пятидесятница',
  'Троица', 'Ветхозаветная Троица', 'Успение Богородицы', 'Успение', 'Введение Богородицы во храм', 'Введение во храм', 'Рождество Богородицы', 'Воздвижение Креста', 'Покров', 'Покров Богородицы',
  'Похвала Богородицы', 'Воскрешение Лазаря', 'Распятие', 'Снятие с креста', 'Положение во гроб', 'Тайная вечеря', 'Омовение ног', 'Уверение Фомы', 'Жёны-мироносицы у гроба', 'Преполовение',
  'Обрезание Господне', 'Усекновение главы Иоанна Предтечи', 'Явление Христа Марии Магдалине', 'Бегство в Египет', 'Собор архангелов', 'Собор Богородицы', 'Спас Нерукотворный'].map(norm));

// «Кто»: имя, чин или роль. Допустимые начала ответа для subject/beginner/explorer.
const WHO = /^(апостол|святител|пророк|архангел|ангел|христ|спас|богоматер|богородиц|свят|мученик|преподобн|евангелист|праведн|княз|цар|иоанн|никола|георги|илия|илии|димитри|феодор|борис|глеб|евстафи|мари|п[её]тр|павел|павл|андре|филипп|матфе|лук|марк|васили|григори|моисе|лазар|симеон|анн|иоаким|адам|ев[аы]|деисус|троиц|собор|три святител|явление|чудо|обращение|поклонение|сретение|введение|успение|распятие|воскресение|воскрешение|вознесение|сошествие|преображение|благовещение|рождество|крещение|богоявление|вход|покров|снятие|положение|тайная вечеря|омовение|уверение|ж[её]ны|воздвижение|усекновение|бегство|избиение|младен|мать|отец|бог|дух|праотц|ветхозаветн|новозаветн|отечество|сопрестол|не прикасайся|noli|воин|всадник|реб[её]н|дитя|юнош|стар[ец]|монах|епископ|дев[аы]|жена|мироносиц|разбойник|волхв|пастух|повитух|служанк|ктитор|заказчик|донатор|ученик|свидетел|толп|народ|гавриил|михаил|рафаил|уриил|магдалин|марф|елизавет|захари|иосиф|давид|соломон|исаи|иереми|даниил|иезекиил|аввакум|аарон|авраам|исаак|иаков|иов|иона|енох|мельхиседек|константин|елен|владимир|ольг|серги|кирилл|зосим|савват|варлаам|антони|феодоси|пантелеимон|косм|дамиан|флор|лавр|власи|параскев|варвар|екатерин|ирин|ф[её]кл|анастаси|евфими|прокопи|меркури|никит|мина|артеми|стратилат|тирон|плакид|лонгин|сотник|умерш|распят|спел[её]н|сын|праведник|святые|двое|две фигуры|три фигуры|группа)/i;
const SCENE = /сцена|событие|праздни|чудо|явление|моление|предстояние|поклонение|шествие|битва|погребение|воскрешение|исцеление|видение|беседа|трапеза|проповедь|крещение|въезд|бегство|встреча|принесение|благословение|казнь|мучение|страдани|снятие|положение|сошествие|вознесение|вход|обращение|рождество|благовещение|успение|распятие|преображение|сретение|введение/i;
// Тип — термин (…образ, …икона, Одигитрия, Деисусный образ, Житийная икона), а не описание («по пояс», «в рост» — это composition).
const TYPE_RE = /образ|икон|извод|одигитри|умилени|елеус|знамени|оранта|вседержител|пантократор|спас|деисус|казанск|владимирск|тихвинск|иверск|троеручиц|дексиократус|на престоле|никопе|агиосоритисс|гликофилус|панахрант|ипапанти|кимисис|анастасис|житийн|праздничн|в силах|мокрая брада|нерукотворн|эммануил|ветхий денми|благое молчание|великого совета|собор|чин|складн|эпистил|календарн|триптих|диптих|мине[яи]|клейм|молчани|в пустыне|недреманн|отечество|сопрестоли|троиц|тип|вариант|сокращ|краткий|развёрнут|развернут|полный|фрагмент|створк|врата|иконостас|фреск|миниатюр|энколпион|панаги|мозаичн|резн|шит|эмал|рельеф|пластин|подвесн|двусторонн|таблетк|минея|хоругв/i;
const MARY_RE = /одигитри|умилени|елеус|знамени|оранта|казанск|владимирск|тихвинск|иверск|троеручиц|дексиократус|на престоле|никопе|агиосоритисс|гликофилус|панахрант|млекопитательниц|киккск|влахерн|печерск|смоленск|донск|феодоровск|толгск|боголюбск|покров|неопалим|скорбящ|взыграни|страстн|живоносн|заступниц|богоматер|богородиц|деисус|платитер|параклесис|елеус|перивлепт|кардиотисс|ассунт/i;
const MAT_PROMPT = /из чего (сделан|выполнен|изготовлен|сделана|сделано|набран|состоит)|как (сделан|выполнен|изготовлен|сделана|сделано)|в какой технике|какой материал|из какого материала|чем написан|какая техника|каким способом (сделан|выполнен|нанес)/i;
const MAT_ANS = /вырезан|резьб|резной|резная|резное|вытка|выткан|вышит|шитьё|шитье|мозаик|эмал|темпер|левкас|фреск|стеатит|слонов|литьё|литье|литой|отлит|чекан|(^|[^а-яё])скань|басм|финифт|перегородчат|из камня|из дерева|из кости|из серебра|из золота|из металла|из стекла|из глины|на доске|на холсте|на стене|на ткани|на пергамен|тканн|нитям|смальт|энкаустик|позолот|серебрян|золочён|золочен|штукатур|бронз|мрамор|керамик|фарфор|наклад/i;
const COMP_PROMPT = /как (поставлена|расположен|размещ|построен|скомпонован|развёрнут|развернут|соотнес)|фон|углах|по краю|половину доски|половине доски|вокруг фигур|до какого места|композици|формат|целиком|занимает|где (стоит|сидит|находится|помещ)|сколько (фигур|рядов|ярусов)|относительно зрителя|поля|средник|клейм|ярус/i;
const NAPISAN = /(^|[^а-яё])написа(н|л|ть|в)/i; // \b не работает с кириллицей
// Служебные обороты, которые не должны попадать к читателю.
const SERVICE_ALL = /в каталоге стоит|[A-Za-z]{3,}\?|под вопросом|редактор|редакци|каталожн\w* пометк/i;
const IMPERATIVE = /(^|[^а-яё])не\s+(приписывайте|подменяйте|переносите|выдавайте|уточняйте|додумывайте|путайте|считайте|называйте|делайте|принимайте|переоценивайте|трактуйте|читайте|ищите|распространяйте|заменяйте|смешивайте)(^|[^а-яё])/i;

const stem = (w) => w.length > 5 ? w.slice(0, w.length - 2) : w;
const leaksAnswer = (text, answer) => {
  const t = norm(text);
  const words = norm(answer).split(' ').filter((w) => w.length >= 5);
  return words.length > 0 && words.every((w) => t.includes(stem(w)));
};

const errors = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const promptsByLevel = { beginner: new Map(), explorer: new Map(), expert: new Map() };
const isWho = (s) => WHO.test(s) || SCENE.test(s);
const isFeast = (s) => FEASTS.has(norm(s));

function checkTopic(id, q, label) {
  const opts = [q.answer, ...q.distractors];
  const bad = (pred, what) => { const x = opts.filter((o) => !pred(o)); if (x.length) err(id, `${label}: ${what}: «${x.join('», «')}»`); };
  if (/праздник/i.test(q.prompt)) bad(isFeast, 'вопрос про праздник — все варианты должны быть названиями праздников (список FEASTS)');
  if (q.topic !== 'material' && MAT_PROMPT.test(q.prompt)) err(id, `${label}: вопрос о материале или технике — тема material`);
  switch (q.topic) {
    case 'subject':
      bad(isWho, 'тема subject — варианты называют событие или кого (иначе тема composition/attribute)');
      if (COMP_PROMPT.test(q.prompt)) err(id, `${label}: вопрос о композиции — тема composition`);
      break;
    case 'type':
      bad((o) => TYPE_RE.test(o) && !MAT_ANS.test(o), 'тема type — варианты называют тип-термин (…образ, Одигитрия, Деисусный образ), описания «по пояс», «в рост» — composition');
      break;
    case 'mary':
      bad((o) => MARY_RE.test(o) && !MAT_ANS.test(o), 'тема mary — варианты называют богородичные типы (жесты и предметы — attribute)');
      break;
    case 'feast':
      bad(isFeast, 'тема feast — варианты из списка праздников FEASTS');
      break;
    case 'material':
      if (!MAT_PROMPT.test(q.prompt) && !MAT_ANS.test(q.answer)) err(id, `${label}: тема material — вопрос должен спрашивать, из чего и как сделано`);
      break;
    case 'people':
      bad((o) => !MAT_ANS.test(o), 'тема people — материал не может быть ответом');
      break;
    default:
  }
}

function checkQuestion(id, q, label, { minOptions }) {
  if (!q || typeof q !== 'object') return err(id, `${label}: вопрос отсутствует`);
  for (const f of ['id', 'topic', 'prompt', 'answer', 'distractors', 'hint', 'explanation']) if (!q[f]) err(id, `${label}: нет поля ${f}`);
  if (!Array.isArray(q.distractors) || q.distractors.length < minOptions - 1) err(id, `${label}: нужно минимум ${minOptions - 1} дистрактора`);
  if (q.distractors?.includes(q.answer)) err(id, `${label}: дистрактор совпадает с ответом`);
  if (new Set(q.distractors).size !== q.distractors?.length) err(id, `${label}: дистракторы повторяются`);
  const rationale = q.rationale || {};
  const lens = (q.distractors || []).map((d) => d.length);
  for (const d of q.distractors || []) {
    if (!rationale[d] || rationale[d].length < 25) err(id, `${label}: нет разбора «почему неверно» для «${d}»`);
    if (ABSURD.some((re) => re.test(d))) err(id, `${label}: абсурдный дистрактор «${d}»`);
    if (Math.abs(d.length - q.answer.length) > Math.max(25, q.answer.length * 1.5)) err(id, `${label}: дистрактор «${d}» резко отличается длиной от ответа`);
  }
  if (lens.length) {
    const max = Math.max(...lens), min = Math.min(...lens), a = q.answer.length;
    if (a > 1.35 * max && a - max >= 8) err(id, `${label}: ответ «${q.answer}» заметно длиннее всех дистракторов — угадывается по форме`);
    if (min > 1.35 * a && min - a >= 8) err(id, `${label}: ответ «${q.answer}» заметно короче всех дистракторов — угадывается по форме`);
    if (q.answer.includes('(') && !q.distractors.some((d) => d.includes('('))) err(id, `${label}: только у ответа есть уточнение в скобках`);
    if (q.answer.includes(':') && !q.distractors.some((d) => d.includes(':'))) err(id, `${label}: только у ответа есть двоеточие с пояснением`);
  }
  if (NAPISAN.test(q.prompt)) err(id, `${label}: «написан…» в вопросе читается как текст — «изображено», «показано», «что видно»`);
  if (norm(q.hint) === norm(q.explanation)) err(id, `${label}: подсказка совпадает с объяснением`);
  if (leaksAnswer(q.hint, q.answer)) err(id, `${label}: подсказка содержит ответ «${q.answer}»`);
  if (leaksAnswer(q.prompt, q.answer)) err(id, `${label}: вопрос содержит ответ «${q.answer}»`);
  if ((q.explanation || '').length < 60) err(id, `${label}: объяснение короче 60 символов`);
  if ((q.hint || '').length < 20) err(id, `${label}: подсказка короче 20 символов`);
  if (q.iconId && q.iconId !== id) err(id, `${label}: iconId указывает на другую запись`);
  for (const t of [q.prompt, q.hint, q.explanation, ...Object.values(rationale)]) if (SERVICE_ALL.test(t || '')) err(id, `${label}: служебный оборот в тексте: «${String(t).slice(0, 60)}…»`);
  if (q.topic && q.distractors?.length) checkTopic(id, q, label);
}

for (const r of records) {
  const id = r.id;
  for (const f of ['period', 'museum', 'region', 'title', 'attribution']) if (LEAK.test(String(r[f] || ''))) err(id, `поле ${f} содержит редакторскую пометку: «${r[f]}»`);
  if (!Array.isArray(r.centuries) || !r.centuries.length) err(id, 'centuries пустой — фильтр по веку не найдёт запись');
  if (!r.recognitionGroup) err(id, 'нет recognitionGroup — икона не попадёт в викторину');
  else if (!GROUPS.has(r.recognitionGroup)) err(id, `неизвестный recognitionGroup «${r.recognitionGroup}» — добавь в SUBJECTS валидатора и в groupOrder`);
  else if (!SUBJECTS[r.recognitionGroup].includes(r.subject)) err(id, `subject «${r.subject}» не из словаря группы ${r.recognitionGroup}: ${SUBJECTS[r.recognitionGroup].join(' / ')}`);
  if (/евангелист|иоанн богослов/i.test(r.title) && r.recognitionGroup === 'apostle') err(id, 'евангелист должен быть в группе evangelist');
  if (norm(r.type) === norm(r.subject)) err(id, `type повторяет subject («${r.type}») — type называет иконографический тип или извод`);
  else if (ALL_SUBJECTS.has(norm(r.type))) err(id, `type «${r.type}» — это название сюжета; type называет тип или извод (Одигитрия, Деисусный образ, Краткий извод…)`);
  if (MAT_ANS.test(r.type || '')) err(id, `type «${r.type}» описывает материал, а не тип`);
  if (!r.people) err(id, 'нет поля people');
  for (const [f, t] of [['description', r.description], ['caution', r.caution]]) { if (SERVICE_ALL.test(t || '') || IMPERATIVE.test(t || '')) err(id, `${f}: служебный оборот («не приписывайте», «в каталоге стоит», «Moscow?») — переписать в читательский тон`); }
  for (const s of r.story || []) if (SERVICE_ALL.test(s.text) || IMPERATIVE.test(s.text) || IMPERATIVE.test(s.title)) err(id, `story «${s.title}»: инструкция редактору вместо истории образа — переписать`);
  if (!r.recognition) { err(id, 'нет блока recognition'); continue; }
  const texts = { hint: new Set(), explanation: new Set(), prompt: new Set() };
  for (const level of LEVELS) {
    const q = r.recognition[level];
    checkQuestion(id, q, `recognition.${level}`, { minOptions: level === 'beginner' ? 3 : 4 });
    if (!q) continue;
    for (const k of Object.keys(texts)) texts[k].add(norm(q[k]));
    if (q.id !== `${id}-recognition-${level}`) err(id, `recognition.${level}: id должен быть ${id}-recognition-${level}`);
    if (!VISUAL_TOPICS.has(q.topic)) err(id, `recognition.${level}: неизвестная тема «${q.topic}»`);
    if (level !== 'expert' && !NAME_TOPICS.has(q.topic)) err(id, `recognition.${level}: тема «${q.topic}» — начальный и средний уровень узнают кто/сюжет/тип (subject, people, type, mary, feast)`);
    if (level === 'beginner' && q.answer && !(isWho(q.answer) || TYPE_RE.test(q.answer))) err(id, `recognition.beginner: ответ «${q.answer}» — не роль, не тип и не сцена`);
    if (level === 'explorer' && q.answer && !(isWho(q.answer) || TYPE_RE.test(q.answer) || MARY_RE.test(q.answer) || isFeast(q.answer))) err(id, `recognition.explorer: ответ «${q.answer}» — не имя, не сюжет и не тип`);
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
  for (const c of r.clues || []) {
    if (norm(c.text) === norm(r.description)) err(id, `clue «${c.title}» дословно повторяет description`);
    if (/^как узнать образ$/i.test(c.title)) err(id, 'clue с шаблонным заголовком «Как узнать образ»');
    if (SERVICE_ALL.test(c.text) || IMPERATIVE.test(c.text)) err(id, `clue «${c.title}»: служебный оборот — переписать в читательский тон`);
  }
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

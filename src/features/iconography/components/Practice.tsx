import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Difficulty, IconRecord, IconSummary, Question, Topic } from '../types';
import { loadIcon, useResource } from '../lib/catalog';
import { teachingQuestions } from '../lib/learning';
import { difficulties, optionsFor, topics } from '../lib/quiz';
import { readProgress, recordAnswer } from '../lib/progress';
import { allRecordQuestions } from '../lib/recognition';
import { Artwork } from './Artwork';
import { LoadState, PassportFacts, Sources } from './Passport';
interface Session { iconId: string; topic: Topic; difficulty: Difficulty; repeat: boolean; seed: number }
interface Lesson { questions: Question[]; records: IconRecord[] }
async function prepareLesson(session: Session, icons: IconSummary[]): Promise<Lesson> {
  const difficult = readProgress().difficult;
  const theory = teachingQuestions.filter((q) => session.repeat ? difficult.includes(q.id) : q.topic === session.topic || (session.topic === 'mary' && q.id === 'guide-mary-sign'));
  const pool = session.topic === 'mary' && !session.repeat && !session.iconId ? icons.filter((x) => x.subject === 'Богоматерь с Младенцем') : icons;
  let selected = pool;
  if (session.iconId) selected = icons.filter((x) => x.id === session.iconId);
  else if (session.repeat) selected = icons.filter((x) => difficult.some((q) => q.startsWith(`${x.id}-`))).slice(0, 12);
  else if (session.topic === 'iconostasis' || session.topic === 'feast') selected = [];
  else {
    const offset = session.seed % Math.max(pool.length, 1);
    selected = [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, 8);
  }
  const records = await Promise.all(selected.map((x) => loadIcon(x.id)));
  let questions = records.flatMap((r) => session.repeat ? allRecordQuestions(r) : r.questions).filter((q) => session.iconId ? true : session.repeat ? difficult.includes(q.id) : q.topic === (session.topic === 'mary' ? 'type' : session.topic));
  if (!session.iconId) questions = [...theory, ...questions].slice(0, 12);
  return { questions, records };
}
function QuestionStep({ question, record, difficulty, onAnswer }: {
  question: Question; record?: IconRecord; difficulty: Difficulty; onAnswer: (correct: boolean) => void;
}) {
  const [chosen, setChosen] = useState('');
  const [showHint, setShowHint] = useState(difficulty === 'beginner');
  const [showOptions, setShowOptions] = useState(difficulty !== 'expert');
  const [saved, setSaved] = useState(true);
  const [recall, setRecall] = useState('');
  const locked = useRef(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const metadata = ['period', 'tradition', 'attribution', 'museum'].includes(question.topic);
  const answer = (option: string) => {
    if (locked.current) return;
    locked.current = true;
    setChosen(option); setSaved(recordAnswer(question.id, option === question.answer));
    requestAnimationFrame(() => answerRef.current?.focus());
  };
  return <div className={`ico-question ${record ? '' : 'ico-question-text'}`}>
    {record && <div className="ico-question-art"><Artwork icon={record} priority zoom alt={`Произведение для задания. ${record.description}`} />
      <p className="ico-small">{record.rights.label} · Изображение можно увеличить</p></div>}
    <div className="ico-question-body"><p className="ico-eyebrow">{metadata ? 'Знакомство с паспортом' : 'Внимательное чтение'}</p><h1>{question.prompt}</h1>
      {metadata && <p className="ico-small">Этот ответ узнают из источника. По стилю нельзя достоверно установить автора, музей или точную дату.</p>}
      {difficulty === 'expert' && !showOptions && <div><label>Ваше предположение<input value={recall} onChange={(e) => setRecall(e.target.value)} placeholder="Можно сформулировать мысленно" /></label>
        <p className="ico-small">Свободный ответ не оценивается автоматически. Выберите формулировку после раскрытия.</p><button className="ico-button" onClick={() => setShowOptions(true)}>Открыть варианты</button></div>}
      {showOptions && <div className="ico-options">{optionsFor(question, difficulty).map((option, i) => <button key={option} disabled={Boolean(chosen)} onClick={() => answer(option)}
        className={chosen ? option === question.answer ? 'correct' : option === chosen ? 'incorrect' : '' : ''}>
        <span className="ico-option-letter">{i + 1}</span>{option}{chosen && option === question.answer && <span>✓</span>}
      </button>)}</div>}
      {!chosen && <div className="ico-hint"><button className="ico-link" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>{showHint ? 'Скрыть подсказку' : 'Нужна подсказка?'}</button>
        {showHint && <p>{question.hint}</p>}</div>}
      {chosen && <div className={`ico-answer ${chosen === question.answer ? 'correct' : ''}`} ref={answerRef} tabIndex={-1}>
        <h2>{chosen === question.answer ? 'Да, вы заметили верно' : 'Разберём вместе'}</h2>
        {chosen !== question.answer && <p>Вы выбрали: {chosen}. В этом задании верный ответ — <strong>{question.answer}</strong>.</p>}
        <p>{question.explanation}</p>
        {question.source && <a href={question.source.url} target="_blank" rel="noreferrer">Источник объяснения</a>}
        {!saved && <p role="status">Браузер не разрешил сохранить прогресс. Занятие продолжится, но повторение после закрытия вкладки недоступно.</p>}
        <button className="ico-button" onClick={() => onAnswer(chosen === question.answer)}>Продолжить</button>
      </div>}
    </div>
  </div>;
}
function ActiveLesson({ session, icons, finish }: { session: Session; icons: IconSummary[]; finish: () => void }) {
  const { value, error, retry } = useResource(() => prepareLesson(session, icons), JSON.stringify(session));
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  if (!value) return <LoadState error={error} retry={retry} />;
  if (!value.questions.length) return <div className="ico-empty"><h2>Нет заданий для повторения</h2><p>Здесь появятся вопросы, на которые вы ответили неверно.</p><button className="ico-button" onClick={finish}>Выбрать тему</button></div>;
  const question = value.questions[index];
  const completedIcon = session.iconId ? value.records[0] : undefined;
  if (!question) return <section className="ico-lesson-finish"><p className="ico-eyebrow">Занятие завершено</p><h1>Теперь вы видите больше</h1>
    <p className="ico-lead">Верных ответов: {correct} из {value.questions.length}. Сложные вопросы сохранены для повторения в этом браузере.</p>
    <div className="ico-actions"><button className="ico-button" onClick={finish}>Выбрать новое занятие</button><Link className="ico-link" to="/iconography/practice?repeat=1">Повторить сложное</Link></div>
    {completedIcon && <div className="ico-reading"><h2>Полный паспорт: {completedIcon.title}</h2><p>{completedIcon.description}</p><PassportFacts icon={completedIcon} />
      {completedIcon.clues.map((clue) => <article key={clue.title}><h3>{clue.title}</h3><p>{clue.text}</p></article>)}<Sources icon={completedIcon} />
      <Link className="ico-link" to={`/iconography/icon/${completedIcon.id}`}>Открыть страницу произведения</Link></div>}
    {!completedIcon && value.records.length > 0 && <div className="ico-reading"><h2>Произведения этого занятия</h2><ul>{value.records.map((r) => <li key={r.id}><Link to={`/iconography/icon/${r.id}`}>{r.title}: паспорт и источники</Link></li>)}</ul></div>}
  </section>;
  return <section className="ico-section"><div className="ico-quiz-top"><button className="ico-link" onClick={finish}>К выбору занятия</button><span>Вопрос {index + 1} из {value.questions.length}</span><span>{difficulties.find((x) => x.id === session.difficulty)?.label}</span></div>
    <progress className="ico-progress" value={index} max={value.questions.length} aria-label="Прогресс занятия" />
    <QuestionStep key={question.id} question={question} record={value.records.find((r) => r.id === question.iconId)} difficulty={session.difficulty}
      onAnswer={(isCorrect) => { setCorrect((n) => n + Number(isCorrect)); setIndex((n) => n + 1); window.scrollTo({ top: 0, behavior: 'instant' }); }} />
  </section>;
}
export function Practice({ icons }: { icons: IconSummary[] }) {
  const [params] = useSearchParams();
  const paramIcon = icons.find((x) => x.id === params.get('icon'))?.id ?? '';
  const [mode, setMode] = useState<'parameter' | 'icon' | 'repeat'>(paramIcon ? 'icon' : params.has('repeat') ? 'repeat' : 'parameter');
  const [iconId, setIconId] = useState(paramIcon || icons[0]?.id || '');
  const [topic, setTopic] = useState<Topic>(topics.find((x) => x.id === params.get('topic'))?.id ?? 'subject');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [session, setSession] = useState<Session>();
  const [seed, setSeed] = useState(0);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [session]);
  if (session) return <ActiveLesson key={session.seed} session={session} icons={icons} finish={() => { setSession(undefined); setSeed((n) => n + 1); }} />;
  return <section className="ico-section"><p className="ico-eyebrow">Практика без спешки</p><h1>Учиться замечать</h1><p className="ico-lead">Ошибаться здесь полезно. После каждого ответа — объяснение, а сложное можно повторить.</p>
    <div className="ico-tabs" aria-label="Режим занятия">{([['parameter', 'Один параметр'], ['icon', 'Одна икона — всё о ней'], ['repeat', `Повторить сложное (${readProgress().difficult.length})`]] as const).map(([key, label]) => <button key={key} className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}</div>
    {mode === 'parameter' && <fieldset className="ico-fieldset"><legend>Что исследуем?</legend><div className="ico-topic-grid">{topics.map((t) => <label key={t.id} className={topic === t.id ? 'selected' : ''}>
      <input type="radio" name="topic" value={t.id} checked={topic === t.id} onChange={() => setTopic(t.id)} /><span><strong>{t.label}</strong><small>{t.note}</small></span></label>)}</div></fieldset>}
    {mode === 'icon' && <div className="ico-notice"><label>Выберите произведение<select value={iconId} onChange={(e) => setIconId(e.target.value)}>{icons.map((icon) => <option key={icon.id} value={icon.id}>{icon.title} · {icon.period}</option>)}</select></label>
      <p>Восемь вопросов: сюжет, персонажи, тип, традиция, период, атрибуция, собрание и деталь. В конце — полный паспорт.</p><Link className="ico-link" to={`/iconography/icon/${iconId}`}>Сначала изучить произведение</Link></div>}
    {mode === 'repeat' && <p className="ico-notice">Повторяются именно вопросы, вызвавшие трудности. Верный ответ убирает вопрос из списка. Прогресс хранится только в этом браузере; в одном занятии — до 12 вопросов.</p>}
    <fieldset className="ico-fieldset"><legend>Глубина погружения</legend><div className="ico-difficulties">{difficulties.map((d) => <label key={d.id} className={difficulty === d.id ? 'selected' : ''}><input type="radio" name="difficulty" checked={difficulty === d.id} onChange={() => setDifficulty(d.id)} /><span><strong>{d.label}</strong><small>{d.note}</small></span></label>)}</div></fieldset>
    <button className="ico-button" disabled={mode === 'repeat' && readProgress().difficult.length === 0} onClick={() => setSession({ iconId: mode === 'icon' ? iconId : '', topic, difficulty, repeat: mode === 'repeat', seed })}>Начать занятие</button>
    <p className="ico-small">Все уровни открыты. Никаких таймеров, жизней и платных подсказок.</p>
  </section>;
}

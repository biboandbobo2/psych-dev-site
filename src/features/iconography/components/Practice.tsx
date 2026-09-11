import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Difficulty, IconRecord, IconSummary, Question, Topic } from '../types';
import { loadIcon, useResource } from '../lib/catalog';
import { teachingQuestions } from '../lib/learning';
import { createRng, difficulties, newSessionSeed, optionsFor, shuffle, topics } from '../lib/quiz';
import { readProgress, recordAnswer } from '../lib/progress';
import { allRecordQuestions } from '../lib/recognition';
import { Artwork } from './Artwork';
import { LoadState, PassportFacts, Sources } from './Passport';

interface Session { iconId: string; topic: Topic; difficulty: Difficulty; repeat: boolean; seed: number }
interface Lesson { questions: Question[]; records: IconRecord[] }
interface Answered { question: Question; chosen: string; correct: boolean }

const MAX_QUESTIONS = 12;
const MAX_RECORDS = 8;
/** Иконостас разбирается по общей схеме: паспорта для него не нужны. */
const TEXT_ONLY: Topic[] = ['iconostasis'];
/** Праздничные сюжеты ищем по группе узнавания, чтобы не читать все паспорта ради отбора. */
const FEAST_GROUPS = new Set(['annunciation', 'nativity', 'presentation', 'baptism', 'transfiguration', 'lazarus',
  'entry', 'crucifixion', 'resurrection', 'ascension', 'pentecost', 'dormition', 'mary-entry', 'noli']);

/** Какие темы вопросов паспорта идут в занятие по выбранной теме. */
function questionTopics(topic: Topic): Topic[] {
  if (topic === 'mary') return ['type'];
  if (topic === 'feast') return ['feast', 'subject'];
  return [topic];
}

function iconPool(topic: Topic, icons: IconSummary[]): IconSummary[] {
  if (topic === 'mary') return icons.filter((icon) => icon.subject === 'Богоматерь с Младенцем');
  if (topic === 'feast') return icons.filter((icon) => icon.recognitionGroup && FEAST_GROUPS.has(icon.recognitionGroup));
  return icons;
}

const normalize = (text: string) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Один и тот же вопрос не должен прозвучать дважды в разных формулировках одного занятия. */
function dedupeByPrompt(questions: Question[]): Question[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    const key = normalize(question.prompt);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function prepareLesson(session: Session, icons: IconSummary[]): Promise<Lesson> {
  const rng = createRng(session.seed);

  // Одна икона — всё о ней: визуальные вопросы паспорта плюс углублённый вопрос викторины.
  if (session.iconId) {
    const record = await loadIcon(session.iconId);
    const expert = record.recognition?.expert;
    const questions = dedupeByPrompt([...record.questions, ...(expert ? [expert] : [])]);
    return { questions: shuffle(questions, rng), records: [record] };
  }

  if (session.repeat) {
    const difficult = readProgress().difficult;
    const selected = icons.filter((icon) => difficult.some((id) => id.startsWith(`${icon.id}-`))).slice(0, MAX_QUESTIONS);
    const records = await Promise.all(selected.map((icon) => loadIcon(icon.id)));
    const questions = [
      ...teachingQuestions.filter((question) => difficult.includes(question.id)),
      ...records.flatMap(allRecordQuestions).filter((question) => difficult.includes(question.id)),
    ];
    return { questions: shuffle(questions, rng).slice(0, MAX_QUESTIONS), records };
  }

  const theory = teachingQuestions.filter((question) =>
    question.topic === session.topic || (session.topic === 'mary' && question.id === 'guide-mary-sign'));
  if (TEXT_ONLY.includes(session.topic)) return { questions: theory.slice(0, MAX_QUESTIONS), records: [] };

  const selected = shuffle(iconPool(session.topic, icons), rng).slice(0, MAX_RECORDS);
  const records = await Promise.all(selected.map((icon) => loadIcon(icon.id)));
  const wanted = questionTopics(session.topic);
  const questions = records.flatMap((record) => record.questions).filter((question) => wanted.includes(question.topic));
  return { questions: shuffle([...theory, ...dedupeByPrompt(questions)], rng).slice(0, MAX_QUESTIONS), records };
}

function QuestionStep({ question, record, difficulty, seed, onAnswer }: {
  question: Question; record?: IconRecord; difficulty: Difficulty; seed: number; onAnswer: (answered: Answered) => void;
}) {
  const [chosen, setChosen] = useState('');
  const [showHint, setShowHint] = useState(difficulty === 'beginner');
  const [showOptions, setShowOptions] = useState(difficulty !== 'expert');
  const [saved, setSaved] = useState(true);
  const locked = useRef(false);
  const answerRef = useRef<HTMLDivElement>(null);

  const answer = (option: string) => {
    if (locked.current) return;
    locked.current = true;
    setChosen(option);
    setSaved(recordAnswer(question.id, option === question.answer));
    requestAnimationFrame(() => answerRef.current?.focus());
  };

  const correct = chosen === question.answer;
  const rationale = chosen && !correct ? question.rationale?.[chosen] : undefined;

  return (
    <div className={`ico-question ${record ? '' : 'ico-question-text'}`}>
      {record && (
        <div className="ico-question-art">
          <Artwork icon={record} priority zoom alt={`Произведение для задания. ${record.description}`} />
          <p className="ico-small">{record.rights.label} · Изображение можно увеличить</p>
        </div>
      )}
      <div className="ico-question-body">
        <p className="ico-eyebrow">Внимательное чтение</p>
        <h1>{question.prompt}</h1>

        {difficulty === 'expert' && !showOptions && (
          <div className="ico-recall">
            <p>Сначала вспомните ответ, затем откройте варианты.</p>
            <button className="ico-button" onClick={() => setShowOptions(true)}>Открыть варианты</button>
          </div>
        )}

        {showOptions && (
          <div className="ico-options">
            {optionsFor(question, difficulty, seed).map((option, i) => (
              <button key={option} disabled={Boolean(chosen)} onClick={() => answer(option)}
                className={chosen ? (option === question.answer ? 'correct' : option === chosen ? 'incorrect' : '') : ''}>
                <span className="ico-option-letter">{i + 1}</span>{option}
                {chosen && option === question.answer && <span>✓</span>}
              </button>
            ))}
          </div>
        )}

        {!chosen && (
          <div className="ico-hint">
            <button className="ico-link" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>
              {showHint ? 'Скрыть подсказку' : 'Нужна подсказка?'}
            </button>
            {showHint && <p>{question.hint}</p>}
          </div>
        )}

        {chosen && (
          <div className={`ico-answer ${correct ? 'correct' : ''}`} ref={answerRef} tabIndex={-1}>
            <h2>{correct ? 'Верно' : 'Неверно'}</h2>
            {!correct && <p className="ico-wrong-choice">Вы выбрали «{chosen}».{rationale ? ` ${rationale}` : ''}</p>}
            {!correct && <p className="ico-right-answer">Верно: <strong>{question.answer}</strong></p>}
            <p>{question.explanation}</p>
            {question.source && <a href={question.source.url} target="_blank" rel="noreferrer">Источник объяснения</a>}
            {!saved && <p role="status">Браузер не разрешил сохранить прогресс. Занятие продолжится, но повторение после закрытия вкладки недоступно.</p>}
            <button className="ico-button" onClick={() => onAnswer({ question, chosen, correct })}>Продолжить</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonFinish({ lesson, answers, finish }: { lesson: Lesson; answers: Answered[]; finish: () => void }) {
  const mistakes = answers.filter((answered) => !answered.correct);
  const correct = answers.length - mistakes.length;
  const progress = readProgress();
  const wholeIcon = lesson.records.length === 1 ? lesson.records[0] : undefined;
  const iconOf = (question: Question) => lesson.records.find((record) => record.id === question.iconId);

  return (
    <section className="ico-lesson-finish">
      <p className="ico-eyebrow">Занятие завершено</p>
      <h1>Верно {correct} из {answers.length}</h1>

      {mistakes.length > 0 && (
        <div className="ico-session-mistakes">
          <h2>Что стоит пересмотреть</h2>
          <ul className="ico-session-mistakes-list">
            {mistakes.map(({ question, chosen }) => (
              <li key={question.id}>
                <p className="ico-review-prompt">{question.prompt}</p>
                <p className="ico-review-answer">Вы выбрали «{chosen}». Верно: {question.answer}</p>
                {iconOf(question) && (
                  <Link className="ico-link" to={`/iconography/icon/${question.iconId}`}>
                    {iconOf(question)!.title}: паспорт и источники
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="ico-small ico-progress-total" role="status">
        Всего ответов: {progress.answered}, верных: {progress.correct}. В «сложном» сейчас {progress.difficult.length} вопросов викторины и практики.
      </p>

      <div className="ico-actions">
        <button className="ico-button" onClick={finish}>Выбрать новое занятие</button>
        <Link className="ico-link" to="/iconography/practice?repeat=1">Повторить сложное</Link>
      </div>

      {wholeIcon && (
        <div className="ico-reading">
          <h2>Полный паспорт: {wholeIcon.title}</h2>
          <p>{wholeIcon.description}</p>
          <PassportFacts icon={wholeIcon} />
          {wholeIcon.clues.map((clue) => <article key={clue.title}><h3>{clue.title}</h3><p>{clue.text}</p></article>)}
          <Sources icon={wholeIcon} />
          <Link className="ico-link" to={`/iconography/icon/${wholeIcon.id}`}>Открыть страницу произведения</Link>
        </div>
      )}
      {!wholeIcon && lesson.records.length > 0 && (
        <div className="ico-reading">
          <h2>Произведения этого занятия</h2>
          <ul>{lesson.records.map((record) => (
            <li key={record.id}><Link to={`/iconography/icon/${record.id}`}>{record.title}: паспорт и источники</Link></li>
          ))}</ul>
        </div>
      )}
    </section>
  );
}

function ActiveLesson({ session, icons, finish }: { session: Session; icons: IconSummary[]; finish: () => void }) {
  const { value, error, retry } = useResource(() => prepareLesson(session, icons), JSON.stringify(session));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);

  if (!value) return <LoadState error={error} retry={retry} />;
  if (!value.questions.length) return (
    <div className="ico-empty">
      <h2>Нет заданий для повторения</h2>
      <p>Здесь появятся вопросы, на которые вы ответили неверно.</p>
      <button className="ico-button" onClick={finish}>Выбрать тему</button>
    </div>
  );

  const question = value.questions[index];
  if (!question) return <LessonFinish lesson={value} answers={answers} finish={finish} />;

  return (
    <section className="ico-section">
      <div className="ico-quiz-top">
        <button className="ico-link" onClick={finish}>К выбору занятия</button>
        <span>Вопрос {index + 1} из {value.questions.length}</span>
        <span>{difficulties.find((x) => x.id === session.difficulty)?.label}</span>
      </div>
      <progress className="ico-progress" value={index} max={value.questions.length} aria-label="Прогресс занятия" />
      <QuestionStep key={question.id} question={question} difficulty={session.difficulty} seed={session.seed}
        record={value.records.find((record) => record.id === question.iconId)}
        onAnswer={(answered) => {
          setAnswers((prev) => [...prev, answered]);
          setIndex((n) => n + 1);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }} />
    </section>
  );
}

export function Practice({ icons }: { icons: IconSummary[] }) {
  const [params] = useSearchParams();
  const paramIcon = icons.find((x) => x.id === params.get('icon'))?.id ?? '';
  const [mode, setMode] = useState<'parameter' | 'icon' | 'repeat'>(paramIcon ? 'icon' : params.has('repeat') ? 'repeat' : 'parameter');
  const [iconId, setIconId] = useState(paramIcon || icons[0]?.id || '');
  const [topic, setTopic] = useState<Topic>(topics.find((x) => x.id === params.get('topic'))?.id ?? 'subject');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [session, setSession] = useState<Session>();
  const difficult = readProgress().difficult;

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [session]);

  if (session) return <ActiveLesson key={session.seed} session={session} icons={icons} finish={() => setSession(undefined)} />;

  const modes = [
    ['parameter', 'Один параметр'],
    ['icon', 'Одна икона — всё о ней'],
    ['repeat', `Повторить сложное (${difficult.length})`],
  ] as const;

  return (
    <section className="ico-section">
      <p className="ico-eyebrow">Практика без спешки</p>
      <h1>Учиться замечать</h1>
      <p className="ico-lead">Ошибаться здесь полезно. После каждого ответа — объяснение, а сложное можно повторить.</p>

      <div className="ico-tabs" aria-label="Режим занятия">
        {modes.map(([key, text]) => (
          <button key={key} className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => setMode(key)}>{text}</button>
        ))}
      </div>

      {mode === 'parameter' && (
        <fieldset className="ico-fieldset">
          <legend>Что исследуем?</legend>
          <div className="ico-topic-grid">{topics.map((t) => (
            <label key={t.id} className={topic === t.id ? 'selected' : ''}>
              <input type="radio" name="topic" value={t.id} checked={topic === t.id} onChange={() => setTopic(t.id)} />
              <span><strong>{t.label}</strong><small>{t.note}</small></span>
            </label>
          ))}</div>
        </fieldset>
      )}

      {mode === 'icon' && (
        <div className="ico-notice">
          <label>Выберите произведение
            <select value={iconId} onChange={(e) => setIconId(e.target.value)}>
              {icons.map((icon) => <option key={icon.id} value={icon.id}>{icon.title} · {icon.period}</option>)}
            </select>
          </label>
          <p>Вопросы об изображении: сюжет, персонажи, тип, детали — и углублённый вопрос викторины. В конце — полный паспорт.</p>
          <Link className="ico-link" to={`/iconography/icon/${iconId}`}>Сначала изучить произведение</Link>
        </div>
      )}

      {mode === 'repeat' && (
        <p className="ico-notice">
          Повторяются вопросы, вызвавшие трудности: сюда попадают и вопросы викторины, и вопросы практики.
          Верный ответ убирает вопрос из списка. Прогресс хранится только в этом браузере; в одном занятии — до {MAX_QUESTIONS} вопросов.
        </p>
      )}

      <fieldset className="ico-fieldset">
        <legend>Глубина погружения</legend>
        <div className="ico-difficulties">{difficulties.map((d) => (
          <label key={d.id} className={difficulty === d.id ? 'selected' : ''}>
            <input type="radio" name="difficulty" checked={difficulty === d.id} onChange={() => setDifficulty(d.id)} />
            <span><strong>{d.label}</strong><small>{d.note}</small></span>
          </label>
        ))}</div>
      </fieldset>

      <button className="ico-button" disabled={mode === 'repeat' && difficult.length === 0}
        onClick={() => setSession({ iconId: mode === 'icon' ? iconId : '', topic, difficulty, repeat: mode === 'repeat', seed: newSessionSeed() })}>
        Начать занятие
      </button>
      <p className="ico-small">Все уровни открыты. Никаких таймеров, жизней и платных подсказок.</p>
    </section>
  );
}

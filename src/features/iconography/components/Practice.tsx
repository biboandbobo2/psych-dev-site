import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Difficulty, IconSummary, Topic } from '../types';
import { iconsByTradition, useResource } from '../lib/catalog';
import { difficulties, newSessionSeed, repeatDifficulty, topics } from '../lib/quiz';
import { readProgress } from '../lib/progress';
import { MAX_QUESTIONS, prepareLesson } from '../lib/practice';
import type { PracticeSession } from '../lib/practice';
import { LoadState } from './Passport';
import { PracticeFinish } from './PracticeFinish';
import { PracticeQuestion } from './PracticeQuestion';
import type { Answered } from './PracticeQuestion';

function ActiveLesson({ session, icons, finish }: { session: PracticeSession; icons: IconSummary[]; finish: () => void }) {
  const { value, error, retry } = useResource(() => prepareLesson(session, icons), JSON.stringify(session));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);

  if (!value) return <LoadState error={error} retry={retry} />;
  if (!value.questions.length) return (
    <div className="ico-empty">
      <h2>{session.repeat ? 'Нет заданий для повторения' : 'Вопросов по этой теме пока нет'}</h2>
      <p>{session.repeat
        ? 'Здесь появятся вопросы, на которые вы ответили неверно.'
        : 'Мы размечаем вопросы по темам. Выберите другую тему — или загляните сюда позже.'}</p>
      <button className="ico-button" onClick={finish}>Выбрать тему</button>
    </div>
  );

  const question = value.questions[index];
  if (!question) return <PracticeFinish lesson={value} answers={answers} finish={finish} />;
  // Повторение сохраняет исходную сложность: уровень вопроса викторины зашит в его id.
  const difficulty = session.repeat ? repeatDifficulty(question) : session.difficulty;

  return (
    <section className="ico-section">
      <div className="ico-quiz-top">
        <button className="ico-link" onClick={finish}>К выбору занятия</button>
        <span>Вопрос {index + 1} из {value.questions.length}</span>
        <span>{difficulties.find((x) => x.id === difficulty)?.label}</span>
      </div>
      <progress className="ico-progress" value={index} max={value.questions.length} aria-label="Прогресс занятия" />
      <PracticeQuestion key={question.id} question={question} difficulty={difficulty} seed={session.seed}
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
  const [session, setSession] = useState<PracticeSession>();
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
              {iconsByTradition(icons).map((group) => (
                <optgroup key={group.tradition} label={group.tradition}>
                  {group.icons.map((icon) => <option key={icon.id} value={icon.id}>{icon.title} · {icon.period}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <p>Вопросы об изображении: сюжет, персонажи, тип, детали — и углублённый вопрос викторины. В конце — полный паспорт.</p>
          <Link className="ico-link" to={`/iconography/icon/${iconId}`}>Сначала изучить произведение</Link>
        </div>
      )}

      {mode === 'repeat' && (
        <p className="ico-notice">
          Повторяются вопросы, вызвавшие трудности: сюда попадают и вопросы викторины, и вопросы практики.
          Каждый вопрос сохраняет исходную сложность. Верный ответ убирает вопрос из списка. Прогресс хранится
          только в этом браузере; в одном занятии — до {MAX_QUESTIONS} вопросов.
        </p>
      )}

      {mode !== 'repeat' && (
        <fieldset className="ico-fieldset">
          <legend>Глубина погружения</legend>
          <div className="ico-difficulties">{difficulties.map((d) => (
            <label key={d.id} className={difficulty === d.id ? 'selected' : ''}>
              <input type="radio" name="difficulty" checked={difficulty === d.id} onChange={() => setDifficulty(d.id)} />
              <span><strong>{d.label}</strong><small>{d.note}</small></span>
            </label>
          ))}</div>
        </fieldset>
      )}

      <button className="ico-button" disabled={mode === 'repeat' && difficult.length === 0}
        onClick={() => setSession({ iconId: mode === 'icon' ? iconId : '', topic, difficulty, repeat: mode === 'repeat', seed: newSessionSeed() })}>
        Начать занятие
      </button>
      <p className="ico-small">Все уровни открыты. Никаких таймеров, жизней и платных подсказок.</p>
    </section>
  );
}

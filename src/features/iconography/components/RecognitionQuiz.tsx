import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Difficulty, IconSummary } from '../types';
import { useResource } from '../lib/catalog';
import { newSessionSeed } from '../lib/quiz';
import { loadRecognitionLesson, recognitionCollections, recognitionLevels } from '../lib/recognition';
import type { Collection, RecognitionResult, RecognitionSession } from '../lib/recognition';
import { LoadState } from './Passport';
import { RecognitionFinish } from './RecognitionFinish';
import { RecognitionQuestion } from './RecognitionQuestion';

const label = <T extends string>(list: { id: T; label: string }[], id: T) => list.find((x) => x.id === id)?.label ?? '';

/** Что это и зачем уровни. Показывается только перед первым вопросом занятия. */
function QuizIntro() {
  return (
    <div className="ico-quiz-intro">
      <p>
        Викторина по узнаванию образов: смотрите на икону и выбирайте ответ. Уровень меняет не число
        вариантов, а сам вопрос — от «кто перед нами» до значения отдельной детали.
      </p>
      <details>
        <summary>Как устроены уровни</summary>
        <ul>
          <li><strong>Начальный</strong> — роль или тип: Христос, Богородица с Младенцем, святитель, апостол, воин, праздничная сцена.</li>
          <li><strong>Средний</strong> — имя или сюжет: Николай, Пётр, Павел, Умиление, Благовещение.</li>
          <li><strong>Углублённый</strong> — значение видимой детали именно этой иконы: предмет в руке, жест, надпись, облачение.</li>
        </ul>
      </details>
    </div>
  );
}

function QuizControls({ session, change }: { session: RecognitionSession; change: (next: RecognitionSession) => void }) {
  const repeating = session.repeat || Boolean(session.retry?.length);
  const restart = (patch: Partial<RecognitionSession>) =>
    change({ ...session, repeat: false, retry: undefined, seed: newSessionSeed(), ...patch });
  return (
    <div className="ico-quiz-controls" aria-label="Настройки викторины">
      <label>Уровень
        <select aria-label="Уровень" value={session.level}
          onChange={(e) => restart({ level: e.target.value as Difficulty })}>
          {recognitionLevels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
        </select>
      </label>
      <label>Традиция
        <select aria-label="Традиция" value={session.collection}
          onChange={(e) => restart({ collection: e.target.value as Collection })}>
          {recognitionCollections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <p>{repeating
        ? 'Повторение: вопросы сохраняют исходную сложность.'
        : recognitionLevels.find((x) => x.id === session.level)?.note}</p>
    </div>
  );
}

/** Во время занятия настройки свёрнуты: смена уровня прерывает занятие, о чём предупреждаем. */
function QuizCurrent({ session, unlock }: { session: RecognitionSession; unlock: () => void }) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="ico-quiz-current">
      <p>
        {label(recognitionLevels, session.level)} · {label(recognitionCollections, session.collection)}{' '}
        <button className="ico-link" onClick={() => setAsking(true)}>изменить</button>
      </p>
      {asking && (
        <div className="ico-quiz-confirm" role="status">
          <p>Текущее занятие завершится, ответы на оставшиеся иконы не попадут в итог.</p>
          <button className="ico-button" onClick={unlock}>Всё равно изменить</button>
          <button className="ico-link" onClick={() => setAsking(false)}>Продолжить занятие</button>
        </div>
      )}
    </div>
  );
}

export function RecognitionQuiz({ icons }: { icons: IconSummary[] }) {
  const [session, setSession] = useState<RecognitionSession>(() => ({
    level: 'explorer', collection: 'russian', seed: newSessionSeed(), repeat: false,
  }));
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const { value: items, error, retry } = useResource(() => loadRecognitionLesson(icons, session), JSON.stringify(session));

  const change = (next: RecognitionSession) => {
    setSession(next);
    setIndex(0);
    setResults([]);
    setUnlocked(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const repeating = session.repeat || Boolean(session.retry?.length);
  const total = items?.length ?? 0;
  const running = Boolean(total) && index > 0 && index < total;
  const item = items?.[index];

  return (
    <div className="ico-quiz-home">
      {running && !unlocked
        ? <QuizCurrent session={session} unlock={() => setUnlocked(true)} />
        : <>
          {index === 0 && !repeating && <QuizIntro />}
          <QuizControls session={session} change={change} />
        </>}

      {!items ? <LoadState error={error} retry={retry} />
        : !items.length && !repeating ? (
          <section className="ico-empty">
            <h1>В этой подборке пока нет заданий</h1>
            <Link className="ico-link" to="/iconography/catalog">Посмотреть коллекцию</Link>
          </section>
        ) : item ? (
          <RecognitionQuestion key={item.question.id} item={item} index={index} total={total} seed={session.seed}
            onAnswer={(chosen) => setResults((prev) => [...prev, { item, chosen, correct: chosen === item.question.answer }])}
            onNext={() => { setIndex(index + 1); window.scrollTo({ top: 0, behavior: 'instant' }); }} />
        ) : (
          <RecognitionFinish results={results} session={session} change={change} icons={icons} />
        )}
    </div>
  );
}

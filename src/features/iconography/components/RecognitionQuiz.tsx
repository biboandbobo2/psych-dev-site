import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Difficulty, IconSummary } from '../types';
import { dailyIcon, useResource } from '../lib/catalog';
import { readProgress, recordAnswer } from '../lib/progress';
import { optionsFor } from '../lib/quiz';
import { loadRecognitionLesson, recognitionCollections, recognitionLevels } from '../lib/recognition';
import type { Collection, RecognitionItem, RecognitionSession } from '../lib/recognition';
import { Artwork } from './Artwork';
import { LoadState } from './Passport';

function RecognitionQuestion({ item, index, total, next }: { item: RecognitionItem; index: number; total: number; next: () => void }) {
  const { icon, question } = item;
  const [chosen, setChosen] = useState('');
  const [hint, setHint] = useState(false);
  const [detail, setDetail] = useState(false);
  const [saved, setSaved] = useState(true);
  const locked = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const picture = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const toggleDetail = () => {
    setDetail(!detail);
    if (!detail && (picture.current?.getBoundingClientRect().top ?? 0) < 0) {
      picture.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  };
  const answer = (option: string) => {
    if (locked.current) return;
    locked.current = true;
    setChosen(option);
    setSaved(recordAnswer(question.id, option === question.answer));
    requestAnimationFrame(() => feedback.current?.focus({ preventScroll: true }));
  };
  return <section className="ico-recognition" aria-label="Викторина по иконам">
    <div className="ico-recognition-image" ref={picture}><Artwork icon={icon} priority zoom alt="Икона для вопроса. Нажмите, чтобы увеличить." detail={detail ? icon.recognition?.detail : undefined} /></div>
    <div className="ico-recognition-body">
      <p className="ico-round-position" aria-label={`Икона ${index + 1} из ${total}`}>{index + 1} <span>/ {total}</span></p>
      <h1 ref={heading} tabIndex={-1}>{question.prompt}</h1>
      <div className="ico-recognition-options">{optionsFor(question, 'explorer').map((option) => <button key={option} disabled={Boolean(chosen)} onClick={() => answer(option)}
        className={chosen ? option === question.answer ? 'is-correct' : option === chosen ? 'is-incorrect' : 'is-muted' : ''}>
        <span>{option}</span>{chosen && option === question.answer && <span className="ico-answer-word">Верно</span>}
      </button>)}</div>
      <div className="ico-recognition-response">
        {!chosen ? <div className="ico-recognition-hint"><button className="ico-link" aria-expanded={hint} onClick={() => setHint(!hint)}>Подсказка</button>{hint && <p>{question.hint}</p>}</div>
          : <div ref={feedback} tabIndex={-1} className="ico-recognition-feedback">
            <h2>{chosen === question.answer ? 'Верно' : question.answer}</h2><p>{question.explanation}</p>
            <div className="ico-recognition-details">{icon.recognition?.detail && <button className="ico-link" aria-pressed={detail} onClick={toggleDetail}>{detail ? 'Скрыть отметку' : 'Показать признак'}</button>}
              <details><summary>Об этой иконе</summary><p>{icon.title}. {icon.period}. {icon.museum}.</p><Link to={`/iconography/icon/${icon.id}`} className="ico-link">Паспорт и источники</Link></details></div>
            {!saved && <p role="status">Прогресс не сохранился в браузере. Вы можете продолжить занятие.</p>}
            <button className="ico-button ico-next-icon" onClick={next}>{index + 1 === total ? 'Завершить занятие' : 'Следующая икона'}</button>
          </div>}
      </div>
    </div>
  </section>;
}
function RecognitionFinish({ items, session, change, icons }: {
  items: RecognitionItem[]; session: RecognitionSession; change: (next: RecognitionSession) => void; icons: IconSummary[];
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const difficult = readProgress().difficult.filter((id) => id.includes('-recognition-'));
  const seen = [...new Map(items.map((x) => [x.icon.id, x.icon])).values()];
  const daily = dailyIcon(icons);
  const deeper = session.level === 'beginner' ? 'explorer' : 'expert';
  return <section className="ico-recognition-finish"><h1 ref={heading} tabIndex={-1}>{seen.length ? 'Теперь знакомые' : 'Всё повторили'}</h1>
    <p>{seen.length ? 'Встретив эти образы в храме, попробуйте узнать их по деталям.' : 'Сложные вопросы появятся здесь после занятия.'}</p>
    {seen.length > 0 && <div className="ico-seen-icons">{seen.map((icon) => <Link key={icon.id} to={`/iconography/icon/${icon.id}`}><Artwork icon={icon} alt="" sizes="(max-width: 640px) 28vw, 160px" /><span>{icon.title}</span></Link>)}</div>}
    <div className="ico-actions"><button className="ico-button" onClick={() => change({ ...session, repeat: false, round: session.round + 1 })}>Ещё иконы</button>
      {difficult.length > 0 && <button className="ico-link" onClick={() => change({ ...session, repeat: true, round: session.round + 1 })}>Повторить сложное</button>}</div>
    <div className="ico-further"><h2>Если хочется глубже</h2>
      {session.level !== 'expert' && <button className="ico-further-choice" onClick={() => change({ ...session, level: deeper, repeat: false, round: 0 })}><strong>{session.level === 'beginner' ? 'Назвать точнее' : 'Различать по деталям'}</strong><span>{session.level === 'beginner' ? 'Попробуйте другие имена и близкие сюжеты среди ответов.' : 'Обратите внимание на жесты, надписи и иконографические типы.'}</span></button>}
      <Link className="ico-further-choice" to="/iconography/compare"><strong>Сравнить похожие образы</strong><span>Рассмотреть две иконы рядом.</span></Link>
      <Link className="ico-further-choice" to="/iconography/learn"><strong>Перед посещением храма</strong><span>Четыре ориентира на примере одного иконостаса.</span></Link>
      <Link className="ico-further-choice" to="/iconography/practice"><strong>Выбрать другую тему</strong><span>От атрибутов и праздников до истории произведения.</span></Link>
      {daily && <Link className="ico-further-choice" to={`/iconography/icon/${daily.id}`}><strong>Икона дня</strong><span>{daily.title}</span></Link>}
    </div>
  </section>;
}
function RecognitionLesson({ icons, session, change }: { icons: IconSummary[]; session: RecognitionSession; change: (next: RecognitionSession) => void }) {
  const { value: items, error, retry } = useResource(() => loadRecognitionLesson(icons, session), JSON.stringify(session));
  const [index, setIndex] = useState(0);
  if (!items) return <LoadState error={error} retry={retry} />;
  if (!items.length && !session.repeat) return <section className="ico-empty"><h1>В этой подборке пока нет заданий</h1><Link className="ico-link" to="/iconography/catalog">Посмотреть коллекцию</Link></section>;
  const item = items[index];
  if (!item) return <RecognitionFinish items={items} session={session} change={change} icons={icons} />;
  return <RecognitionQuestion key={questionKey(item)} item={item} index={index} total={items.length} next={() => { setIndex(index + 1); window.scrollTo({ top: 0, behavior: 'instant' }); }} />;
}
function questionKey(item: RecognitionItem) { return item.question.id; }
export function RecognitionQuiz({ icons }: { icons: IconSummary[] }) {
  const [session, setSession] = useState<RecognitionSession>({ level: 'explorer', collection: 'russian', round: 0, repeat: false });
  const change = (next: RecognitionSession) => { setSession(next); window.scrollTo({ top: 0, behavior: 'instant' }); };
  return <div className="ico-quiz-home">
    <div className="ico-quiz-controls" aria-label="Настройки викторины">
      <label>Уровень<select aria-label="Уровень" value={session.level} onChange={(e) => change({ ...session, level: e.target.value as Difficulty, repeat: false, round: 0 })}>{recognitionLevels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}</select></label>
      <label>Традиция<select aria-label="Традиция" value={session.collection} onChange={(e) => change({ ...session, collection: e.target.value as Collection, repeat: false, round: 0 })}>{recognitionCollections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <p>{session.repeat ? 'Повторение: вопросы сохраняют исходную сложность.' : recognitionLevels.find((x) => x.id === session.level)?.note}</p>
    </div>
    <RecognitionLesson key={JSON.stringify(session)} icons={icons} session={session} change={change} />
  </div>;
}

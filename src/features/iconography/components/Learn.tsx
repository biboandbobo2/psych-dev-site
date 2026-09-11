import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { IconSummary } from '../types';
import { Artwork } from './Artwork';
import { learningSources } from '../lib/learning';

const steps = [
  {
    title: 'Найдите направление взгляда', icon: 'ru-95156246', name: 'Архангел Гавриил · деисусный ряд',
    question: 'Почему Гавриил повёрнут в сторону?',
    answer: 'Он обращён ко Христу в центре деисусного ряда. Когда видите несколько фигур, повёрнутых друг к другу, мысленно восстановите их общую композицию.',
    body: 'Не пытайтесь сразу назвать всех. Посмотрите, куда обращены лица и руки. Отдельная икона часто была частью целого ряда.',
  },
  {
    title: 'Отличите апостола от святителя', icon: 'ru-95156254', name: 'Николай Чудотворец · деисусный ряд',
    question: 'Что подсказывают кресты на белой полосе одежды?',
    answer: 'Это омофор — часть епископского облачения. Перед нами святитель Николай, а не апостол. Имя уточняют по надписи; омофор встречается и у других святителей.',
    body: 'Сначала определите роль персонажа по одежде. Затем сравните лицо и прочитайте имя. Книга есть и у апостолов, и у святителей.',
  },
  {
    title: 'Узнайте событие по действию', icon: 'ru-95155055', name: 'Крещение · праздничный ряд',
    question: 'Какие детали отличают Крещение от других праздников?',
    answer: 'Христос стоит в Иордане, Иоанн Предтеча склоняется к Нему с берега. Ангелы на противоположной стороне дополняют сцену. Главное действие — крещение, а не просто собрание людей.',
    body: 'В праздничном ряду вместо отдельных фигур вы увидите сцены. Найдите главного героя, его действие и место: река, гора, город или храм.',
  },
  {
    title: 'Не перепутайте похожие фигуры', icon: 'ru-95155131', name: 'Успение Богородицы · праздничный ряд',
    question: 'Кого Христос держит на руках?',
    answer: 'Спелёнутая фигура обозначает душу Богородицы. Сама Богородица лежит на одре внизу. Это Успение: здесь Христос принимает её, тогда как в Рождестве Мария находится рядом с Младенцем Христом.',
    body: 'Маленькая фигура не всегда означает ребёнка в бытовом смысле. Смотрите на всю сцену и на того, кто её держит.',
  },
];

// Кирилловские иконы каталога, место которых в ансамбле 1497 года известно по названию.
// Остальные записи ряду не приписываем.
const rows: { name: string; text: string; belongs?: RegExp }[] = [
  { name: 'Пророческий ряд', text: 'Верхний ряд ансамбля 1497 года: ветхозаветные пророки. Свитки связывают их с пророчествами.' },
  { name: 'Деисусный ряд', text: 'Христос в центре; Богородица, Предтеча и другие святые обращены к Нему. Здесь находились Гавриил и Николай из нашего разбора.', belongs: /Гавриил|Николай/ },
  { name: 'Праздничный ряд', text: 'История в отдельных сценах: от Рождества Богородицы до Успения. Крещение и Успение из разбора принадлежали этому ряду.', belongs: /Благовещение|Сретение|Успение|Крещение/ },
  { name: 'Местный ряд', text: 'Самый нижний уровень с проходами в алтарь и особо почитаемыми образами. Начните осмотр здесь, затем поднимайте взгляд.' },
];

const churchSources = [
  { label: 'Кирилло-Белозерский музей: иконы и история собора', url: 'https://www.kirmuseum.org/ru/exhibitions/drevnerusskoe-iskusstvo-xv-xvii-vekov' },
  { label: 'Музеи Московского Кремля: четырёхъярусный иконостас 1497 года', url: 'https://kreml.ru/ru/exhibitions/ikonostas-uspenskogo-sobora-kirillo-belozerskogo-m' },
  { label: 'ГосНИИР: исследование, реставрация и воссоздание ансамбля', url: 'https://www.gosniir.ru/exchibitions/50years/medieval/ikonostas.aspx' },
];

function rowIcons(icons: IconSummary[], rowIndex: number) {
  const belongs = rows[rowIndex]?.belongs;
  if (!belongs) return [];
  return icons.filter((icon) => icon.schoolId === 'kirillov' && belongs.test(icon.title));
}

const shortTitle = (title: string) => title.replace(/\s+из Кирилло-Белозерского иконостаса$/, '');

export function Learn({ icons }: { icons: IconSummary[] }) {
  const [params, setParams] = useSearchParams();
  const step = Math.min(steps.length - 1, Math.max(0, Math.floor(Number(params.get('step'))) || 0));
  const [revealed, setRevealed] = useState(false);
  const [row, setRow] = useState(3);
  const current = steps[step];
  const icon = icons.find((x) => x.id === current.icon);
  const examples = rowIcons(icons, row);
  const changeStep = (next: number) => {
    setParams({ step: String(next) }, { replace: true });
    setRevealed(false);
  };

  return (
    <section className="ico-section ico-trip">
      <p className="ico-eyebrow">Перед поездкой · русская традиция</p>
      <h1>Как смотреть<br />на иконы в храме</h1>
      <p className="ico-lead">Разберём на иконах Успенского собора Кирилло-Белозерского монастыря. После этого попробуйте найти знакомые образы в своём путешествии.</p>

      <div className="ico-trip-intro">
        <details>
          <summary>Почему этот иконостас</summary>
          <p>Иконостас создан около 1497 года и сохранился почти полностью. Его иконы сегодня находятся в нескольких музеях. Ниже — разбор исторического ансамбля, а не обещание увидеть все оригиналы на месте.</p>
        </details>
        <a className="ico-link" href="#temple-map">Посмотреть устройство иконостаса</a>
      </div>

      <nav className="ico-trip-steps" aria-label="Шаги перед поездкой">
        {steps.map((s, i) => (
          <button key={s.title} aria-current={step === i ? 'step' : undefined} onClick={() => changeStep(i)}>
            <span>{i + 1}</span>{s.title}
          </button>
        ))}
      </nav>

      <div className="ico-trip-example">
        <div>
          {icon && <Artwork icon={icon} zoom priority />}
          <p className="ico-small">{current.name}</p>
        </div>
        <article>
          <p className="ico-eyebrow">{step + 1} из {steps.length}</p>
          <h2>{current.title}</h2>
          <p>{current.body}</p>
          <h3>{current.question}</h3>
          {revealed
            ? <p className="ico-trip-answer" role="status">{current.answer}</p>
            : <button className="ico-button ico-button-outline" onClick={() => setRevealed(true)}>Показать объяснение</button>}
          <div className="ico-actions">
            {step > 0 && <button className="ico-button ico-button-outline" onClick={() => changeStep(step - 1)}>Назад</button>}
            {step < steps.length - 1
              ? <button className="ico-button" onClick={() => changeStep(step + 1)}>Дальше</button>
              : <Link className="ico-button" to="/iconography">Узнавать иконы в викторине</Link>}
          </div>
          <Link
            className="ico-link"
            to={`/iconography/icon/${current.icon}`}
            state={{ returnTo: `/iconography/learn?step=${step}`, returnLabel: 'Назад к маршруту' }}
          >Подробнее об этой иконе</Link>
        </article>
      </div>

      <div id="temple-map" className="ico-reading">
        <h2>Куда смотреть в иконостасе</h2>
        <p>Упрощённая схема четырёх рядов ансамбля 1497 года, сверху вниз. Выберите ряд. Положение рядов в других храмах может отличаться.</p>

        <div className="ico-iconostasis">
          {rows.map((item, i) => (
            <button key={item.name} className={row === i ? 'active' : ''} aria-pressed={row === i} onClick={() => setRow(i)}>
              <span className="ico-arches" aria-hidden="true">
                {Array.from({ length: i === 3 ? 5 : 7 }, (_, n) => <span key={n} />)}
              </span>
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        <div className="ico-notice" role="status"><h3>{rows[row].name}</h3><p>{rows[row].text}</p></div>

        {examples.length > 0 && (
          <div className="ico-row-icons">
            <p className="ico-eyebrow">Иконы этого ряда в коллекции</p>
            <ul>
              {examples.map((example) => (
                <li key={example.id}>
                  <Link
                    className="ico-link"
                    to={`/iconography/icon/${example.id}`}
                    state={{ returnTo: '/iconography/learn#temple-map', returnLabel: 'Назад к маршруту' }}
                  >{shortTitle(example.title)}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link className="ico-link" to="/iconography/catalog?q=Кирилло-Белозерского">Все иконы этого ансамбля в коллекции</Link>

        <section className="ico-context">
          <h2>Что взять с собой в другой храм</h2>
          <p>Три простых вопроса: кто изображён, что он делает, к кому обращён? Одежда помогает узнать роль, надпись — имя, соседние фигуры — сюжет. Не нужно угадывать век или мастера по одному взгляду.</p>
          <p>В грузинском храме алтарная преграда может быть устроена иначе. Русский высокий иконостас — один из вариантов. Правила посещения и фотографирования уточните у конкретного храма.</p>
        </section>

        <details>
          <summary>Источники маршрута и планирование поездки</summary>
          <ul>
            {[...churchSources, learningSources[0]].map((s) => (
              <li key={s.url}><a className="ico-link" href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
            ))}
          </ul>
          <p>Проверяйте состав открытой экспозиции у музея: оригиналы могут находиться на выставке или реставрации.</p>
        </details>
      </div>
    </section>
  );
}

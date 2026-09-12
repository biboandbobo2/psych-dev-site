import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { IconRecord, IconSummary } from '../types';
import { displayPeriod, iconsByTradition, loadIcon, useResource } from '../lib/catalog';
import { compareRows, compareTask, defaultRight, pickClues } from '../lib/compare';
import { Artwork } from './Artwork';
import { LoadState } from './Passport';
import { WithGlossary } from './Term';

const pairs = [
  {
    left: 'ru-196233690', right: 'ru-16819921', name: 'Пётр и Павел',
    note: 'Сравните волосы и бороду: у Петра короткая борода, у Павла открытый лоб и заострённая борода. На выбранной иконе Пётр держит ключи. Книга или свиток сами по себе не определяют имя. Это русские произведения разных периодов; сходный сюжет не означает одну мастерскую.',
  },
  {
    left: 'ru-6226762', right: 'ru-43712813', name: 'Два образа Христа',
    note: 'В обоих случаях изображён Христос. Поясной Вседержитель отличается от образа Спаса в силах на престоле, в окружении небесных сил и геометрических форм славы. Сравнивайте всю композицию, а не только лицо. Датировку и атрибуцию проверяйте в отдельных паспортах.',
  },
  {
    left: 'cma-168322', right: 'tsilkani', name: 'Умиление и Одигитрия',
    note: 'Сравните положение Младенца и руки Богородицы. В Умилении сближаются лики, в Одигитрии рука направляет взгляд к Христу. Здесь разные традиции и разные периоды — сходный персонаж не означает одну школу.',
  },
  {
    left: 'cma-136864', right: 'met-464428', name: 'Один сюжет, две традиции',
    note: 'Найдите крест и предстоящих в обоих произведениях. Русская створка XVII века и византийский рельеф X века разделяют композиционную основу, но различаются материалом, масштабом повествования и контекстом.',
  },
  {
    left: 'met-464014', right: 'met-464428', name: 'Два Иоанна',
    note: 'В Деисусе рядом с Христом — Иоанн Предтеча. У Распятия — Иоанн Богослов. Проверяйте не только имя, но и роль персонажа в сцене.',
  },
];

const caution = 'Дату, регион и автора проверяйте по каждому паспорту отдельно: цвет фона или похожее лицо не устанавливают мастерскую.';

/** Автоматический разбор произвольной пары: сравнимые поля паспортов и наблюдения об одном. */
function AutoBreakdown({ left, right }: { left: IconRecord; right: IconRecord }) {
  return (
    <>
      <p className="ico-eyebrow">Автоматическое сопоставление по паспортам</p>
      <h3>Что сравнить</h3>
      <dl className="ico-compare-table">
        {compareRows(left, right).map((row) => (
          <div key={row.label} className={row.same ? 'ico-same' : ''}>
            <dt>{row.label}</dt>
            {row.same
              ? <dd>{row.left}<em>совпадает</em></dd>
              : <><dd>{row.left}</dd><dd>{row.right}</dd></>}
          </div>
        ))}
      </dl>
      <p className="ico-small">{caution}</p>
    </>
  );
}

export function Compare({ icons }: { icons: IconSummary[] }) {
  const [params, setParams] = useSearchParams();
  const [revealed, setRevealed] = useState(false);
  const left = icons.some((x) => x.id === params.get('left')) ? params.get('left')! : pairs[0].left;
  // Задан только left — подбираем пару из той же группы узнавания, а не первую попавшуюся икону.
  const fallbackRight = left === pairs[0].left ? pairs[0].right : (defaultRight(icons, left) ?? pairs[0].left);
  const right = icons.some((x) => x.id === params.get('right')) ? params.get('right')! : fallbackRight;
  const { value, error, retry } = useResource(() => Promise.all([loadIcon(left), loadIcon(right)]), `${left}:${right}`);
  const pair = pairs.find((p) => (p.left === left && p.right === right) || (p.left === right && p.right === left));

  // Новая пара — новое задание: разбор снова закрыт.
  useEffect(() => { setRevealed(false); }, [left, right]);

  function choose(side: string, id: string) {
    setParams({ left, right, [side]: id });
  }

  return (
    <section className="ico-section">
      <p className="ico-eyebrow">Внимание к различиям</p>
      <h1>Два образа рядом</h1>
      <p className="ico-lead">Посмотрите на руки, поворот головы и отношения фигур. Затем сверьтесь с паспортами.</p>

      <div className="ico-tabs" aria-label="Предложенные сравнения">
        {pairs.map((p) => (
          <button
            key={p.name}
            className={pair === p ? 'active' : ''}
            onClick={() => setParams({ left: p.left, right: p.right })}
          >{p.name}</button>
        ))}
      </div>

      <div className="ico-compare-selects">
        {['left', 'right'].map((side) => (
          <label key={side}>
            {side === 'left' ? 'Первое произведение' : 'Второе произведение'}
            <select value={side === 'left' ? left : right} onChange={(event) => choose(side, event.target.value)}>
              {iconsByTradition(icons).map((group) => (
                <optgroup key={group.tradition} label={group.tradition}>
                  {group.icons.map((x) => <option key={x.id} value={x.id}>{x.title} · {displayPeriod(x)}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        ))}
      </div>

      {!value ? <LoadState error={error} retry={retry} /> : (
        <>
          {left === right && (
            <p className="ico-notice">Вы выбрали одно произведение дважды. Выберите другое, чтобы увидеть различия.</p>
          )}

          <div className="ico-compare">
            {value.map((icon, i) => (
              <article key={`${icon.id}-${i}`}>
                <Artwork icon={icon} priority zoom />
                <h2>{icon.title}</h2>
                <p>{icon.tradition} · {displayPeriod(icon)}</p>
                <dl className="ico-facts">
                  <div><dt>Тип</dt><dd>{icon.type}</dd></div>
                  <div><dt>Атрибуция</dt><dd>{icon.attribution}</dd></div>
                  <div><dt>Собрание</dt><dd>{icon.museum}</dd></div>
                </dl>
                <Link className="ico-link" to={`/iconography/icon/${icon.id}`}>Паспорт и источники</Link>
              </article>
            ))}
          </div>

          <div className="ico-comparison-note">
            <p className="ico-eyebrow">Задание</p>
            <h2>Что отличает эти два образа?</h2>
            {!pair && <p><WithGlossary text={compareTask(value[0], value[1])} /></p>}
            {!revealed ? (
              <>
                <p>Назовите отличия вслух или про себя, затем проверьте себя.</p>
                <button className="ico-button" onClick={() => setRevealed(true)}>Показать разбор</button>
              </>
            ) : (
              <div role="status">
                {pair
                  ? <p><strong>{pair.name}.</strong> <WithGlossary text={pair.note} /></p>
                  : <AutoBreakdown left={value[0]} right={value[1]} />}
                <h3>На что смотреть</h3>
                <div className="ico-compare-clues">
                  {pickClues(value[0], value[1]).map((clue, i) => clue && (
                    <div key={`${value[i].id}-${i}`}>
                      <p className="ico-eyebrow">{value[i].title}</p>
                      <p><strong>{clue.title}.</strong> <WithGlossary text={clue.text} /></p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

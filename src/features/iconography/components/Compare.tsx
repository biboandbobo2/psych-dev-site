import { Link, useSearchParams } from 'react-router-dom';
import type { IconSummary } from '../types';
import { loadIcon, useResource } from '../lib/catalog';
import { Artwork } from './Artwork';
import { LoadState } from './Passport';
const pairs = [
  { left: 'ru-196233690', right: 'ru-16819921', name: 'Пётр и Павел', note: 'Сравните волосы и бороду: у Петра короткая борода, у Павла открытый лоб и заострённая борода. На выбранной иконе Пётр держит ключи. Книга или свиток сами по себе не определяют имя. Это русские произведения разных периодов; сходный сюжет не означает одну мастерскую.' },
  { left: 'ru-6226762', right: 'ru-43712813', name: 'Два образа Христа', note: 'В обоих случаях изображён Христос. Поясной Вседержитель отличается от образа Спаса в силах на престоле, в окружении небесных сил и геометрических форм славы. Сравнивайте всю композицию, а не только лицо. Датировку и атрибуцию проверяйте в отдельных паспортах.' },
  { left: 'cma-168322', right: 'tsilkani', name: 'Умиление и Одигитрия', note: 'Сравните положение Младенца и руки Богородицы. В Умилении сближаются лики, в Одигитрии рука направляет взгляд к Христу. Здесь разные традиции и разные периоды — сходный персонаж не означает одну школу.' },
  { left: 'cma-136864', right: 'met-464428', name: 'Один сюжет, две традиции', note: 'Найдите крест и предстоящих в обоих произведениях. Русская створка XVII века и византийский рельеф X века разделяют композиционную основу, но различаются материалом, масштабом повествования и контекстом.' },
  { left: 'met-464014', right: 'met-464428', name: 'Два Иоанна', note: 'В Деисусе рядом с Христом — Иоанн Предтеча. У Распятия — Иоанн Богослов. Проверяйте не только имя, но и роль персонажа в сцене.' },
];
export function Compare({ icons }: { icons: IconSummary[] }) {
  const [params, setParams] = useSearchParams();
  const left = icons.some((x) => x.id === params.get('left')) ? params.get('left')! : pairs[0].left;
  const right = icons.some((x) => x.id === params.get('right')) ? params.get('right')! : (left === pairs[0].right ? pairs[0].left : pairs[0].right);
  const { value, error, retry } = useResource(() => Promise.all([loadIcon(left), loadIcon(right)]), `${left}:${right}`);
  const pair = pairs.find((p) => (p.left === left && p.right === right) || (p.left === right && p.right === left));
  function choose(side: string, id: string) { setParams({ left, right, [side]: id }); }
  return <section className="ico-section">
    <p className="ico-eyebrow">Внимание к различиям</p><h1>Два образа рядом</h1>
    <p className="ico-lead">Посмотрите на руки, поворот головы и отношения фигур. Затем сверьтесь с паспортами.</p>
    <div className="ico-tabs" aria-label="Предложенные сравнения">{pairs.map((p) => <button key={p.name} className={pair === p ? 'active' : ''}
      onClick={() => setParams({ left: p.left, right: p.right })}>{p.name}</button>)}</div>
    <div className="ico-compare-selects">{['left', 'right'].map((side) => <label key={side}>{side === 'left' ? 'Первое произведение' : 'Второе произведение'}
      <select value={side === 'left' ? left : right} onChange={(e) => choose(side, e.target.value)}>{icons.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.period}</option>)}</select></label>)}</div>
    {!value ? <LoadState error={error} retry={retry} /> : <>
      {left === right && <p className="ico-notice">Вы выбрали одно произведение дважды. Выберите другое, чтобы увидеть различия.</p>}
      <div className="ico-compare">{value.map((icon, i) => <article key={`${icon.id}-${i}`}><Artwork icon={icon} priority zoom /><h2>{icon.title}</h2>
        <p>{icon.tradition} · {icon.period}</p><p>{icon.clues[0].text}</p>
        <dl className="ico-facts"><div><dt>Тип</dt><dd>{icon.type}</dd></div><div><dt>Атрибуция</dt><dd>{icon.attribution}</dd></div><div><dt>Собрание</dt><dd>{icon.museum}</dd></div></dl>
        <Link className="ico-link" to={`/iconography/icon/${icon.id}`}>Паспорт и источники</Link>
      </article>)}</div>
      <div className="ico-comparison-note"><p className="ico-eyebrow">Разбор сравнения</p><h2>{pair?.name ?? 'Сходство не равно общему происхождению'}</h2>
        <p>{pair?.note ?? 'Сопоставьте сюжет, тип, жесты и материал. Дату, регион и автора проверяйте по каждому паспорту отдельно: цвет фона или похожее лицо не устанавливают мастерскую.'}</p></div>
    </>}
  </section>;
}

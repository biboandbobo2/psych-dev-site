import { Link, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { IconRecord } from '../types';
import { loadIcon, useResource } from '../lib/catalog';
import { Artwork } from './Artwork';
import { Feedback } from './Feedback';
import { BackLink } from './BackLink';
export function LoadState({ error, retry }: { error?: string; retry?: () => void }) {
  return <div className="ico-empty" role="status"><p>{error || 'Открываем коллекцию…'}</p>
    {error && <button className="ico-button" onClick={retry}>Попробовать ещё раз</button>}</div>;
}
export function PassportFacts({ icon }: { icon: IconRecord }) {
  const location = useLocation();
  const facts = [['Сюжет', icon.subject], ['Персонажи', icon.people], ['Иконографический тип', icon.type],
    ['Традиция', icon.tradition], ['Регион / школа', icon.region], ['Период', icon.period],
    ['Автор / мастерская / круг', icon.attribution], ['Собрание', icon.museum], ['Инвентарный номер', icon.inventory], ['Материал', icon.material]];
  return <dl className="ico-facts">{facts.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{term === "Регион / школа" && icon.schoolId ? <Link className="ico-link" to={`/iconography/schools/${icon.schoolId}`} state={{ returnTo: `${location.pathname}${location.search}`, returnLabel: "Назад к иконе", returnState: location.state }}>{value}</Link> : value}</dd></div>)}</dl>;
}
export function Sources({ icon }: { icon: IconRecord }) {
  return <section className="ico-sources"><h2>Источники и изображение</h2><ul>{icon.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>
    <p>{icon.rights.credit}. <a href={icon.rights.url} target="_blank" rel="noreferrer">{icon.rights.label}</a>.</p>
    <p>Подготовлены WebP-копии с изменением размера, без изменения композиции. Проверка записи: {icon.rights.checked}.</p>
    <a className="ico-link" href={icon.rights.original} target="_blank" rel="noreferrer">Открыть исходное изображение</a>
    <details><summary>Датировка и атрибуция: что известно</summary><p>{icon.caution}</p></details>
    <details><summary>Сведения записи источника</summary><dl className="ico-facts">
      {Object.entries({ 'Название': icon.originalMetadata.title, 'Дата': icon.originalMetadata.date, 'Культура': icon.originalMetadata.culture, 'Атрибуция': icon.originalMetadata.attribution, 'Материал': icon.originalMetadata.material }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
    </dl></details>
  </section>;
}
export function Passport() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { value: icon, error, retry } = useResource(() => loadIcon(id), id);
  if (!icon) return <LoadState error={error} retry={retry} />;
  return <>
    <Helmet><title>{icon.title} — Иконография</title><meta name="description" content={`${icon.title}. ${icon.period}. ${icon.description}`} /></Helmet>
    <section className="ico-section">
      <BackLink />
      <div className="ico-passport"><div className="ico-passport-art"><Artwork icon={icon} priority zoom /><p className="ico-small">{icon.rights.credit} · {icon.rights.label}</p></div>
        <div><p className="ico-eyebrow">{icon.tradition} · {icon.period}</p><h1>{icon.title}</h1><p className="ico-lead">{icon.description}</p>
          <div className="ico-actions"><Link className="ico-button" to={`/iconography/practice?icon=${icon.id}`}>Одна икона — всё о ней</Link>
            <Link className="ico-link" to={`/iconography/compare?left=${icon.id}`}>Сравнить</Link></div>
          <PassportFacts icon={icon} />
        </div></div>
      <div className="ico-reading"><p className="ico-eyebrow">Учимся смотреть</p><h2>На что обратить внимание</h2>
        {icon.clues.filter((clue) => clue.title !== 'Что важно помнить').map((clue) => <article className="ico-clue ico-clue-text" key={clue.title}><div><h3>{clue.title}</h3><p>{clue.text}</p></div></article>)}
        {icon.story?.map((section) => <section className="ico-context" key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
        {icon.reading && <section className="ico-reading-links"><h2>Почитать о персонаже и сюжете</h2><ul>{icon.reading.map((link) => <li key={link.url}><a className="ico-link" href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>)}</ul><p className="ico-small">Это дальнейшее чтение. Датировку и авторство именно этой иконы проверяйте по источникам ниже.</p></section>}
        {icon.schoolId && <Link className="ico-link" to={`/iconography/schools/${icon.schoolId}`} state={{ returnTo: `/iconography/icon/${icon.id}`, returnLabel: 'Назад к иконе', returnState: location.state }}>О школе и художественной традиции</Link>}
        <Sources icon={icon} /><BackLink /><Feedback iconId={icon.id} />
      </div>
    </section>
  </>;
}

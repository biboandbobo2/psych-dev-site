import { Link, useParams } from 'react-router-dom';
import type { IconSummary } from '../types';
import { loadSchools, useResource } from '../lib/catalog';
import { LoadState } from './Passport';
import { IconCard } from './Catalog';
import { BackLink } from './BackLink';
export function School({ icons }: { icons: IconSummary[] }) {
  const { id = '' } = useParams();
  const { value: schools, error, retry } = useResource(loadSchools, 'schools');
  if (!schools) return <LoadState error={error} retry={retry} />;
  const school = schools.find((x) => x.id === id);
  if (!school) return <section className="ico-section"><BackLink /><h1>Материал не найден</h1></section>;
  const examples = icons.filter((x) => x.schoolId === id);
  return <section className="ico-section"><BackLink /><div className="ico-reading"><p className="ico-eyebrow">Школы и традиции</p><h1>{school.title}</h1><p className="ico-lead">{school.intro}</p>
    {school.sections.map((s) => <section className="ico-context" key={s.title}><h2>{s.title}</h2><p>{s.text}</p></section>)}
    <h2>Источники и дальнейшее чтение</h2><ul>{school.sources.map((s) => <li key={s.url}><a className="ico-link" href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
    <details><summary>Другие школы и традиции</summary><ul>{schools.filter((x) => x.id !== id).map((x) => <li key={x.id}><Link to={`/iconography/schools/${x.id}`}>{x.title}</Link></li>)}</ul></details>
    </div><h2>Примеры из коллекции</h2><div className="ico-grid">{examples.slice(0,12).map((icon) => <IconCard key={icon.id} icon={icon} />)}</div></section>;
}

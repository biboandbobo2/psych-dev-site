import { Link, useLocation, useParams } from 'react-router-dom';
import type { IconSchool, IconSummary } from '../types';
import { loadSchools, useResource } from '../lib/catalog';
import { LoadState } from './Passport';
import { IconCard } from './Catalog';
import { BackLink } from './BackLink';
import { Artwork } from './Artwork';
import { WithGlossary } from './Term';

type SectionExample = NonNullable<IconSchool['sections'][number]['examples']>[number];

/** Миниатюры под абзацем: ссылка в паспорт с сохранением цепочки возврата и фраза «что смотреть». */
function SectionExamples({ items, icons }: { items: SectionExample[]; icons: IconSummary[] }) {
  const location = useLocation();
  const state = { returnTo: location.pathname, returnLabel: 'Назад к школе', returnState: location.state };
  const shown = items.map((item) => ({ ...item, icon: icons.find((x) => x.id === item.iconId) }));
  const found = shown.filter((item) => item.icon);
  if (!found.length) return null;

  return (
    <ul className="ico-school-examples">
      {found.map(({ iconId, note, icon }) => (
        <li key={iconId}>
          <Link to={`/iconography/icon/${iconId}`} state={state}>
            <Artwork icon={icon!} alt="" sizes="(max-width: 700px) 43vw, 380px" />
            <h3>{icon!.title}</h3>
          </Link>
          <p className="ico-small"><WithGlossary text={note} /></p>
        </li>
      ))}
    </ul>
  );
}

export function School({ icons }: { icons: IconSummary[] }) {
  const { id = '' } = useParams();
  const { value: schools, error, retry } = useResource(loadSchools, 'schools');
  if (!schools) return <LoadState error={error} retry={retry} />;

  const school = schools.find((x) => x.id === id);
  // Пришли из индекса школ, а не из коллекции: и текст, и ссылка должны вести туда же.
  if (!school) return (
    <section className="ico-empty">
      <h1>Такой статьи нет</h1>
      <p>Адрес мог устареть или содержать опечатку.</p>
      <Link className="ico-button" to="/iconography/schools">Все статьи о школах</Link>
    </section>
  );
  const examples = icons.filter((x) => x.schoolId === id);

  return (
    <section className="ico-section">
      <BackLink />
      <div className="ico-reading">
        <p className="ico-eyebrow">Школы и традиции</p>
        <h1>{school.title}</h1>
        <p className="ico-lead"><WithGlossary text={school.intro} /></p>
        {school.sections.map((section) => (
          <section className="ico-context" key={section.title}>
            <h2>{section.title}</h2>
            <p><WithGlossary text={section.text} /></p>
            {section.examples && <SectionExamples items={section.examples} icons={icons} />}
          </section>
        ))}
        <h2>Источники и дальнейшее чтение</h2>
        <ul>
          {school.sources.map((source) => (
            <li key={source.url}><a className="ico-link" href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>
          ))}
        </ul>
        <h2>Другие школы и традиции</h2>
        <ul>
          {schools.filter((x) => x.id !== id).map((x) => (
            <li key={x.id}><Link to={`/iconography/schools/${x.id}`}>{x.title}</Link></li>
          ))}
        </ul>
      </div>
      <h2>Примеры из коллекции</h2>
      <div className="ico-grid">{examples.slice(0, 12).map((icon) => <IconCard key={icon.id} icon={icon} />)}</div>
    </section>
  );
}

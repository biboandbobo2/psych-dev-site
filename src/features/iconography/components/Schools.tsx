import { Link } from 'react-router-dom';
import type { IconSummary } from '../types';
import { loadSchools, useResource } from '../lib/catalog';
import { counted } from '../lib/format';
import { LoadState } from './Passport';
import { WithGlossary } from './Term';

/** Первое предложение вступления: достаточно, чтобы выбрать статью, и не пересказывает её. */
const opening = (intro: string) => intro.split(/(?<=[.!?])\s+/)[0];

export function Schools({ icons }: { icons: IconSummary[] }) {
  const { value: schools, error, retry } = useResource(loadSchools, 'schools');
  if (!schools) return <LoadState error={error} retry={retry} />;

  return (
    <section className="ico-section">
      <p className="ico-eyebrow">Школы и традиции</p>
      <h1>О чём говорят школы</h1>
      <p className="ico-lead">
        Короткие статьи о традициях и центрах, с которыми связаны произведения коллекции.
        Школа — не ярлык на иконе: она объясняет, откуда пришли приёмы, которые вы видите.
      </p>

      <ul className="ico-school-index">
        {schools.map((school) => {
          const examples = icons.filter((icon) => icon.schoolId === school.id).length;
          return (
            <li key={school.id}>
              <h2><Link to={`/iconography/schools/${school.id}`}>{school.title}</Link></h2>
              <p><WithGlossary text={opening(school.intro)} /></p>
              <p className="ico-small">
                {examples ? `${counted(examples, 'икона', 'иконы', 'икон')} в коллекции` : 'Примеров в коллекции пока нет'}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

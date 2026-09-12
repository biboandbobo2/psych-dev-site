import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { IconSummary } from '../types';
import { loadGlossary, useResource } from '../lib/catalog';
import { LoadState } from './Passport';

export function Glossary({ icons }: { icons: IconSummary[] }) {
  const { value: terms, error, retry } = useResource(loadGlossary, 'glossary');
  const { hash } = useLocation();

  // Переход «В глоссарии →» ведёт на конкретное слово, а router сам к якорю не прокручивает.
  useEffect(() => {
    if (!terms || !hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView?.({ block: 'start' });
  }, [terms, hash]);

  if (!terms) return <LoadState error={error} retry={retry} />;
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, 'ru'));

  return (
    <>
      <Helmet>
        <title>Глоссарий — Иконография</title>
        <meta name="description" content="Короткий словарь слов, которые встречаются в паспортах и заданиях портала: средник, извод, мафорий, позём, ассист." />
      </Helmet>
      <section className="ico-section ico-reading">
        <p className="ico-eyebrow">Словарь портала</p>
        <h1>Слова, которые здесь встречаются</h1>
        <p className="ico-lead">
          Всё объяснено через то, что видно на иконе. В подсказках и разборах эти слова подчёркнуты пунктиром — наведите или нажмите, чтобы прочитать пояснение по месту.
        </p>

        <dl className="ico-glossary">
          {sorted.map((term) => {
            const example = term.example && icons.find((icon) => icon.id === term.example!.iconId);
            return (
              <div key={term.id}>
                <dt id={term.id}>{term.term}</dt>
                <dd>
                  <p>{term.definition}</p>
                  {example && (
                    <>
                      <p className="ico-small">{term.example!.note}</p>
                      <Link className="ico-link" to={`/iconography/icon/${example.id}`}
                        state={{ returnTo: '/iconography/glossary', returnLabel: 'Назад в глоссарий' }}
                      >{example.title}</Link>
                    </>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </>
  );
}

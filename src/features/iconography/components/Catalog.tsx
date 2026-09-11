import { useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import type { IconSummary } from '../types';
import { displayPeriod, rankIcons, searchIcons, sortIcons, traditionGroup, type CatalogOrder } from '../lib/catalog';
import { Artwork } from './Artwork';
import { CatalogFilters } from './CatalogFilters';

const pageSize = 12;

export function IconCard({ icon }: { icon: IconSummary }) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}#${icon.id}`;
  const returnLabel = location.pathname.includes('schools') ? 'Назад к школе' : 'Назад к коллекции';
  return (
    <article className="ico-card" id={icon.id}>
      <Link to={`/iconography/icon/${icon.id}`} state={{ returnTo, returnLabel }}>
        <Artwork icon={icon} alt="" sizes="(max-width: 640px) 43vw, 30vw" />
        <div className="ico-card-caption">
          <p className="ico-eyebrow">{icon.tradition} · {displayPeriod(icon)}</p>
          <h3>{icon.title}</h3>
          <p>{icon.museum}</p>
        </div>
      </Link>
    </article>
  );
}

/**
 * Возврат из паспорта приходит как /iconography/catalog?…#<id>. Общий useScrollRestoration
 * к этому моменту карточку ещё не видит и уводит страницу наверх, поэтому каталог
 * доводит прокрутку сам: кадр после отрисовки и две отложенные попытки, потому что
 * ленивые изображения меняют высоту сетки уже после первого кадра.
 */
function useCardAnchor(hash: string, page: number) {
  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!id) return;
    let cancelled = false;
    const bringIntoView = () => {
      if (cancelled) return;
      const card = document.getElementById(id);
      if (!card) return;
      const box = card.getBoundingClientRect();
      const visible = box.height > 0 && box.top >= 0 && box.bottom <= window.innerHeight;
      if (!visible) card.scrollIntoView?.({ block: 'center' });
    };
    const frame = requestAnimationFrame(bringIntoView);
    const timers = [150, 500].map((delay) => setTimeout(bringIntoView, delay));

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [hash, page]);
}

export function Catalog({ icons }: { icons: IconSummary[] }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const query = params.get('q') ?? '';
  const tradition = params.get('tradition') ?? '';
  const century = params.get('century') ?? '';
  const subject = params.get('subject') ?? '';
  const order: CatalogOrder = params.get('sort') === 'title' ? 'title' : 'century';

  const found = searchIcons(icons, query, tradition, century, subject);
  const filtered = rankIcons(sortIcons(found, order), query);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(params.get('page'))) || 1));
  useCardAnchor(location.hash, page);

  const setFilter = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  return (
    <section className="ico-section">
      <h1>Коллекция</h1>
      <CatalogFilters
        icons={icons}
        values={{ query, tradition: tradition ? traditionGroup(tradition) : '', century, subject, order }}
        onChange={setFilter}
      />
      <div className="ico-results"><p role="status">Найдено: {filtered.length}</p></div>

      {filtered.length ? (
        <div className="ico-grid">
          {filtered.slice((page - 1) * pageSize, page * pageSize).map((icon) => <IconCard key={icon.id} icon={icon} />)}
        </div>
      ) : (
        <div className="ico-empty">
          <h2>Пока нет совпадений</h2>
          <p>Попробуйте имя святого или более широкий период.</p>
          <button className="ico-button" onClick={() => setParams({})}>Сбросить фильтры</button>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="ico-pagination" aria-label="Страницы каталога">
          <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Назад</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))}>Далее</button>
        </nav>
      )}
    </section>
  );
}

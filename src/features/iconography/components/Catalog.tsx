import { useSearchParams, Link, useLocation } from 'react-router-dom';
import type { IconSummary } from '../types';
import { searchIcons } from '../lib/catalog';
import { Artwork } from './Artwork';
export function IconCard({ icon }: { icon: IconSummary }) {
  const location = useLocation();
  return <article className="ico-card" id={icon.id}><Link to={`/iconography/icon/${icon.id}`} state={{ returnTo: `${location.pathname}${location.search}#${icon.id}`, returnLabel: location.pathname.includes("schools") ? "Назад к школе" : "Назад к коллекции" }}>
    <Artwork icon={icon} alt="" sizes="(max-width: 640px) 43vw, 30vw" /><div className="ico-card-caption"><p className="ico-eyebrow">{icon.tradition} · {icon.period}</p>
      <h3>{icon.title}</h3><p>{icon.museum}</p></div>
  </Link></article>;
}
export function Catalog({ icons }: { icons: IconSummary[] }) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const tradition = params.get('tradition') ?? '';
  const century = params.get('century') ?? '';
  const priority = (icon: IconSummary) => icon.recognitionGroup ? icon.tradition === 'Русская' ? 2 : 1 : 0;
  const filtered = searchIcons(icons, query, tradition, century).sort((a, b) => priority(b) - priority(a));
  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(params.get('page'))) || 1));
  const setFilter = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  return <section className="ico-section">
    <h1>Коллекция</h1>
    <div className="ico-filters">
      <label className="ico-search">Поиск<input type="search" placeholder="Образ, святой, музей, мастер…" value={query} onChange={(e) => setFilter('q', e.target.value)} /></label>
      <label>Традиция<select value={tradition} onChange={(e) => setFilter('tradition', e.target.value)}><option value="">Все традиции</option>
        {[...new Set(icons.map((x) => x.tradition))].sort().map((x) => <option key={x}>{x}</option>)}
      </select></label>
      <label>Век<select value={century} onChange={(e) => setFilter('century', e.target.value)}><option value="">Все периоды</option>
        {[...new Set(icons.flatMap((x) => x.centuries))].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n} век</option>)}
      </select></label>
    </div>
    <div className="ico-results"><p role="status">Найдено: {filtered.length}</p></div>
    {filtered.length ? <div className="ico-grid">{filtered.slice((page - 1) * 12, page * 12).map((icon) => <IconCard key={icon.id} icon={icon} />)}</div>
      : <div className="ico-empty"><h2>Пока нет совпадений</h2><p>Попробуйте имя святого или более широкий период.</p><button className="ico-button" onClick={() => setParams({})}>Сбросить фильтры</button></div>}
    {totalPages > 1 && <nav className="ico-pagination" aria-label="Страницы каталога">
      <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Назад</button><span>{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))}>Далее</button>
    </nav>}
  </section>;
}

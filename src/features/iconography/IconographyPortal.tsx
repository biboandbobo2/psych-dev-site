import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { loadCatalog, useResource } from './lib/catalog';
import { Home } from './components/Home';
import { Catalog } from './components/Catalog';
import { Passport, LoadState } from './components/Passport';
import { Compare } from './components/Compare';
import { Learn } from './components/Learn';
import { Practice } from './components/Practice';
import { School } from './components/School';
import { Schools } from './components/Schools';
import { Glossary } from './components/Glossary';
import { GlossaryProvider } from './components/Term';
import { About } from './components/About';
import './iconography.css';
import './recognition.css';

/** Свой заголовок вкладки у каждого раздела: в истории и закладках страницы должны различаться. */
const sectionTitles = new Map([
  ['', 'Викторина'],
  ['catalog', 'Коллекция'],
  ['practice', 'Практика'],
  ['learn', 'Маршрут'],
  ['compare', 'Сравнение'],
  ['schools', 'Школы'],
  ['about', 'О проекте'],
]);

export function IconographyPortal() {
  const { value: icons, error, retry } = useResource(loadCatalog, 'catalog');
  const location = useLocation();
  // Паспорт и глоссарий ставят собственный заголовок ниже по дереву и перекрывают этот.
  const section = sectionTitles.get(location.pathname.replace(/^\/iconography\/?/, '').split('/')[0]);
  return (
    <div className="iconography">
      <Helmet>
        <title>{section ? `${section} — Иконография` : 'Иконография — учиться видеть | Академия'}</title>
        <meta name="description" content="Бесплатный путеводитель по иконографии: подлинные иконы, музейные паспорта, сравнения и обучение без подготовки." />
        <html lang="ru" />
      </Helmet>
      <a className="ico-skip" href="#iconography-content">Перейти к содержанию</a>

      <header className="ico-header">
        <Link to="/iconography" className="ico-brand" aria-label="Иконография — главная">
          <span className="ico-brand-mark" aria-hidden="true">и</span>
          <span>иконография<small>проект Академии</small></span>
        </Link>
        <nav aria-label="Иконография">
          <NavLink end to="/iconography">Викторина</NavLink>
          <NavLink to="/iconography/catalog">Коллекция</NavLink>
          <NavLink to="/iconography/practice">Практика</NavLink>
          <NavLink to="/iconography/learn">Маршрут</NavLink>
          <NavLink to="/iconography/compare">Сравнение</NavLink>
          <NavLink to="/iconography/schools">Школы</NavLink>
        </nav>
      </header>

      <main id="iconography-content" tabIndex={-1}>
        {!icons ? <LoadState error={error} retry={retry} /> : (
          <GlossaryProvider><Routes>
            <Route index element={<Home icons={icons} />} />
            <Route path="catalog" element={<Catalog icons={icons} />} />
            <Route path="icon/:id" element={<Passport icons={icons} />} />
            <Route path="schools" element={<Schools icons={icons} />} />
            <Route path="schools/:id" element={<School icons={icons} />} />
            <Route path="learn" element={<Learn icons={icons} />} />
            <Route path="compare" element={<Compare icons={icons} />} />
            <Route path="practice" element={<Practice key={location.search} icons={icons} />} />
            {/* Реквизитов пока нет: страница поддержки скрыта, маршрут оставлен до их публикации. */}
            <Route path="support" element={<Navigate to="/iconography/about" replace />} />
            <Route path="about" element={<About />} />
            <Route path="glossary" element={<Glossary icons={icons} />} />
            <Route path="*" element={(
              <section className="ico-empty">
                <h1>Такой страницы нет</h1>
                <Link className="ico-button" to="/iconography/catalog">Открыть коллекцию</Link>
              </section>
            )} />
          </Routes></GlossaryProvider>
        )}
      </main>

      <footer className="ico-footer">
        <nav aria-label="О проекте">
          <Link to="/iconography/about">О проекте</Link>
          <Link to="/iconography/glossary">Глоссарий</Link>
          <Link to="/iconography/learn">Перед поездкой</Link>
          <a href={import.meta.env.MODE === 'iconography' ? 'https://academydom.com' : '/home'}>Академия</a>
        </nav>
      </footer>
    </div>
  );
}

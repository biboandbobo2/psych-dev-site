import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { pageTransition } from '../theme/motion';
import { SITE_NAME } from '../routes';
import { useHomePageContent } from '../hooks/useHomePageContent';
import { PageLoader } from '../components/ui';
import { HomeDashboard } from './home/HomeDashboard';
import { renderSection } from './home/HomeSections';
import type { HomePageSection } from '../types/homePage';

export function HomePage() {
  const { content, loading, error } = useHomePageContent();

  if (loading) {
    return <PageLoader />;
  }

  if (error || !content) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-700 mb-2">Ошибка загрузки страницы</p>
          {error && <p className="text-sm text-muted">{error.message}</p>}
        </div>
      </div>
    );
  }

  // Секции из админ-редактируемого контента. В текущей ветке массивы пусты
  // (логика наполнения ещё не подключена), но роутинг секций сохранён.
  const activeSections: HomePageSection[] = [];
  const nonHeroSections: HomePageSection[] = [];

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: pageTransition }}
      exit={{ opacity: 0, transition: pageTransition }}
      className="flex-1"
    >
      <Helmet>
        <title>{SITE_NAME} — Психология развития от рождения до глубокой старости</title>
        <meta
          name="description"
          content="Интерактивный курс по психологии развития человека. 14 возрастных периодов, видео-лекции, тесты и практические инструменты."
        />
      </Helmet>

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10">
        <HomeDashboard />
        {activeSections
          .filter((s) => s.type === 'hero')
          .map((section) => renderSection(section))}
        {nonHeroSections.map((section) => renderSection(section))}

        <Link
          to="/features"
          className="mt-10 block rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 sm:px-8 sm:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">💡</span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Возможности платформы</h3>
                  <p className="text-sm text-white/80 hidden sm:block">
                    Узнайте обо всех функциях: тесты, заметки, таймлайн, научный поиск
                  </p>
                </div>
              </div>
              <svg
                className="w-6 h-6 text-white/80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </Motion.div>
  );
}

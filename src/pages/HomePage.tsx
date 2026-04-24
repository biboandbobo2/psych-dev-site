import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import { pageTransition } from '../theme/motion';
import { SITE_NAME } from '../routes';
import { HomeDashboard } from './home/HomeDashboard';

export function HomePage() {
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
      </div>
    </Motion.div>
  );
}

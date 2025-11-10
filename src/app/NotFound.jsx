import { motion as Motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { NavLink } from 'react-router-dom';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { SITE_NAME } from '../routes';
import { pageTransition } from '../theme/motion';

export default function NotFound() {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: pageTransition }}
      exit={{ opacity: 0, y: -16, transition: pageTransition }}
      className="flex-1"
    >
      <Helmet>
        <title>Страница не найдена — {SITE_NAME}</title>
        <meta
          name="description"
          content="Мы не нашли такую страницу. Вернитесь на главную."
        />
      </Helmet>
      <Section>
        <h2 className="text-3xl leading-snug font-semibold text-fg">Страница не найдена</h2>
        <p className="text-lg leading-8 text-muted max-w-measure">
          Кажется, такой страницы нет. Вернитесь на главную и выберите раздел.
        </p>
        <Button as={NavLink} to="/prenatal" className="mt-4 w-fit">
          На главную
        </Button>
      </Section>
    </Motion.div>
  );
}

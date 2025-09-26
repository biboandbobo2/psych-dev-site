// File: src/App.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ROUTE_CONFIG, SITE_NAME, NOT_FOUND_REDIRECT } from './routes';
import { usePeriods } from './lib/usePeriods';
import { BACKGROUND_BY_PERIOD } from './theme/backgrounds';
import { Section, SectionMuted } from './components/ui/Section';
import { Skeleton } from './components/ui/Skeleton';
import { Button } from './components/ui/Button';
import { NavigationProgress } from './components/ui/NavigationProgress';
import { cn } from './lib/cn';

const transition = { duration: 0.25, ease: [0.16, 1, 0.3, 1] };

/* ------------ 🔄  SCROLL MANAGEMENT ------------------------------------------- */
function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef(new Map());

  useEffect(() => {
    const key = location.key || location.pathname;
    const positions = positionsRef.current;
    return () => {
      positions.set(key, window.scrollY);
    };
  }, [location]);

  useLayoutEffect(() => {
    const key = location.key || location.pathname;
    const stored = positionsRef.current.get(key);
    if (navigationType === 'POP' && typeof stored === 'number') {
      window.scrollTo(0, stored);
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location, navigationType]);

  return null;
}

/* ------------ 🧭  HELPERS ----------------------------------------------------- */
const ensureUrl = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
};

const parseTimeParam = (raw) => {
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return raw;
  const match = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) return undefined;
  const [, hours, minutes, seconds] = match;
  const total =
    (Number(hours ?? 0) || 0) * 3600 +
    (Number(minutes ?? 0) || 0) * 60 +
    (Number(seconds ?? 0) || 0);
  return total ? String(total) : undefined;
};

const extractYoutubeId = (url) => {
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    return url.pathname.replace(/\//g, '');
  }
  if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    if (url.pathname.startsWith('/embed/')) {
      const [, , videoId] = url.pathname.split('/');
      return videoId || null;
    }
    if (url.pathname.startsWith('/watch')) {
      return url.searchParams.get('v');
    }
    if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/')) {
      const [, , videoId] = url.pathname.split('/');
      return videoId || null;
    }
  }
  return null;
};

const buildYoutubeEmbedUrl = (rawValue) => {
  const url = ensureUrl(rawValue);
  if (!url) return '';

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' && url.pathname.startsWith('/embed/')) {
    return url.toString();
  }

  const videoId = extractYoutubeId(url);
  if (!videoId) return '';

  const params = new URLSearchParams();
  if (url.searchParams.has('list')) params.set('list', url.searchParams.get('list'));
  if (url.searchParams.has('si')) params.set('si', url.searchParams.get('si'));

  const start = url.searchParams.get('start') ?? parseTimeParam(url.searchParams.get('t'));
  if (start) params.set('start', start);

  if (!params.has('feature')) params.set('feature', 'oembed');
  if (!params.has('rel')) params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');

  const query = params.toString();
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`;
};

const isUrlString = (value) => Boolean(ensureUrl(value));

const normalizeVideoEntry = (entry) => {
  if (!entry) {
    return {
      title: 'Видео-лекция',
      embedUrl: '',
      originalUrl: '',
      isYoutube: false,
    };
  }

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return {
      title: 'Видео-лекция',
      embedUrl: buildYoutubeEmbedUrl(trimmed),
      originalUrl: trimmed,
      isYoutube: Boolean(ensureUrl(trimmed)?.hostname.includes('youtu')),
    };
  }

  const rawUrl = typeof entry.url === 'string' ? entry.url.trim() : '';
  return {
    title: entry.title ?? 'Видео-лекция',
    embedUrl: buildYoutubeEmbedUrl(rawUrl),
    originalUrl: rawUrl,
    isYoutube: Boolean(ensureUrl(rawUrl)?.hostname.includes('youtu')),
  };
};

/* ------------ 🧩  UI STATES ---------------------------------------------------- */
function LoadingSplash() {
  return (
    <div className="bg-bg text-fg min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <p className="text-sm leading-6 text-muted uppercase tracking-[0.2em]">Загрузка</p>
          <p className="text-4xl md:text-5xl font-semibold tracking-tight">Psych-Dev</p>
          <p className="text-sm leading-6 text-muted max-w-sm mx-auto">
            Собираем материалы и структуры разделов. Пожалуйста, подождите.
          </p>
        </div>
        <div className="space-y-3 w-72 mx-auto">
          <Skeleton className="h-3" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="bg-bg text-fg min-h-screen flex items-center justify-center px-4">
      <SectionMuted className="max-w-lg mx-auto !mb-0">
        <h2 className="text-3xl font-semibold leading-snug text-fg">Не удалось загрузить данные</h2>
        <p className="text-lg leading-8 text-muted">{message}</p>
      </SectionMuted>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-bg text-fg min-h-screen flex items-center justify-center px-4">
      <SectionMuted className="max-w-lg mx-auto !mb-0">
        <h2 className="text-3xl font-semibold leading-snug text-fg">Нет данных для отображения</h2>
        <p className="text-lg leading-8 text-muted">
          Проверьте файл CSV с периодами. Похоже, там пусто.
        </p>
      </SectionMuted>
    </div>
  );
}

/* ------------ 📄  ROUTE VIEWS -------------------------------------------------- */
function PeriodRoute({ config, period }) {
  const title = config.meta?.title ?? `${config.navLabel} — ${SITE_NAME}`;
  const description =
    config.meta?.description ?? `Материалы и ссылки по разделу ${config.navLabel}.`;
  const showPlaceholder = Boolean(config.placeholder || !period);
  const placeholderText =
    config.placeholder || 'Раздел пока недоступен. Загляните позже.';

  const backgroundImage = BACKGROUND_BY_PERIOD[config.periodId];
  const backgroundClass = backgroundImage ? 'bg-repeat bg-[length:180px]' : '';
  const backgroundStyle = backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined;

  const renderBadgeItem = (item, index) => (
    <span
      key={index}
      className="inline-flex items-center rounded-full bg-accent-100 text-accent px-3 py-1 text-sm font-medium"
    >
      {item}
    </span>
  );

  const renderListItem = (item, index) => (
    <li key={index} className="leading-7 text-fg">
      {item}
    </li>
  );

  const renderSection = ([slug, section]) => {
    if (!section?.content?.length) return null;

    if (section.title === 'Видео-лекция') {
      const { embedUrl, originalUrl, title: videoTitle, isYoutube } = normalizeVideoEntry(
        section.content[0]
      );

      if (!embedUrl) {
        return (
          <Section key={slug} title={section.title}>
            <p className="text-lg leading-8 text-muted">
              Видео недоступно для встраивания.{' '}
              {isUrlString(originalUrl) ? (
                <a className="text-accent hover:underline underline-offset-4" href={originalUrl} target="_blank" rel="noreferrer">
                  Открыть на YouTube
                </a>
              ) : (
                'Проверьте URL в CSV.'
              )}
            </p>
          </Section>
        );
      }

      return (
        <Section key={slug} title={section.title}>
          <iframe
            title={videoTitle}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full aspect-video rounded-2xl border border-border shadow-brand"
          />
          {!isYoutube && isUrlString(originalUrl) ? (
            <p className="text-sm leading-6 text-muted">
              Ссылка не похожа на YouTube. Проверить источник:{' '}
              <a className="text-accent hover:underline underline-offset-4" href={originalUrl} target="_blank" rel="noreferrer">
                {originalUrl}
              </a>
            </p>
          ) : null}
        </Section>
      );
    }

    const isBadgeSection = section.title?.toLowerCase().includes('понят');
    const isListSection = section.title?.toLowerCase().includes('вопрос');

    if (isBadgeSection) {
      return (
        <Section key={slug} title={section.title}>
          <div className="flex flex-wrap gap-2">
            {section.content
              .filter((item) => typeof item === 'string')
              .map((item, index) => renderBadgeItem(item, index))}
          </div>
        </Section>
      );
    }

    if (
      isListSection &&
      section.content.every((item) => typeof item === 'string')
    ) {
      const lines = section.content
        .map((item) => item.split('\n'))
        .flat()
        .filter(Boolean);

      return (
        <Section key={slug} title={section.title}>
          <ul className="list-disc pl-6 marker:text-accent space-y-2 text-lg leading-8 text-fg">
            {lines.map((line, index) => renderListItem(line, index))}
          </ul>
        </Section>
      );
    }

    return (
      <Section key={slug} title={section.title}>
        <div className="space-y-4">
          {section.content.map((item, index) => {
            if (typeof item === 'string') {
              const parsedUrl = ensureUrl(item);
              if (parsedUrl) {
                return (
                  <p key={index} className="text-lg leading-8 text-fg">
                    <a className="text-accent hover:underline underline-offset-4" href={parsedUrl.toString()} target="_blank" rel="noreferrer">
                      {item}
                    </a>
                  </p>
                );
              }

              return (
                <p key={index} className="text-lg leading-8 text-fg max-w-measure">
                  {item}
                </p>
              );
            }

            if (item.type === 'quiz') {
              return (
                <details
                  key={index}
                  className="group rounded-2xl bg-card2 border border-border/60 px-5 py-4 text-fg"
                >
                  <summary className="cursor-pointer font-semibold leading-7">
                    {item.q}
                  </summary>
                  <ul className="mt-3 space-y-2 list-disc pl-6 marker:text-accent text-base leading-7">
                    {item.options.map((opt) => (
                      <li
                        key={opt}
                        className={opt === item.a ? 'font-semibold text-accent' : ''}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </details>
              );
            }

            const rawUrl = typeof item.url === 'string' ? item.url.trim() : '';
            const parsedUrl = ensureUrl(rawUrl);
            const content = (
              <span className="text-lg leading-8 text-fg">
                <strong>{item.title}</strong>
                {item.author ? ` — ${item.author}` : ''}
                {item.year ? ` (${item.year})` : ''}
              </span>
            );

            if (parsedUrl) {
              return (
                <p key={index} className="text-lg leading-8 text-fg max-w-measure">
                  <a
                    className="text-accent hover:underline underline-offset-4"
                    href={parsedUrl.toString()}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {content}
                  </a>
                </p>
              );
            }

            return (
              <p key={index} className="text-lg leading-8 text-fg max-w-measure">
                {content}
              </p>
            );
          })}
        </div>
      </Section>
    );
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition }}
      exit={{ opacity: 0, y: -16, transition }}
      className={cn('flex-1 bg-bg', backgroundClass)}
      style={backgroundStyle}
    >
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className="space-y-4 mb-8">
        <p className="text-sm leading-6 text-muted uppercase tracking-[0.35em]">Возрастной период</p>
        <h1 className="text-5xl md:text-6xl leading-tight font-semibold tracking-tight text-fg">
          {config.navLabel}
        </h1>
      </div>

      {showPlaceholder ? (
        <SectionMuted>
          <p className="text-lg leading-8 text-muted max-w-measure">{placeholderText}</p>
        </SectionMuted>
      ) : (
        <div className="space-y-2">
          {Object.entries(period.sections).map(renderSection)}
        </div>
      )}
    </Motion.div>
  );
}

function NotFound() {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition }}
      exit={{ opacity: 0, y: -16, transition }}
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

function AppInner() {
  const { periods, loading, error } = usePeriods();
  const location = useLocation();

  const periodMap = useMemo(() => {
    const map = new Map();
    periods.forEach((period) => map.set(period.id, period));
    return map;
  }, [periods]);

  if (loading) return <LoadingSplash />;
  if (error) return <ErrorState message={error.message} />;
  if (!periods.length) return <EmptyState />;

  return (
    <>
      <Helmet>
        <title>{SITE_NAME}</title>
        <meta
          name="description"
          content="Образовательный ресурс по возрастной психологии."
        />
      </Helmet>
      <NavigationProgress />
      <ScrollManager />
      <div className="bg-bg text-fg min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <aside className="lg:w-72 flex-shrink-0 lg:sticky lg:top-8">
              <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-4 md:p-5 space-y-2">
                <p className="text-sm leading-6 text-muted uppercase tracking-[0.3em]">
                  Навигация
                </p>
                <nav className="flex flex-col gap-2">
                  {ROUTE_CONFIG.map((config) => (
                    <NavLink
                      key={config.path}
                      to={config.path}
                      end
                      className={({ isActive }) =>
                        cn(
                          'block rounded-2xl px-4 py-3 text-base font-medium transition-colors duration-150 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20',
                          isActive
                            ? 'bg-accent-100 text-accent border-accent/30 shadow-sm'
                            : 'text-muted hover:text-fg hover:bg-card2'
                        )
                      }
                    >
                      {config.navLabel}
                    </NavLink>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Navigate to="/prenatal" replace />} />
                  {ROUTE_CONFIG.map((config) => (
                    <Route
                      key={config.path}
                      path={config.path}
                      element={<PeriodRoute config={config} period={periodMap.get(config.periodId)} />}
                    />
                  ))}
                  <Route
                    path="*"
                    element={
                      NOT_FOUND_REDIRECT ? (
                        <Navigate to="/prenatal" replace />
                      ) : (
                        <NotFound />
                      )
                    }
                  />
                </Routes>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

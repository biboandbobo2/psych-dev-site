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
import { useIntro } from './lib/useIntro';
import { BACKGROUND_BY_PERIOD } from './theme/backgrounds';
import { PERIOD_THEME, DEFAULT_THEME } from './theme/periods';
import { Section, SectionMuted } from './components/ui/Section';
import { Skeleton } from './components/ui/Skeleton';
import { Button } from './components/ui/Button';
import { NavigationProgress } from './components/ui/NavigationProgress';
import { BackToTop } from './components/ui/BackToTop';
import { cn } from './lib/cn';
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';
import RequireAdmin from './auth/RequireAdmin';
import Login from './pages/Login';
import Admin from './pages/Admin';
import AdminUsers from './pages/AdminUsers';
import AdminImport from './pages/AdminImport';
import AdminContent from './pages/AdminContent';
import AdminContentEdit from './pages/AdminContentEdit';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { useLoginModal } from './hooks/useLoginModal';
import LoginModal from './components/LoginModal';
import UserMenu from './components/UserMenu';
import Profile from './pages/Profile';

const transition = { duration: 0.25, ease: [0.16, 1, 0.3, 1] };

const hexToRgb = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace('#', '');
  if (trimmed.length === 3) {
    const r = trimmed[0];
    const g = trimmed[1];
    const b = trimmed[2];
    return hexToRgb(`${r}${r}${g}${g}${b}${b}`);
  }
  if (trimmed.length !== 6 || /[^0-9a-fA-F]/.test(trimmed)) return null;
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return `${r} ${g} ${b}`;
};

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

function usePeriodTheme(themeKey) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const theme = themeKey && PERIOD_THEME[themeKey]
      ? PERIOD_THEME[themeKey]
      : DEFAULT_THEME;
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-100', theme.accent100);
    const accentRgb = hexToRgb(theme.accent);
    if (accentRgb) {
      root.style.setProperty('--accent-rgb', accentRgb);
    }
  }, [themeKey]);
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
      deckUrl: '',
      audioUrl: '',
    };
  }

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return {
      title: 'Видео-лекция',
      embedUrl: buildYoutubeEmbedUrl(trimmed),
      originalUrl: trimmed,
      isYoutube: Boolean(ensureUrl(trimmed)?.hostname.includes('youtu')),
      deckUrl: '',
      audioUrl: '',
    };
  }

  const rawUrl = typeof entry.url === 'string' ? entry.url.trim() : '';
  return {
    title: entry.title ?? 'Видео-лекция',
    embedUrl: buildYoutubeEmbedUrl(rawUrl),
    originalUrl: rawUrl,
    isYoutube: Boolean(ensureUrl(rawUrl)?.hostname.includes('youtu')),
    deckUrl: typeof entry.deckUrl === 'string' ? entry.deckUrl.trim() : '',
    audioUrl: typeof entry.audioUrl === 'string' ? entry.audioUrl.trim() : '',
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
function IntroRoute({ config }) {
  const themeKey = config.themeKey;
  usePeriodTheme(themeKey);
  const { data, loading, error } = useIntro();
  const title = config.meta?.title ?? `${config.navLabel} — ${SITE_NAME}`;
  const description = config.meta?.description ?? '';

  const hero = (
    <div className="space-y-4 mb-8">
      <h1 className="text-5xl md:text-6xl leading-tight font-semibold tracking-tight text-fg">
        {config.navLabel}
      </h1>
    </div>
  );

  if (loading) {
    return (
      <Motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition }}
        exit={{ opacity: 0, y: -16, transition }}
        className="flex-1 bg-bg"
      >
        <Helmet>
          <title>{title}</title>
          {description ? <meta name="description" content={description} /> : null}
        </Helmet>
        {hero}
        <Section title="Видео-лекция">
          <Skeleton className="h-48 md:h-64" />
        </Section>
      </Motion.div>
    );
  }

  if (error) {
    return (
      <Motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition }}
        exit={{ opacity: 0, y: -16, transition }}
        className="flex-1 bg-bg"
      >
        <Helmet>
          <title>{title}</title>
          {description ? <meta name="description" content={description} /> : null}
        </Helmet>
        {hero}
        <SectionMuted>
          <p className="text-lg leading-8 text-muted">
            Не удалось загрузить вводное занятие. Попробуйте обновить страницу позже.
          </p>
        </SectionMuted>
      </Motion.div>
    );
  }

  if (!data) {
    return (
      <Motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition }}
        exit={{ opacity: 0, y: -16, transition }}
        className="flex-1 bg-bg"
      >
        <Helmet>
          <title>{title}</title>
          {description ? <meta name="description" content={description} /> : null}
        </Helmet>
        {hero}
        <Section title="Видео-лекция">
          <p className="text-lg leading-8 text-muted">
            Данные вводного занятия отсутствуют. Проверьте файл intro.csv.
          </p>
        </Section>
      </Motion.div>
    );
  }

  const {
    videoUrl,
    concepts,
    authors,
    coreLiterature,
    extraLiterature,
    extraVideos,
    selfQuestionsUrl,
    deckUrl,
  } = data;

  const { embedUrl, originalUrl } = normalizeVideoEntry(videoUrl);
  const videoSrc = embedUrl || originalUrl;

  const badgeBaseClass = 'inline-flex items-center rounded-full bg-accent-100 text-accent px-3 py-1 text-sm font-medium';
  const badgeInteractiveClass = `${badgeBaseClass} transition-colors duration-150 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-opacity-40`;

  const sections = [];

  const deckLink = deckUrl
    ? (
        <a
          className="mt-3 inline-block text-sm font-semibold italic text-[color:var(--accent)] hover:underline underline-offset-4"
          href={deckUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Скачать презентацию
        </a>
      )
    : null;

  sections.push(
    <Section key="video" title="Видео-лекция">
      {videoSrc ? (
        <>
          <iframe
            title="Вводное занятие — видео"
            src={videoSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="w-full aspect-video rounded-2xl border border-border shadow-brand"
          />
          {deckLink}
        </>
      ) : (
        <p className="text-lg leading-8 text-muted">
          Видео недоступно. Проверьте ссылку в intro.csv.
        </p>
      )}
    </Section>
  );

  if (concepts.length) {
    sections.push(
      <Section key="concepts" title="Понятия">
        <div className="flex flex-wrap gap-2">
          {concepts.map((concept, index) => (
            <span key={`${concept}-${index}`} className={badgeBaseClass}>
              {concept}
            </span>
          ))}
        </div>
      </Section>
    );
  }

  if (authors.length) {
    sections.push(
      <Section key="authors" title="Ключевые авторы">
        <div className="flex flex-wrap gap-2">
          {authors.map(({ label, url }, index) => (
            <a
              key={`${label}-${index}`}
              className={badgeInteractiveClass}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          ))}
        </div>
      </Section>
    );
  }

  if (coreLiterature.length) {
    sections.push(
      <Section key="core_literature" title="Основная литература">
        <div className="flex flex-wrap gap-2">
          {coreLiterature.map(({ label, url }, index) => (
            <a
              key={`${label}-${index}`}
              className={badgeInteractiveClass}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          ))}
        </div>
      </Section>
    );
  }

  if (extraLiterature.length) {
    sections.push(
      <Section key="extra_literature" title="Дополнительная литература">
        <div className="flex flex-wrap gap-2">
          {extraLiterature.map(({ label, url }, index) => (
            <a
              key={`${label}-${index}`}
              className={badgeInteractiveClass}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          ))}
        </div>
      </Section>
    );
  }

  if (extraVideos.length) {
    sections.push(
      <Section key="extra_videos" title="Дополнительные видео и лекции">
        <div className="flex flex-wrap gap-2">
          {extraVideos.map(({ label, url }, index) => (
            <a
              key={`${label}-${index}`}
              className={badgeInteractiveClass}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          ))}
        </div>
      </Section>
    );
  }

  if (selfQuestionsUrl) {
    sections.push(
      <Section key="self_questions" title="Рабочая тетрадь">
        <div className="flex flex-wrap gap-2">
          <a
            className={`${badgeInteractiveClass} font-semibold`}
            href={selfQuestionsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Скачать рабочую тетрадь
          </a>
        </div>
      </Section>
    );
  }

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition }}
      exit={{ opacity: 0, y: -16, transition }}
      className="flex-1 bg-bg"
    >
      <Helmet>
        <title>{title}</title>
        {description ? <meta name="description" content={description} /> : null}
      </Helmet>
      {hero}
      {sections}
    </Motion.div>
  );
}

function PeriodRoute({ config, period }) {
  const themeKey = config.themeKey ?? config.periodId;
  usePeriodTheme(themeKey);
  const heading = period?.label || config.navLabel;
  const title = config.meta?.title ?? `${heading} — ${SITE_NAME}`;
  const description =
    config.meta?.description ?? period?.subtitle ?? `Материалы и ссылки по разделу ${heading}.`;
  const placeholderFromConfig = config.placeholderText;
  const placeholderDefaultEnabled = config.placeholderDefaultEnabled ?? false;
  const placeholderEnabledFromData =
    typeof period?.placeholderEnabled === 'boolean' ? period.placeholderEnabled : undefined;
  const placeholderEnabled =
    placeholderEnabledFromData !== undefined
      ? placeholderEnabledFromData
      : placeholderDefaultEnabled;
  const placeholderText =
    (period?.placeholderText || placeholderFromConfig || 'Контент для этого возраста появится в ближайшем обновлении.');

  const hasSections = Boolean(
    period &&
      Object.values(period.sections ?? {}).some((section) =>
        Array.isArray(section?.content) && section.content.length > 0
      )
  );
  const showPlaceholder = placeholderEnabled || !hasSections;
  const deckUrl = period?.deckUrl ? period.deckUrl.trim() : '';
  const defaultVideoTitle = heading.trim() || 'Видео-лекция';

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

    const rawTitle = section.title ?? '';
    const lowerTitle = rawTitle.toLowerCase();
    const displayTitle = lowerTitle.includes('вопросы для контакта с собой')
      ? 'Рабочая тетрадь'
      : rawTitle;

    if (rawTitle === 'Видео-лекция') {
      const videos = section.content.map((entry, index) => {
        const normalized = normalizeVideoEntry(entry);
        const effectiveDeckUrl = normalized.deckUrl || deckUrl;
        return {
          ...normalized,
          deckUrl: effectiveDeckUrl,
          key: `${slug}-video-${index}`,
        };
      });
      const showVideoHeadings =
        videos.length > 1 ||
        videos.some((video) =>
          video.title &&
          video.title.trim().length > 0 &&
          video.title.trim().toLowerCase() !== defaultVideoTitle.toLowerCase()
        );

      if (!videos.length) {
        return null;
      }

      return (
        <Section key={slug} title={displayTitle}>
          <div className="space-y-6">
            {videos.map(({ key: videoKey, title: videoTitle, embedUrl, originalUrl, isYoutube, deckUrl: videoDeckUrl, audioUrl: videoAudioUrl }) => {
              if (!embedUrl) {
                return (
                  <div key={videoKey} className="space-y-3">
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
                  </div>
                );
              }

              return (
                <div key={videoKey} className="space-y-3">
                  {showVideoHeadings && videoTitle ? (
                    <h3 className="text-2xl font-semibold leading-tight text-fg">
                      {videoTitle}
                    </h3>
                  ) : null}
                  <iframe
                    title={videoTitle}
                    src={embedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="w-full aspect-video rounded-2xl border border-border shadow-brand"
                  />
                  {(videoDeckUrl || videoAudioUrl) ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {videoDeckUrl ? (
                        <a
                          className="inline-block text-sm font-semibold italic text-[color:var(--accent)] hover:underline underline-offset-4"
                          href={videoDeckUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Скачать презентацию
                        </a>
                      ) : null}
                      {videoAudioUrl ? (
                        <a
                          className="inline-block text-sm font-semibold italic text-[color:var(--accent)] hover:underline underline-offset-4 ml-auto"
                          href={videoAudioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Слушать аудио
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {!isYoutube && isUrlString(originalUrl) ? (
                    <p className="text-sm leading-6 text-muted">
                      Ссылка не похожа на YouTube. Проверить источник:{' '}
                      <a className="text-accent hover:underline underline-offset-4" href={originalUrl} target="_blank" rel="noreferrer">
                        {originalUrl}
                      </a>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      );
    }

    const isBadgeSection = section.title?.toLowerCase().includes('понят');
    const isListSection = section.title?.toLowerCase().includes('вопрос');

    if (isBadgeSection) {
      return (
        <Section key={slug} title={displayTitle}>
          <div className="flex flex-wrap gap-2">
            {section.content
              .filter((item) => typeof item === 'string')
              .map((item, index) => renderBadgeItem(item, index))}
          </div>
        </Section>
      );
    }

    if (slug === 'self_questions') {
      const firstItem = section.content.find((item) => typeof item === 'string') ?? '';
      const parsedUrl = ensureUrl(firstItem);

      return (
        <Section key={slug} title={displayTitle}>
          {parsedUrl ? (
            <div className="flex flex-col gap-3">
              <p className="text-lg leading-8 text-muted max-w-measure">
                Скачайте рабочую тетрадь и держите её под рукой во время просмотра лекции.
              </p>
              <Button
                as="a"
                href={parsedUrl.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                Скачать рабочую тетрадь
              </Button>
            </div>
          ) : (
            <p className="text-lg leading-8 text-muted">Ссылка на рабочую тетрадь пока недоступна.</p>
          )}
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
        <Section key={slug} title={displayTitle}>
          <ul className="list-disc pl-6 marker:text-accent space-y-2 text-lg leading-8 text-fg">
            {lines.map((line, index) => renderListItem(line, index))}
          </ul>
        </Section>
      );
    }

    return (
      <Section key={slug} title={displayTitle}>
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
            const primaryText =
              (typeof item.title === 'string' && item.title.trim()) ||
              (typeof item.label === 'string' && item.label.trim()) ||
              (typeof item.name === 'string' && item.name.trim()) ||
              '';
            const secondaryText =
              (typeof item.author === 'string' && item.author.trim()) ||
              (typeof item.subtitle === 'string' && item.subtitle.trim()) ||
              (typeof item.type === 'string' && item.type.trim()) ||
              '';
            const yearText =
              (typeof item.year === 'string' && item.year.trim()) ||
              (typeof item.year === 'number' ? item.year.toString() : '') ||
              '';

            const contentNode = (
              <span className="text-lg leading-8 text-fg">
                {primaryText ? <strong>{primaryText}</strong> : null}
                {secondaryText ? ` — ${secondaryText}` : ''}
                {yearText ? ` (${yearText})` : ''}
              </span>
            );

            const fallbackNode = rawUrl ? (
              <span className="text-lg leading-8 text-fg">{rawUrl}</span>
            ) : null;

            if (parsedUrl) {
              return (
                <p key={index} className="text-lg leading-8 text-fg max-w-measure">
                  <a
                    className="text-accent hover:underline underline-offset-4"
                    href={parsedUrl.toString()}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {primaryText ? contentNode : fallbackNode || parsedUrl.toString()}
                  </a>
                </p>
              );
            }

            return (
              <p key={index} className="text-lg leading-8 text-fg max-w-measure">
                {primaryText ? contentNode : fallbackNode}
                {!primaryText && !fallbackNode && typeof item === 'object' ? (
                  <code className="text-sm text-muted block whitespace-pre-wrap">
                    {JSON.stringify(item, null, 2)}
                  </code>
                ) : null}
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
          {heading}
        </h1>
        {period?.subtitle ? (
          <p className="text-lg leading-8 text-muted max-w-measure">{period.subtitle}</p>
        ) : null}
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

function RoutePager({ currentPath }) {
  const normalizedPath = currentPath?.endsWith('/') && currentPath.length > 1
    ? currentPath.slice(0, -1)
    : currentPath;
  const currentIndex = ROUTE_CONFIG.findIndex((route) => route.path === normalizedPath);
  if (currentIndex === -1) return null;
  const prev = currentIndex > 0 ? ROUTE_CONFIG[currentIndex - 1] : null;
  const next = currentIndex < ROUTE_CONFIG.length - 1 ? ROUTE_CONFIG[currentIndex + 1] : null;
  if (!prev && !next) return null;

  return (
    <div className="mt-10 w-full grid items-center gap-3 grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
      <div className="justify-self-start">
        {prev ? (
          <Button
            as={NavLink}
            to={prev.path}
            variant="secondary"
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <span aria-hidden="true">←</span>
            <span>{prev.navLabel}</span>
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
      </div>
      <div className="justify-self-center">
        <BackToTop />
      </div>
      <div className="justify-self-end">
        {next ? (
          <Button
            as={NavLink}
            to={next.path}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <span>{next.navLabel}</span>
            <span aria-hidden="true">→</span>
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
      </div>
    </div>
  );
}

function AppInner() {
  const { periods, loading, error } = usePeriods();
  const location = useLocation();
  const [user, authLoading] = useAuthState(auth);
  const { isOpen, openModal, closeModal } = useLoginModal();

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
      <LoginModal isOpen={isOpen} onClose={closeModal} />
      <main className="relative bg-bg text-fg min-h-screen">
        <div className="absolute top-6 right-6 z-40">
          {!user ? (
            <button
              onClick={openModal}
              disabled={authLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Войти
            </button>
          ) : (
            <UserMenu user={user} />
          )}
        </div>
        <div id="page-top" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <aside className="lg:w-72 flex-shrink-0 lg:sticky lg:top-8">
              <div className="rounded-2xl border border-border/60 bg-card shadow-brand p-4 md:p-5 space-y-2">
                <p className="text-sm leading-6 text-muted uppercase tracking-[0.3em]">
                  Навигация
                </p>
                <nav className="flex flex-col gap-2">
                  {ROUTE_CONFIG.map((config) => {
                    const periodData = config.periodId ? periodMap.get(config.periodId) : null;

                    if (config.periodId && !periodData) {
                      return null;
                    }

                    const label = periodData?.label || config.navLabel;

                    return (
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
                        {label}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <div className="flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<Navigate to="/prenatal" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth>
                        <Admin />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <RequireAdmin>
                        <AdminUsers />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="/admin/content"
                    element={
                      <RequireAdmin>
                        <AdminContent />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="/admin/content/edit/:periodId"
                    element={
                      <RequireAdmin>
                        <AdminContentEdit />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="/admin/import"
                    element={
                      <RequireAdmin>
                        <AdminImport />
                      </RequireAdmin>
                    }
                  />
                  <Route path="/profile" element={<Profile />} />
                  {ROUTE_CONFIG.map((config) => (
                    <Route
                      key={config.path}
                      path={config.path}
                      element={
                        config.isIntro ? (
                          <IntroRoute config={config} />
                        ) : (
                          <PeriodRoute
                            config={config}
                            period={periodMap.get(config.periodId)}
                          />
                        )
                      }
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
              <RoutePager currentPath={location.pathname} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </Router>
  );
}

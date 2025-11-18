import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import { SectionMuted } from '../components/ui/Section';
import { BACKGROUND_BY_PERIOD } from '../theme/backgrounds';
import { pageTransition } from '../theme/motion';
import { SITE_NAME } from '../routes';
import { normalizeText } from '../utils/contentHelpers';
import { cn } from '../lib/cn';
import type { Period } from '../types/content';
import { usePeriodTheme } from '../features/periods/hooks/usePeriodTheme';
import { usePeriodTests } from '../features/periods/hooks/usePeriodTests';
import { PeriodSections } from '../features/periods/components/PeriodSections';
import { debugLog } from '../lib/debug';

interface RouteMeta {
  title?: string;
  description?: string;
}

interface PeriodRouteConfig {
  path: string;
  navLabel: string;
  periodId?: string;
  themeKey?: string;
  placeholderText?: string;
  placeholderDefaultEnabled?: boolean;
  meta?: RouteMeta;
}

export interface PeriodPageProps {
  config: PeriodRouteConfig;
  period?: Period | null;
}

const defaultPlaceholderText = 'Контент для этого возраста появится в ближайшем обновлении.';

/**
 * Преобразует legacy-данные (video_playlist, concepts, authors, etc.)
 * в новый формат sections для совместимости
 */
function convertLegacyToSections(period: Period | null): Record<string, { title: string; content: any[] }> | undefined {
  if (!period) return undefined;

  // Если уже есть sections, возвращаем их
  if (period.sections && Object.keys(period.sections).length > 0) {
    return period.sections;
  }

  // Иначе создаём sections из legacy-полей
  const sections: Record<string, { title: string; content: any[] }> = {};

  if (Array.isArray(period.video_playlist) && period.video_playlist.length > 0) {
    sections.video_section = {
      title: 'Видео-лекция',
      content: period.video_playlist,
    };
  }

  if (Array.isArray(period.concepts) && period.concepts.length > 0) {
    sections.concepts = {
      title: 'Понятия',
      content: period.concepts,
    };
  }

  if (Array.isArray(period.authors) && period.authors.length > 0) {
    sections.authors = {
      title: 'Ключевые авторы',
      content: period.authors,
    };
  }

  if (Array.isArray(period.core_literature) && period.core_literature.length > 0) {
    sections.core_literature = {
      title: 'Основная литература',
      content: period.core_literature,
    };
  }

  if (Array.isArray(period.extra_literature) && period.extra_literature.length > 0) {
    sections.extra_literature = {
      title: 'Дополнительная литература',
      content: period.extra_literature,
    };
  }

  return Object.keys(sections).length > 0 ? sections : undefined;
}

export function PeriodPage({ config, period }: PeriodPageProps) {
  const themeKey = config.themeKey ?? config.periodId;
  usePeriodTheme(themeKey);
  const heading = period?.label || config.navLabel;
  const { tests: periodTests } = usePeriodTests(config.periodId);

  const title = config.meta?.title ?? `${heading} — ${SITE_NAME}`;
  const description =
    config.meta?.description ?? period?.subtitle ?? `Материалы и ссылки по разделу ${heading}.`;
  const placeholderFromConfig = config.placeholderText;
  const placeholderDefaultEnabled = config.placeholderDefaultEnabled ?? false;
  const placeholderEnabledFromData =
    typeof period?.placeholderEnabled === 'boolean' ? period.placeholderEnabled : undefined;
  const placeholderEnabled =
    placeholderEnabledFromData !== undefined ? placeholderEnabledFromData : placeholderDefaultEnabled;

  const placeholderSource =
    period?.placeholderText ?? placeholderFromConfig ?? defaultPlaceholderText;
  const trimmedPlaceholder = normalizeText(placeholderSource);
  const placeholderMessage = trimmedPlaceholder || defaultPlaceholderText;

  // Проверяем наличие контента (используем адаптер для преобразования legacy-данных)
  const convertedSections = convertLegacyToSections(period);
  const hasSections = Boolean(
    convertedSections && Object.keys(convertedSections).length > 0
  );
  const showExplicitPlaceholder = placeholderEnabled && trimmedPlaceholder.length > 0;
  const showFallbackPlaceholder = !hasSections && placeholderMessage.length > 0;
  const showPlaceholder = showExplicitPlaceholder || showFallbackPlaceholder;

  // Debug logging to understand why placeholder shows
  debugLog('🔍 PeriodPage content detection:', {
    periodId: config.periodId,
    hasSections,
    placeholderEnabled,
    showExplicitPlaceholder,
    showFallbackPlaceholder,
    showPlaceholder,
    convertedSectionsKeys: convertedSections ? Object.keys(convertedSections) : [],
    hasVideoPlaylist: Array.isArray(period?.video_playlist),
    videoPlaylistLength: period?.video_playlist?.length,
    hasConcepts: Array.isArray(period?.concepts),
    conceptsLength: period?.concepts?.length,
  });
  const deckUrl = period?.deckUrl ? period.deckUrl.trim() : '';
  const defaultVideoTitle = heading.trim() || 'Видео-лекция';

  const backgroundImage = config.periodId ? BACKGROUND_BY_PERIOD[config.periodId] : undefined;
  const backgroundClass = backgroundImage ? 'bg-repeat bg-[length:180px]' : '';
  const backgroundStyle = backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: pageTransition }}
      exit={{ opacity: 0, y: -16, transition: pageTransition }}
      className={cn('flex-1 bg-bg', backgroundClass)}
      style={backgroundStyle}
    >
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      <div className="space-y-4 mb-8">
        <h1 className="text-5xl md:text-6xl leading-tight font-semibold tracking-tight text-fg">
          {heading}
        </h1>
        {period?.subtitle ? (
          <p className="text-lg leading-8 text-muted max-w-measure">{period.subtitle}</p>
        ) : null}
      </div>

      {showPlaceholder ? (
        <SectionMuted>
          <p className="text-lg leading-8 text-muted max-w-measure">{placeholderMessage}</p>
        </SectionMuted>
      ) : (
        <PeriodSections
          sections={convertedSections}
          deckUrl={deckUrl}
          defaultVideoTitle={defaultVideoTitle}
          periodTests={periodTests}
        />
      )}
    </Motion.div>
  );
}

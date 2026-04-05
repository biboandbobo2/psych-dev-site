import { Helmet } from 'react-helmet-async';
import { motion as Motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { SectionMuted } from '../components/ui/Section';
import { BACKGROUND_BY_PERIOD } from '../theme/backgrounds';
import { pageTransition } from '../theme/motion';
import { SITE_NAME } from '../routes';
import { normalizeText } from '../utils/contentHelpers';
import { cn } from '../lib/cn';
import type { Period } from '../types/content';
import type { CourseType } from '../types/tests';
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
  startCoursePath?: string;
  startCourseLabel?: string;
  startCourseDescription?: string;
  meta?: RouteMeta;
}

interface StudyLaunchParams {
  initialPanel: 'notes' | 'transcript';
  initialQuery: string | null;
  initialSeekMs: number | null;
  requestedVideoId: string;
}

type IntroOverview = {
  title: string;
  summary: string;
  examNote: string;
};

const INTRO_OVERVIEWS: Record<string, IntroOverview> = {
  'development-intro': {
    title: 'Как устроен курс',
    summary:
      'Это главная страница курса психологии развития: здесь собраны структура обучения, ключевые разделы и практические инструменты курса.',
    examNote:
      'Итоговая аттестация и проверка прогресса проходят через тесты по занятиям и итоговые задания.',
  },
  intro: {
    title: 'Как устроен курс',
    summary:
      'На этой странице собрана вводная информация по курсу психологии развития: структура занятий, материалы и практические инструменты.',
    examNote:
      'Итоговая аттестация и проверка прогресса проходят через тесты по занятиям и по курсу.',
  },
  'clinical-intro': {
    title: 'Как устроен курс',
    summary:
      'На вводной странице курса патопсихологии собрана общая логика курса, формат занятий и практические инструменты по теме расстройств.',
    examNote:
      'Итоговая аттестация и проверка прогресса доступны через тесты и практические задания курса.',
  },
  'general-intro': {
    title: 'Как устроен курс',
    summary:
      'Это вводная страница курса общей психологии с обзором содержания, последовательности тем и формата обучения.',
    examNote:
      'Итоговая аттестация проходит через тесты по темам и итоговые проверочные задания курса.',
  },
  'dynamic-intro': {
    title: 'Как устроен курс',
    summary:
      'Это вводная страница курса: здесь собрана общая логика обучения, структура тем и ключевые инструменты.',
    examNote:
      'Итоговая аттестация и проверка прогресса доступны через тесты и практические задания курса.',
  },
};

const INTRO_PAGE_HEADING_BY_PATH: Record<string, string> = {
  '/development/intro': 'Психология развития',
  '/clinical/intro': 'Основы патопсихологии взрослого и детского возрастов',
  '/general/intro': 'Введение в основы клинической психологии',
};

const DEFAULT_START_CTA_BY_PATH: Record<string, { path: string; title: string; description: string; buttonLabel: string }> = {
  '/development/intro': {
    path: '/intro',
    title: 'Начните с вводной лекции',
    description: 'Откройте первое занятие и получите ключевые ориентиры по курсу.',
    buttonLabel: 'СТАРТ КУРСА',
  },
  '/clinical/intro': {
    path: '/clinical/1',
    title: 'Начните с первой темы курса',
    description: 'Перейдите к базовой теме и начните практическую работу по курсу.',
    buttonLabel: 'СТАРТ КУРСА',
  },
  '/general/intro': {
    path: '/general/1',
    title: 'Начните с первой темы курса',
    description: 'Откройте стартовую тему и переходите к следующим занятиям по курсу.',
    buttonLabel: 'СТАРТ КУРСА',
  },
};

export interface PeriodPageProps {
  config: PeriodRouteConfig;
  period?: Period | null;
}

// Legacy conversion removed - all periods now use sections format

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

  if (Array.isArray(period.extra_videos) && period.extra_videos.length > 0) {
    sections.extra_videos = {
      title: 'Дополнительные видео',
      content: period.extra_videos,
    };
  }

  if (Array.isArray(period.leisure) && period.leisure.length > 0) {
    sections.leisure = {
      title: 'Досуг',
      content: period.leisure,
    };
  }

  return Object.keys(sections).length > 0 ? sections : undefined;
}

export function PeriodPage({ config, period }: PeriodPageProps) {
  const location = useLocation();
  const themeKey = config.themeKey ?? config.periodId;
  usePeriodTheme(themeKey);
  const heading =
    INTRO_PAGE_HEADING_BY_PATH[config.path] ||
    period?.label ||
    config.navLabel;
  const { tests: periodTests } = usePeriodTests(config.periodId);

  // Определяем тип курса на основе пути
  const isClinicalCourse = location.pathname.startsWith('/clinical/');
  const isGeneralCourse = location.pathname.startsWith('/general/');
  const isDynamicCourse = location.pathname.startsWith('/course/');
  const dynamicCourseId = isDynamicCourse ? location.pathname.split('/')[2] : null;
  const isDevelopmentCourse = !isClinicalCourse && !isGeneralCourse && !isDynamicCourse;

  // Определяем courseType для проверки доступа к видео
  const courseType: CourseType = isDynamicCourse && dynamicCourseId
    ? dynamicCourseId
    : isClinicalCourse
    ? 'clinical'
    : isGeneralCourse
    ? 'general'
    : 'development';

  // Устанавливаем дефолтный текст заглушки в зависимости от курса
  const defaultPlaceholderText = isDevelopmentCourse
    ? 'Контент для этого возраста появится в ближайшем обновлении.'
    : isDynamicCourse
    ? 'Контент для этого занятия появится в ближайшем обновлении.'
    : 'Контент для этой темы появится в ближайшем обновлении.';

  const title = config.meta?.title ?? `${heading} — ${SITE_NAME}`;
  const description =
    config.meta?.description ?? period?.subtitle ?? `Материалы и ссылки по разделу ${heading}.`;
  const placeholderFromConfig = config.placeholderText;
  const placeholderDefaultEnabled = config.placeholderDefaultEnabled ?? false;
  const placeholderEnabledFromData =
    typeof period?.placeholder_enabled === 'boolean' ? period.placeholder_enabled :
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
    convertedSections &&
    Object.values(convertedSections).some(
      section => Array.isArray(section.content) && section.content.length > 0
    )
  );

  // Логика отображения заглушки:
  // 1. Если placeholderEnabled = true, всегда показываем заглушку
  // 2. Если placeholderEnabled = false, показываем контент (если есть)
  // 3. Если placeholderEnabled = undefined и нет контента, показываем fallback заглушку
  // FIX: Reverted to simpler logic to ensure placeholder shows if content is missing
  const showPlaceholder = placeholderEnabled || (!hasSections && placeholderMessage.length > 0);

  // Debug logging to understand why placeholder shows
  debugLog('🔍 PeriodPage content detection:', {
    periodId: config.periodId,
    hasSections,
    placeholderEnabled,
    showPlaceholder,
  });
  const deckUrl = period?.deckUrl ? period.deckUrl.trim() : '';
  const defaultVideoTitle = heading.trim() || 'Видео-лекция';

  const backgroundImage = config.periodId ? BACKGROUND_BY_PERIOD[config.periodId] : undefined;
  const backgroundClass = backgroundImage ? 'bg-repeat bg-[length:180px]' : '';
  const backgroundStyle = backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined;
  const studyLaunch = getStudyLaunchParams(location.search);
  const isDevelopmentCourseIntro = config.path === '/development/intro';
  const isClinicalCourseIntro = config.path === '/clinical/intro';
  const isGeneralCourseIntro = config.path === '/general/intro';
  const isDynamicCourseIntro = config.periodId === 'dynamic-intro';
  const showDisorderTableCta = isClinicalCourseIntro;
  const showTimelineCta = isDevelopmentCourseIntro;
  const introOverview = isDevelopmentCourseIntro
    ? INTRO_OVERVIEWS['development-intro']
    : isClinicalCourseIntro
    ? INTRO_OVERVIEWS['clinical-intro']
    : isGeneralCourseIntro
    ? INTRO_OVERVIEWS['general-intro']
    : isDynamicCourseIntro
    ? INTRO_OVERVIEWS['dynamic-intro']
    : null;

  const fallbackStartCourseCta = DEFAULT_START_CTA_BY_PATH[config.path];
  const startCoursePath = config.startCoursePath ?? fallbackStartCourseCta?.path ?? null;
  const startCourseTitle = config.startCourseLabel ?? fallbackStartCourseCta?.title ?? 'Начните обучение по курсу';
  const startCourseDescription =
    config.startCourseDescription ??
    fallbackStartCourseCta?.description ??
    'Откройте первое занятие и двигайтесь по программе последовательно.';
  const startCourseButtonLabel = fallbackStartCourseCta?.buttonLabel ?? 'СТАРТ КУРСА';
  const showStartCourseCta =
    Boolean(startCoursePath) &&
    (isDevelopmentCourseIntro || isClinicalCourseIntro || isGeneralCourseIntro || isDynamicCourseIntro);

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
        {introOverview ? (
          <section className="max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">{introOverview.title}</h2>
            <p className="mt-2 text-sm text-slate-700">{introOverview.summary}</p>
            <p className="mt-2 text-sm font-medium text-slate-800">{introOverview.examNote}</p>
          </section>
        ) : null}
        {showDisorderTableCta ? (
          <div className="max-w-4xl rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-6 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">
                  Практика курса
                </p>
                <p className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Перейти в «Таблицу по расстройствам»
                </p>
                <p className="text-base text-slate-700">
                  Заполняйте и редактируйте ваши наблюдения по пересечениям симптомов и расстройств.
                </p>
              </div>
              <Link
                to="/disorder-table"
                className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-6 py-3 text-base font-bold text-white transition hover:bg-rose-700"
              >
                Открыть таблицу
              </Link>
            </div>
          </div>
        ) : null}
        {showTimelineCta ? (
          <div className="max-w-4xl rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Практика курса
                </p>
                <p className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Откройте «Таймлайн жизни»
                </p>
                <p className="text-base text-slate-700">
                  Заполняйте личный таймлайн, связывайте события жизни с этапами развития и отслеживайте динамику.
                </p>
              </div>
              <Link
                to="/timeline"
                className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-6 py-3 text-base font-bold text-white transition hover:bg-amber-700"
              >
                Открыть таймлайн
              </Link>
            </div>
          </div>
        ) : null}
        {showStartCourseCta && startCoursePath ? (
          <div className="max-w-4xl rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-6 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
                  Старт курса
                </p>
                <p className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {startCourseTitle}
                </p>
                <p className="text-base text-slate-700">
                  {startCourseDescription}
                </p>
              </div>
              <Link
                to={startCoursePath}
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-8 py-3 text-base font-black uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
              >
                {startCourseButtonLabel}
              </Link>
            </div>
          </div>
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
          periodId={config.periodId}
          periodTitle={heading}
          courseType={courseType}
          studyLaunch={studyLaunch}
        />
      )}
    </Motion.div>
  );
}

function getStudyLaunchParams(search: string): StudyLaunchParams | null {
  const params = new URLSearchParams(search);
  if (params.get('study') !== '1') {
    return null;
  }

  const requestedVideoId = params.get('video');
  if (!requestedVideoId) {
    return null;
  }

  const initialPanel = params.get('panel') === 'notes' ? 'notes' : 'transcript';
  const rawTime = Number(params.get('t'));
  const initialSeekMs = Number.isFinite(rawTime) && rawTime >= 0 ? Math.floor(rawTime * 1000) : null;

  return {
    initialPanel,
    initialQuery: params.get('q'),
    initialSeekMs,
    requestedVideoId,
  };
}

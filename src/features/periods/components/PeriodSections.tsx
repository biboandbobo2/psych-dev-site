import type { Test, CourseType } from '../../../types/tests';
import { BadgeSection } from './BadgeSection';
import { ListSection } from './ListSection';
import { SelfQuestionsSection } from './SelfQuestionsSection';
import { GenericSection } from './GenericSection';
import { VideoSection } from './VideoSection';
import { PaywallGuard } from '../../../components/PaywallGuard';
import type { PeriodSectionData } from './types';

interface PeriodSectionsProps {
  sections?: Record<string, PeriodSectionData>;
  deckUrl: string;
  defaultVideoTitle: string;
  periodTests: Test[];
  /** Тип курса для проверки доступа к видео */
  courseType: CourseType;
}

// Фиксированный порядок отображения секций
const SECTION_ORDER = [
  'video',
  'video_section',
  'concepts',
  'authors',
  'core_literature',
  'extra_literature',
  'extra_videos',
  'leisure',
  'self_questions',
];

export function PeriodSections({ sections, deckUrl, defaultVideoTitle, periodTests, courseType }: PeriodSectionsProps) {
  if (!sections) return null;

  // Сортируем секции по заданному порядку
  let sortedEntries = Object.entries(sections).sort(([slugA], [slugB]) => {
    const indexA = SECTION_ORDER.indexOf(slugA);
    const indexB = SECTION_ORDER.indexOf(slugB);

    // Если slug не найден в SECTION_ORDER, помещаем его в конец
    const orderA = indexA === -1 ? SECTION_ORDER.length : indexA;
    const orderB = indexB === -1 ? SECTION_ORDER.length : indexB;

    return orderA - orderB;
  });

  // Если нет секции self_questions, но есть тесты - добавляем фейковую секцию
  const hasSelfQuestionsSection = sortedEntries.some(([slug]) => slug === 'self_questions');
  if (!hasSelfQuestionsSection && periodTests.length > 0) {
    sortedEntries.push(['self_questions', { title: 'Вопросы для самопроверки', content: [] }]);
  }

  return (
    <div className="space-y-2">
      {sortedEntries.map(([slug, section]) => (
        <SectionRenderer
          key={slug}
          slug={slug}
          section={section}
          deckUrl={deckUrl}
          defaultVideoTitle={defaultVideoTitle}
          periodTests={periodTests}
          courseType={courseType}
        />
      ))}
    </div>
  );
}

interface SectionRendererProps {
  slug: string;
  section: PeriodSectionData;
  deckUrl: string;
  defaultVideoTitle: string;
  periodTests: Test[];
  /** Тип курса для проверки доступа к видео */
  courseType: CourseType;
}

function SectionRenderer({ slug, section, deckUrl, defaultVideoTitle, periodTests, courseType }: SectionRendererProps) {
  // Для self_questions делаем исключение: показываем если есть контент ИЛИ есть тесты
  const isSelfQuestions = slug === 'self_questions';
  if (!isSelfQuestions && !section?.content?.length) return null;
  if (isSelfQuestions && !section?.content?.length && periodTests.length === 0) return null;

  const rawTitle = section.title ?? '';
  const displayTitle = rawTitle.toLowerCase().includes('вопросы для контакта с собой')
    ? 'Рабочая тетрадь и тесты'
    : rawTitle;

  if (rawTitle === 'Видео-лекция' || rawTitle === 'Видео') {
    // Проверяем есть ли публичные видео для показа без оплаты
    const publicVideos = section.content.filter((video: any) => video?.isPublic === true);
    const publicContent = publicVideos.length > 0 ? (
      <VideoSection
        slug={slug}
        title={displayTitle}
        content={publicVideos}
        deckUrl={deckUrl}
        defaultVideoTitle={defaultVideoTitle}
      />
    ) : undefined;

    // Оборачиваем видео в PaywallGuard для проверки доступа
    return (
      <PaywallGuard courseType={courseType} sectionTitle={displayTitle} publicContent={publicContent}>
        <VideoSection
          slug={slug}
          title={displayTitle}
          content={section.content}
          deckUrl={deckUrl}
          defaultVideoTitle={defaultVideoTitle}
        />
      </PaywallGuard>
    );
  }

  if (isSelfQuestions) {
    return (
      <SelfQuestionsSection
        slug={slug}
        title={displayTitle}
        content={section.content}
        periodTests={periodTests}
      />
    );
  }

  const lowerTitle = rawTitle.toLowerCase();
  const allStrings = section.content.every((item) => typeof item === 'string');

  if (lowerTitle.includes('понят')) {
    return <BadgeSection slug={slug} title={displayTitle} items={section.content} />;
  }

  if (lowerTitle.includes('вопрос') && allStrings) {
    const listItems = (section.content as string[])
      .map((item) => item.split('\n'))
      .flat()
      .filter(Boolean);

    return <ListSection slug={slug} title={displayTitle} items={listItems} />;
  }

  return <GenericSection slug={slug} title={displayTitle} content={section.content} />;
}

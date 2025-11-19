import type { Test } from '../../../types/tests';
import { BadgeSection } from './BadgeSection';
import { ListSection } from './ListSection';
import { SelfQuestionsSection } from './SelfQuestionsSection';
import { GenericSection } from './GenericSection';
import { VideoSection } from './VideoSection';
import type { PeriodSectionData } from './types';

interface PeriodSectionsProps {
  sections?: Record<string, PeriodSectionData>;
  deckUrl: string;
  defaultVideoTitle: string;
  periodTests: Test[];
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

export function PeriodSections({ sections, deckUrl, defaultVideoTitle, periodTests }: PeriodSectionsProps) {
  if (!sections) return null;

  // Сортируем секции по заданному порядку
  const sortedEntries = Object.entries(sections).sort(([slugA], [slugB]) => {
    const indexA = SECTION_ORDER.indexOf(slugA);
    const indexB = SECTION_ORDER.indexOf(slugB);

    // Если slug не найден в SECTION_ORDER, помещаем его в конец
    const orderA = indexA === -1 ? SECTION_ORDER.length : indexA;
    const orderB = indexB === -1 ? SECTION_ORDER.length : indexB;

    return orderA - orderB;
  });

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
}

function SectionRenderer({ slug, section, deckUrl, defaultVideoTitle, periodTests }: SectionRendererProps) {
  if (!section?.content?.length) return null;

  const rawTitle = section.title ?? '';
  const displayTitle = rawTitle.toLowerCase().includes('вопросы для контакта с собой')
    ? 'Рабочая тетрадь и тесты'
    : rawTitle;

  if (rawTitle === 'Видео-лекция' || rawTitle === 'Видео') {
    return (
      <VideoSection
        slug={slug}
        title={displayTitle}
        content={section.content}
        deckUrl={deckUrl}
        defaultVideoTitle={defaultVideoTitle}
      />
    );
  }

  if (slug === 'self_questions') {
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

  if (lowerTitle.includes('понят') && allStrings) {
    const badgeItems = section.content as string[];
    return <BadgeSection slug={slug} title={displayTitle} items={badgeItems} />;
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

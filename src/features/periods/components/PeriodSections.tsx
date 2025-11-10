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

export function PeriodSections({ sections, deckUrl, defaultVideoTitle, periodTests }: PeriodSectionsProps) {
  if (!sections) return null;

  return (
    <div className="space-y-2">
      {Object.entries(sections).map(([slug, section]) => (
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

  if (rawTitle === 'Видео-лекция') {
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

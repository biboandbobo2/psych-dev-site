import type { TestSummary, CourseType } from '../../../types/tests';
import { BadgeSection } from './BadgeSection';
import { ListSection } from './ListSection';
import { SelfQuestionsSection } from './SelfQuestionsSection';
import { GenericSection } from './GenericSection';
import { VideoSection } from './VideoSection';
import { LessonQuestionsSection } from './LessonQuestionsSection';
import { PaywallGuard } from '../../../components/PaywallGuard';
import type { PeriodSectionData } from './types';
import { collectLessonVideoKeys, isMainVideoSection, sortLessonSections } from '../utils/lessonVideos';

interface PeriodSectionsProps {
  sections?: Record<string, PeriodSectionData>;
  deckUrl: string;
  defaultVideoTitle: string;
  periodTests: TestSummary[];
  periodId?: string;
  periodTitle: string;
  /** Тип курса для проверки доступа к видео */
  courseType: CourseType;
  studyLaunch?: {
    requestedVideoId: string;
    initialPanel: 'notes' | 'transcript';
    initialSeekMs: number | null;
    initialQuery: string | null;
  } | null;
}

export function PeriodSections({
  sections,
  deckUrl,
  defaultVideoTitle,
  periodTests,
  periodId,
  periodTitle,
  courseType,
  studyLaunch,
}: PeriodSectionsProps) {
  if (!sections) return null;

  // Понятия урока — для поисковых чипов при выделении текста в транскрипте
  const lessonConcepts = (sections['concepts']?.content ?? []).filter(
    (item): item is string => typeof item === 'string'
  );

  // Сортируем секции по заданному порядку
  const sortedEntries = sortLessonSections(sections);
  // Главная лекция занятия — первое основное видео; по ней отмечается занятие.
  const mainVideoKey = collectLessonVideoKeys(sections)[0] ?? null;

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
          periodId={periodId}
          periodTitle={periodTitle}
          courseType={courseType}
          studyLaunch={studyLaunch}
          lessonConcepts={lessonConcepts}
          mainVideoKey={mainVideoKey}
        />
      ))}
      <LessonQuestionsSection
        courseId={courseType}
        periodId={periodId}
        periodTitle={periodTitle}
      />
    </div>
  );
}

interface SectionRendererProps {
  slug: string;
  section: PeriodSectionData;
  deckUrl: string;
  defaultVideoTitle: string;
  periodTests: TestSummary[];
  periodId?: string;
  periodTitle: string;
  /** Тип курса для проверки доступа к видео */
  courseType: CourseType;
  studyLaunch?: PeriodSectionsProps['studyLaunch'];
  lessonConcepts?: string[];
  mainVideoKey: string | null;
}

function SectionRenderer({
  slug,
  section,
  deckUrl,
  defaultVideoTitle,
  periodTests,
  periodId,
  periodTitle,
  courseType,
  studyLaunch,
  lessonConcepts,
  mainVideoKey,
}: SectionRendererProps) {
  // Для self_questions делаем исключение: показываем если есть контент ИЛИ есть тесты
  const isSelfQuestions = slug === 'self_questions';
  if (!isSelfQuestions && !section?.content?.length) return null;
  if (isSelfQuestions && !section?.content?.length && periodTests.length === 0) return null;

  const rawTitle = section.title ?? '';
  const displayTitle = rawTitle.toLowerCase().includes('вопросы для контакта с собой')
    ? 'Рабочая тетрадь и тесты'
    : rawTitle;

  if (isMainVideoSection(rawTitle)) {
    // Проверяем есть ли публичные видео для показа без оплаты
    const publicVideos = section.content.filter((video: any) => video?.isPublic === true);
    const publicContent = publicVideos.length > 0 ? (
      <VideoSection
        slug={slug}
        title={displayTitle}
        content={publicVideos}
        deckUrl={deckUrl}
        defaultVideoTitle={defaultVideoTitle}
        periodId={periodId}
        periodTitle={periodTitle}
        courseId={courseType}
        studyLaunch={studyLaunch}
        concepts={lessonConcepts}
        mainVideoKey={mainVideoKey}
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
          periodId={periodId}
          periodTitle={periodTitle}
          courseId={courseType}
          studyLaunch={studyLaunch}
          concepts={lessonConcepts}
          mainVideoKey={mainVideoKey}
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

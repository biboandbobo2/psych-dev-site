export const CONTENT_SECTION_KEYS = [
  'video_section',
  'concepts',
  'authors',
  'core_literature',
  'extra_literature',
  'extra_videos',
  'leisure',
  'self_questions',
] as const;

export type ContentSectionKey = typeof CONTENT_SECTION_KEYS[number];

type SectionContent = {
  title: string;
  content: unknown[];
};

export type ContentSections = Partial<Record<ContentSectionKey, SectionContent>>;

export interface BuildContentSectionsParams {
  title: string;
  videos: Array<{
    title: string;
    url: string;
    deckUrl: string;
    audioUrl: string;
    isPublic: boolean;
  }>;
  concepts: Array<{ name: string; url?: string }>;
  authors: Array<{ name: string; url?: string }>;
  coreLiterature: Array<{ title: string; url?: string }>;
  extraLiterature: Array<{ title: string; url?: string }>;
  extraVideos: Array<{ title: string; url: string }>;
  leisure: Array<{ title?: string; url?: string; type?: string; year?: string }>;
  selfQuestionsUrl: string;
}

export function buildContentSections(params: BuildContentSectionsParams): ContentSections {
  const {
    title,
    videos,
    concepts,
    authors,
    coreLiterature,
    extraLiterature,
    extraVideos,
    leisure,
    selfQuestionsUrl,
  } = params;

  const sections: ContentSections = {};

  if (videos.length) {
    sections.video_section = {
      title: 'Видео',
      content: videos.map((video) => ({
        title: video.title || title || 'Видео-лекция',
        url: video.url,
        ...(video.deckUrl ? { deckUrl: video.deckUrl } : {}),
        ...(video.audioUrl ? { audioUrl: video.audioUrl } : {}),
        ...(video.isPublic ? { isPublic: true } : {}),
      })),
    };
  }

  if (concepts.length) {
    sections.concepts = { title: 'Основные понятия', content: concepts };
  }
  if (authors.length) {
    sections.authors = { title: 'Персоналии', content: authors };
  }
  if (coreLiterature.length) {
    sections.core_literature = { title: 'Основная литература', content: coreLiterature };
  }
  if (extraLiterature.length) {
    sections.extra_literature = { title: 'Дополнительная литература', content: extraLiterature };
  }
  if (extraVideos.length) {
    sections.extra_videos = { title: 'Дополнительные видео', content: extraVideos };
  }
  if (leisure.length) {
    sections.leisure = { title: 'Досуг', content: leisure };
  }
  if (selfQuestionsUrl) {
    sections.self_questions = {
      title: 'Вопросы для самопроверки',
      content: [selfQuestionsUrl],
    };
  }

  return sections;
}

export function buildSectionFieldPayload(
  sections: ContentSections,
  createDeleteValue: () => unknown
): Record<string, unknown> {
  const fieldPayload: Record<string, unknown> = {
    'sections.video': createDeleteValue(),
  };

  CONTENT_SECTION_KEYS.forEach((key) => {
    fieldPayload[`sections.${key}`] = key in sections ? sections[key] : createDeleteValue();
  });

  return fieldPayload;
}

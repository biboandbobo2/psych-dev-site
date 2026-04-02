import { describe, expect, it } from 'vitest';
import { buildContentSections, buildSectionFieldPayload } from './contentSections';

describe('contentSections', () => {
  it('builds delete payload for sections removed from the form', () => {
    const sections = buildContentSections({
      title: 'Память',
      videos: [],
      concepts: [],
      authors: [],
      coreLiterature: [],
      extraLiterature: [],
      extraVideos: [],
      leisure: [],
      selfQuestionsUrl: '',
    });

    expect(sections).toEqual({});
    expect(buildSectionFieldPayload(sections, () => 'DELETE_FIELD')).toEqual({
      'sections.video': 'DELETE_FIELD',
      'sections.video_section': 'DELETE_FIELD',
      'sections.concepts': 'DELETE_FIELD',
      'sections.authors': 'DELETE_FIELD',
      'sections.core_literature': 'DELETE_FIELD',
      'sections.extra_literature': 'DELETE_FIELD',
      'sections.extra_videos': 'DELETE_FIELD',
      'sections.leisure': 'DELETE_FIELD',
      'sections.self_questions': 'DELETE_FIELD',
    });
  });

  it('keeps non-empty sections and only deletes missing ones', () => {
    const sections = buildContentSections({
      title: 'Память',
      videos: [],
      concepts: [],
      authors: [],
      coreLiterature: [{ title: 'Лурия', url: 'https://example.com/luria' }],
      extraLiterature: [],
      extraVideos: [],
      leisure: [],
      selfQuestionsUrl: '',
    });

    expect(sections.core_literature).toEqual({
      title: 'Основная литература',
      content: [{ title: 'Лурия', url: 'https://example.com/luria' }],
    });
    expect(buildSectionFieldPayload(sections, () => 'DELETE_FIELD')).toEqual({
      'sections.video': 'DELETE_FIELD',
      'sections.video_section': 'DELETE_FIELD',
      'sections.concepts': 'DELETE_FIELD',
      'sections.authors': 'DELETE_FIELD',
      'sections.core_literature': {
        title: 'Основная литература',
        content: [{ title: 'Лурия', url: 'https://example.com/luria' }],
      },
      'sections.extra_literature': 'DELETE_FIELD',
      'sections.extra_videos': 'DELETE_FIELD',
      'sections.leisure': 'DELETE_FIELD',
      'sections.self_questions': 'DELETE_FIELD',
    });
  });
});

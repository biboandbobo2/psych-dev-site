import { describe, it, expect } from 'vitest';
import { parseUserDocPreferences } from './userDocPreferences';

describe('parseUserDocPreferences', () => {
  it('читает правки актуальных курсов и дефолты конспекта', () => {
    expect(
      parseUserDocPreferences({
        featuredCourseIds: ['a', 1, 'b'],
        unfeaturedCourseIds: ['s'],
        studyDefaults: { questionsVisibility: 'lecturers', noteVisibility: 'private' },
      })
    ).toEqual({
      featuredCourseIds: ['a', 'b'],
      unfeaturedCourseIds: ['s'],
      studyQuestionsDefaultVisibility: 'lecturers',
      studyNoteDefaultVisibility: 'private',
    });
  });

  it('пустой документ и мусор → пусто/null', () => {
    const empty = {
      featuredCourseIds: [],
      unfeaturedCourseIds: [],
      studyQuestionsDefaultVisibility: null,
      studyNoteDefaultVisibility: null,
    };
    expect(parseUserDocPreferences(undefined)).toEqual(empty);
    expect(
      parseUserDocPreferences({
        featuredCourseIds: 'x',
        studyDefaults: { questionsVisibility: 'private', noteVisibility: 'all' },
      })
    ).toEqual(empty);
  });
});

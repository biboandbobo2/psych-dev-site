import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LectureSelector } from './LectureSelector';

const mockUseLectureSources = vi.fn();
const mockUseCourses = vi.fn();

vi.mock('../hooks/useLectureSources', () => ({
  useLectureSources: () => mockUseLectureSources(),
}));

vi.mock('../../../hooks/useCourses', () => ({
  useCourses: () => mockUseCourses(),
}));

const buildCourseMap = (entries: Array<{ id: string; name: string; icon: string }>) =>
  new Map(entries.map((entry) => [entry.id, entry]));

describe('LectureSelector', () => {
  beforeEach(() => {
    mockUseLectureSources.mockReset();
    mockUseCourses.mockReset();
    mockUseCourses.mockReturnValue({
      courseMap: buildCourseMap([
        { id: 'general', name: 'Общая психология', icon: '📚' },
        { id: 'clinical', name: 'Клиническая психология', icon: '🧠' },
      ]),
      loading: false,
      error: null,
    });
    mockUseLectureSources.mockReturnValue({
      courses: [
        {
          courseId: 'general',
          lectures: [
            {
              lectureKey: 'general::1::video1',
              youtubeVideoId: 'video1',
              courseId: 'general',
              periodId: 'general-1',
              periodTitle: 'История психологии и методы',
              lectureTitle: 'История психологии',
              chunkCount: 3,
              durationMs: 1000,
            },
            {
              lectureKey: 'general::2::video2',
              youtubeVideoId: 'video2',
              courseId: 'general',
              periodId: 'general-2',
              periodTitle: 'Методологические проблемы',
              lectureTitle: 'Методология',
              chunkCount: 4,
              durationMs: 1000,
            },
          ],
        },
        {
          courseId: 'clinical',
          lectures: [
            {
              lectureKey: 'clinical::1::video3',
              youtubeVideoId: 'video3',
              courseId: 'clinical',
              periodId: 'clinical-1',
              periodTitle: 'Предмет, методы патопсихологии',
              lectureTitle: 'Патопсихология',
              chunkCount: 3,
              durationMs: 1000,
            },
          ],
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('подставляет первый курс по умолчанию', () => {
    const onCourseChange = vi.fn();

    render(
      <LectureSelector
        selectedCourseId=""
        onCourseChange={onCourseChange}
        useWholeCourse={true}
        onUseWholeCourseChange={vi.fn()}
        selectedLectureKeys={[]}
        onLectureKeysChange={vi.fn()}
      />
    );

    expect(onCourseChange).toHaveBeenCalledWith('general');
  });

  it('позволяет выбрать точечные лекции', () => {
    const onUseWholeCourseChange = vi.fn();
    const onLectureKeysChange = vi.fn();

    render(
      <LectureSelector
        selectedCourseId="general"
        onCourseChange={vi.fn()}
        useWholeCourse={false}
        onUseWholeCourseChange={onUseWholeCourseChange}
        selectedLectureKeys={[]}
        onLectureKeysChange={onLectureKeysChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /показать список/i }));
    fireEvent.click(screen.getByLabelText(/история психологии/i));

    expect(onLectureKeysChange).toHaveBeenCalledWith(['general::1::video1']);
  });

  it('показывает названия курсов из courseMap, а не транслитерированные ID', () => {
    mockUseLectureSources.mockReturnValue({
      courses: [
        {
          courseId: 'gruppovaya-psihoterapiya',
          lectures: [],
        },
        {
          courseId: 'clinical',
          lectures: [],
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockUseCourses.mockReturnValue({
      courseMap: buildCourseMap([
        { id: 'gruppovaya-psihoterapiya', name: 'Групповая психотерапия', icon: '🎓' },
        { id: 'clinical', name: 'Основы патопсихологии', icon: '🧠' },
      ]),
      loading: false,
      error: null,
    });

    render(
      <LectureSelector
        selectedCourseId="gruppovaya-psihoterapiya"
        onCourseChange={vi.fn()}
        useWholeCourse={true}
        onUseWholeCourseChange={vi.fn()}
        selectedLectureKeys={[]}
        onLectureKeysChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Групповая психотерапия/)).toBeInTheDocument();
    expect(screen.getByText(/Основы патопсихологии/)).toBeInTheDocument();
    expect(screen.queryByText(/gruppovaya-psihoterapiya/)).not.toBeInTheDocument();
  });

  it('показывает courseId, пока названия курса нет в courseMap', () => {
    mockUseLectureSources.mockReturnValue({
      courses: [
        {
          courseId: 'novyy-kurs',
          lectures: [],
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockUseCourses.mockReturnValue({
      courseMap: new Map(),
      loading: true,
      error: null,
    });

    render(
      <LectureSelector
        selectedCourseId="novyy-kurs"
        onCourseChange={vi.fn()}
        useWholeCourse={true}
        onUseWholeCourseChange={vi.fn()}
        selectedLectureKeys={[]}
        onLectureKeysChange={vi.fn()}
      />
    );

    expect(screen.getByText(/novyy-kurs/)).toBeInTheDocument();
  });
});

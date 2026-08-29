import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CourseOption } from '../../../hooks/useCourses';
import type { CourseCabinetStats } from './useAuthorCabinetStats';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const coursesResult: { courses: CourseOption[]; loading: boolean } = {
  courses: [],
  loading: false,
};
const statsResult: { stats: Record<string, CourseCabinetStats>; loading: boolean } = {
  stats: {},
  loading: false,
};

vi.mock('../../../hooks/useEditableCourses', () => ({
  useEditableCourses: () => coursesResult,
}));

vi.mock('./useAuthorCabinetStats', () => ({
  useAuthorCabinetStats: () => statsResult,
}));

import AuthorCabinet from './AuthorCabinet';

const renderCabinet = () =>
  render(
    <MemoryRouter>
      <AuthorCabinet />
    </MemoryRouter>
  );

describe('AuthorCabinet', () => {
  beforeEach(() => {
    coursesResult.courses = [];
    coursesResult.loading = false;
    statsResult.stats = {};
    statsResult.loading = false;
  });

  it('без курсов в управлении показывает заглушку, а не пустой экран', () => {
    renderCabinet();
    expect(screen.getByText(/нет курсов в управлении/i)).toBeInTheDocument();
  });

  it('рендерит карточку курса со сводкой и ссылками на его разделы', () => {
    coursesResult.courses = [
      { id: 'external-x', name: 'Психология сновидений', icon: '🎓', order: 10, published: true },
    ];
    statsResult.stats = {
      'external-x': {
        lessonsPublished: 12,
        lessonsDraft: 3,
        questionsTotal: 5,
        questionsLastWeek: 2,
        events: 34,
        uniqueStudents: 8,
      },
    };

    renderCabinet();

    expect(screen.getByText('Психология сновидений')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 в черновиках')).toBeInTheDocument();
    expect(screen.getByText('2 за неделю')).toBeInTheDocument();
    expect(screen.getByText('8 студентов')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Контент' })).toHaveAttribute(
      'href',
      '/admin/content?course=external-x'
    );
    expect(screen.getByRole('link', { name: 'Телеметрия' })).toHaveAttribute(
      'href',
      '/admin/telemetry?course=external-x'
    );
    expect(screen.getByRole('link', { name: 'О курсе' })).toHaveAttribute(
      'href',
      '/admin/content/course-intro/external-x'
    );
  });

  it('метрика, недоступная по правам или индексу, показывается прочерком', () => {
    coursesResult.courses = [
      { id: 'external-x', name: 'Курс', icon: '🎓', order: 10, published: true },
    ];
    statsResult.stats = {
      'external-x': {
        lessonsPublished: 4,
        lessonsDraft: 0,
        questionsTotal: 0,
        questionsLastWeek: 0,
        events: null,
        uniqueStudents: null,
      },
    };

    renderCabinet();

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('без черновиков')).toBeInTheDocument();
  });

  it('скрытый курс помечен бейджем', () => {
    coursesResult.courses = [
      { id: 'external-x', name: 'Курс', icon: '🎓', order: 10, published: false, isCore: false },
    ];
    renderCabinet();
    expect(screen.getByText('Скрыт')).toBeInTheDocument();
  });
});

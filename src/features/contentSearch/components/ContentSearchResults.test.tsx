import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentSearchResults } from './ContentSearchResults';
import type { ContentSearchResult } from '../types';

const mockUseCourses = vi.fn();

vi.mock('../../../hooks/useCourses', () => ({
  useCourses: () => mockUseCourses(),
}));

const buildCourseMap = (entries: Array<{ id: string; name: string; icon: string }>) =>
  new Map(entries.map((entry) => [entry.id, entry]));

const contentResult = (id: string, course: string): ContentSearchResult => ({
  type: 'content',
  id,
  period: `${course}-1`,
  title: 'Заголовок периода',
  subtitle: '',
  course,
  matchedIn: ['title'],
  relevanceScore: 1,
});

describe('ContentSearchResults', () => {
  beforeEach(() => {
    mockUseCourses.mockReset();
  });

  it('показывает названия курсов из courseMap, а не статические/транслит', () => {
    mockUseCourses.mockReturnValue({
      courseMap: buildCourseMap([
        { id: 'clinical', name: 'Основы патопсихологии', icon: '🧠' },
        { id: 'gruppovaya-psihoterapiya', name: 'Групповая психотерапия', icon: '🎓' },
      ]),
      loading: false,
      error: null,
    });

    render(
      <ContentSearchResults
        results={[
          contentResult('r1', 'clinical'),
          contentResult('r2', 'gruppovaya-psihoterapiya'),
        ]}
        query=""
        onResultClick={vi.fn()}
      />
    );

    expect(screen.getByText('Основы патопсихологии')).toBeInTheDocument();
    expect(screen.getByText('Групповая психотерапия')).toBeInTheDocument();
    expect(screen.queryByText('Клиническая психология')).not.toBeInTheDocument();
    expect(screen.queryByText('Курс')).not.toBeInTheDocument();
  });

  it('пока courseMap пуст — статический fallback для core и «Курс» для динамических', () => {
    mockUseCourses.mockReturnValue({
      courseMap: new Map(),
      loading: true,
      error: null,
    });

    render(
      <ContentSearchResults
        results={[
          contentResult('r1', 'clinical'),
          contentResult('r2', 'gruppovaya-psihoterapiya'),
        ]}
        query=""
        onResultClick={vi.fn()}
      />
    );

    expect(screen.getByText('Клиническая психология')).toBeInTheDocument();
    expect(screen.getByText('Курс')).toBeInTheDocument();
  });
});

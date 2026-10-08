// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueCourseCard, type ContinueCourse } from './ContinueCourseCard';

const navState = vi.hoisted(() => ({
  lessons: [] as { id: string; title: string; order: number }[],
  loading: false,
}));

vi.mock('../../../hooks/useCourseNavItems', () => ({
  useCourseNavItems: () => ({ lessons: navState.lessons, loading: navState.loading }),
}));

const makeCourse = (watched: string[]): ContinueCourse => ({
  id: 'dynamic-course',
  name: 'Динамический курс',
  continuePath: '/course/dynamic-course/l1',
  started: true,
  lessonTitle: 'Занятие 1',
  watchedLessonIds: new Set(watched),
  resumeTimeLabel: null,
});

const renderCard = (watched: string[]) =>
  render(
    <MemoryRouter>
      <ContinueCourseCard course={makeCourse(watched)} streamLabel="Мой курс" onOpenLessons={vi.fn()} />
    </MemoryRouter>
  );

describe('ContinueCourseCard: прогресс', () => {
  beforeEach(() => {
    navState.lessons = ['l1', 'l2', 'l3', 'l4'].map((id, order) => ({ id, title: id, order }));
    navState.loading = false;
  });

  it('считает процент по реальному списку занятий динамического курса', () => {
    renderCard(['l1', 'l2']);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('2/4 занятий')).toBeTruthy();
  });

  it('отметки вне списка занятий не увеличивают числитель', () => {
    renderCard(['l1', 'removed-lesson', 'other']);
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('1/4 занятий')).toBeTruthy();
  });

  it('не показывает процент, пока список занятий загружается', () => {
    navState.lessons = [];
    navState.loading = true;
    renderCard(['l1']);
    expect(screen.queryByText(/%/)).toBeNull();
  });
});

describe('ContinueCourseCard: курс не начат', () => {
  it('ведёт в первую лекцию динамического курса, пропуская «О курсе»', () => {
    navState.lessons = [
      { id: 'l2', title: 'Вторая', order: 2 },
      { id: 'intro', title: 'О курсе', order: 0 },
      { id: 'l1', title: 'Первая', order: 1 },
    ];
    navState.loading = false;
    render(
      <MemoryRouter>
        <ContinueCourseCard
          course={{ ...makeCourse([]), started: false, continuePath: '/course/dynamic-course/intro' }}
          streamLabel="Курс потока"
          onOpenLessons={vi.fn()}
        />
      </MemoryRouter>
    );
    const cta = screen.getByRole('link', { name: /Смотреть первую лекцию/ });
    expect(cta.getAttribute('href')).toBe('/course/dynamic-course/l1');
    expect(screen.getByText('Лекция: Первая')).toBeTruthy();
  });
});

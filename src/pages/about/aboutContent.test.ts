import { describe, expect, it } from 'vitest';
import { ABOUT_TABS } from './aboutContent';
import { PARTNERS } from './partnersContent';
import { STATIC_PROJECTS } from '../projects/staticProjects';

describe('about page content', () => {
  it('keeps all seven tabs filled with final content', () => {
    expect(ABOUT_TABS).toHaveLength(7);
    expect(ABOUT_TABS.some((tab) => tab.kind === 'placeholder')).toBe(false);
    expect(ABOUT_TABS.map((tab) => tab.label)).toEqual([
      'Проект «Академия»',
      'Команда платформы',
      'Команда Академии',
      'История Академии и платформы',
      'Проекты Академии',
      'Офлайн-центр DOM',
      'Партнёры',
    ]);
  });

  it('links the three public programs to their current landing routes', () => {
    const links = STATIC_PROJECTS.flatMap((project) =>
      project.links ?? [{ label: 'Подробнее', url: project.url }]
    );

    expect(links.map((link) => link.url)).toEqual([
      '/academy/retraining-psychologist-consultant-tbilisi',
      '/academy/retraining-psychologist-consultant-belgrade',
      '/vozrast',
      '/warm_springs2',
    ]);
  });

  it('includes the Batumi Institute of Psychotherapy partner', () => {
    expect(PARTNERS).toContainEqual(
      expect.objectContaining({
        id: 'bip',
        url: 'https://bip.ge/',
      })
    );
  });
});

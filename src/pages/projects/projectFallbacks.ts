import type { ProjectPageDocument } from '../../types/pageContent';

export const PROJECT_FALLBACKS: Record<string, ProjectPageDocument> = {
  'dom-academy-overview': {
    version: 1,
    title: 'Это пример страницы проекта',
    subtitle: 'Демонстрация шаблона ProjectPage',
    intro:
      'Это пример страницы проекта в общем стиле сайта. На таких страницах будут жить отдельные проекты Академии — со своим заголовком, кратким описанием и фотографиями.',
    paragraphs: [
      'Шаблон не превращает страницу в отдельный лендинг. Это часть сайта: та же шапка, та же палитра, тот же компактный layout. Меняется только содержимое.',
      'В будущих волнах сюда будут подключаться реальные проекты — с фотографиями, программой, ссылкой на запись или бронирование.',
    ],
    cta: { label: 'На главную', to: '/home' },
  },
};

export function getProjectFallback(slug: string): ProjectPageDocument | null {
  return PROJECT_FALLBACKS[slug] ?? null;
}

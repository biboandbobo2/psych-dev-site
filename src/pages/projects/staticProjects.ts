/**
 * Статические страницы проектов академии — собраны не через шаблон ProjectPage
 * и не редактируются через /superadmin/pages. На /about во вкладке «Проекты»
 * показываются вместе с динамическими (projectPages/{slug}).
 */
export interface StaticProjectEntry {
  title: string;
  url: string;
  summary: string;
  /** Подсказка для админки (источник содержимого, причина «без редактирования»). */
  adminNote: string;
}

export const STATIC_PROJECTS: StaticProjectEntry[] = [
  {
    title: 'Тёплые ключи 2',
    url: '/warm_springs2',
    summary:
      'Лендинг очного интенсива по групповой психотерапии (Тбилиси, июль 2026). Программа, расписание, регистрация.',
    adminNote:
      'Статическая страница — собрана не через шаблон ProjectPage, в админке не редактируется.',
  },
];

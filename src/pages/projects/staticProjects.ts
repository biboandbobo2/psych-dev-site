/**
 * Статические страницы проектов академии — собраны не через шаблон ProjectPage
 * и не редактируются через /superadmin/pages. На /about во вкладке «Проекты»
 * показываются вместе с динамическими (projectPages/{slug}).
 */
export interface StaticProjectEntry {
  title: string;
  url: string;
  summary: string;
  links?: Array<{
    label: string;
    url: string;
  }>;
  /** Подсказка для админки (источник содержимого, причина «без редактирования»). */
  adminNote: string;
}

export const STATIC_PROJECTS: StaticProjectEntry[] = [
  {
    title: 'Профессиональная переподготовка «Психолог-консультант»',
    url: '/academy/retraining-psychologist-consultant-tbilisi',
    summary:
      'Двухлетняя программа фундаментальной подготовки к работе психологом-консультантом. В феврале 2027 года стартуют потоки в Тбилиси и Белграде.',
    links: [
      {
        label: 'Программа в Тбилиси',
        url: '/academy/retraining-psychologist-consultant-tbilisi',
      },
      {
        label: 'Программа в Белграде',
        url: '/academy/retraining-psychologist-consultant-belgrade',
      },
    ],
    adminNote:
      'Два статических городских лендинга — Тбилиси и Белград; в админке не редактируются.',
  },
  {
    title: 'Психология развития: вся жизнь',
    url: '/vozrast',
    summary:
      'Программа о развитии человека от периода до рождения до старения и завершения жизни: теория, семинары, малые группы и исследование жизненных историй.',
    adminNote:
      'Статический лендинг курса по психологии развития — в админке не редактируется.',
  },
  {
    title: 'Тёплые ключи 2',
    url: '/warm_springs2',
    summary:
      'Очный обучающе-терапевтический интенсив по групповой психотерапии, где профессиональное обучение происходит через непосредственный опыт участия в группе.',
    adminNote:
      'Статическая страница — собрана не через шаблон ProjectPage, в админке не редактируется.',
  },
];

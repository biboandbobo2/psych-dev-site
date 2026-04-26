/**
 * Черновой контент для страницы «О нас» (/about).
 * Все тексты — черновики, ожидают редактуры от пользователя.
 * Контент партнёров вынесен отдельно — см. partnersContent.ts.
 */

export interface AboutTabBase {
  id: string;
  label: string;
}

export interface AboutTextSection {
  heading?: string;
  paragraphs: string[];
}

export interface AboutPlaceholderTab extends AboutTabBase {
  kind: 'placeholder';
  intro: string;
  note?: string;
}

export interface AboutTextTab extends AboutTabBase {
  kind: 'text';
  intro?: string;
  sections: AboutTextSection[];
}

export interface AboutOfflineTab extends AboutTabBase {
  kind: 'offline';
  intro: string;
  paragraphs: string[];
  instagramUrl: string;
  bookingPath: string;
  bookingLabel: string;
  instagramLabel: string;
}

export interface AboutPartnersTab extends AboutTabBase {
  kind: 'partners';
  intro: string;
}

export type AboutTab = AboutTextTab | AboutPlaceholderTab | AboutOfflineTab | AboutPartnersTab;

export const ABOUT_TABS: AboutTab[] = [
  {
    id: 'academy',
    label: 'Проект «Академия»',
    kind: 'text',
    intro:
      'DOM Academy — образовательная платформа по психологии. Мы собираем курсы, лекции, инструменты и сообщество вокруг гуманистического подхода.',
    sections: [
      {
        heading: 'Что это такое',
        paragraphs: [
          'Академия — онлайн-пространство, где можно учиться психологии в удобном темпе. Курсы по возрастной психологии, клиническим темам и общему введению в специальность дополняются интерактивными инструментами: тестами, заметками, таймлайном жизни и AI-поиском по лекциям.',
          'Платформа объединяет несколько направлений в одном месте: видео-лекции, материалы для самостоятельной работы, очные интенсивы и доступ к офлайн-центру в Тбилиси.',
        ],
      },
      {
        heading: 'Зачем мы это делаем',
        paragraphs: [
          'Чтобы у студентов и практикующих специалистов был один аккуратный вход в материалы, к которым хочется возвращаться. Чтобы преподаватели могли выкладывать курсы и держать связь со своими группами без дополнительных платформ.',
          'И чтобы психологическая практика — обучение, супервизия, личная терапия — оставалась цельным процессом, а не разрозненными сервисами.',
        ],
      },
      {
        heading: 'Для кого',
        paragraphs: [
          'Для студентов психологических факультетов, начинающих и практикующих психологов, а также для всех, кому интересно глубже разобраться в теории и практике помогающих профессий.',
        ],
      },
    ],
  },
  {
    id: 'team-site',
    label: 'Команда сайта',
    kind: 'placeholder',
    intro: 'Команда, которая разрабатывает и поддерживает платформу.',
    note: 'Информация скоро появится.',
  },
  {
    id: 'team-academy',
    label: 'Команда академии',
    kind: 'placeholder',
    intro: 'Преподаватели, кураторы и психологи, ведущие курсы и группы.',
    note: 'Информация скоро появится.',
  },
  {
    id: 'history',
    label: 'История сайта',
    kind: 'placeholder',
    intro: 'Как появилась платформа и как она развивалась.',
    note: 'Информация скоро появится.',
  },
  {
    id: 'offline',
    label: 'Офлайн-центр Dom',
    kind: 'offline',
    intro:
      'Dom — это наша офлайн-часть в Тбилиси. Не отдельный бренд-партнёр, а тот же проект, только в физическом пространстве.',
    paragraphs: [
      'В центре Dom можно очно прийти на индивидуальную сессию к психологу, попасть на групповой формат или арендовать кабинет для своей практики.',
      'Платформа и центр связаны: студенты Академии могут продолжать работу в офлайне, а специалисты из Dom — выкладывать здесь свои курсы и материалы.',
    ],
    instagramUrl: 'https://www.instagram.com/psydom_tbilisi/',
    instagramLabel: 'Instagram центра',
    bookingPath: '/booking',
    bookingLabel: 'Бронирование кабинетов',
  },
  {
    id: 'partners',
    label: 'Партнёры',
    kind: 'partners',
    intro:
      'Организации и специалисты, с которыми мы сотрудничаем по образовательным программам, проектам и совместным мероприятиям.',
  },
];

export const DEFAULT_TAB_ID = ABOUT_TABS[0].id;

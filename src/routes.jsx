export const SITE_NAME = 'Psych Dev Site';

export const ROUTE_CONFIG = [
  {
    path: '/intro',
    key: 'intro',
    navLabel: 'Вводное занятие',
    periodId: 'intro',
    themeKey: 'intro',
    videoSrc: 'https://www.youtube.com/watch?v=0q4AZ3WsAAc',
    meta: {
      title: 'Вводное занятие — Psych Dev Site',
      description: 'Знакомство с психологией развития: вводное занятие и ключевые вопросы курса.',
    },
  },
  {
    path: '/prenatal',
    key: 'prenatal',
    navLabel: 'Пренатальный период',
    periodId: 'prenatal',
    themeKey: 'prenatal',
    meta: {
      title: 'Пренатальный период — Psych Dev Site',
      description: 'Ключевые понятия, литература и видео о пренатальном развитии ребёнка.'
    }
  },
  {
    path: '/0-1',
    key: '0-1',
    navLabel: 'Младенчество (0–1 год)',
    periodId: 'infancy',
    themeKey: 'infancy',
    meta: {
      title: 'Младенчество 0–1 — Psych Dev Site',
      description: 'Исследуем привязанность, сенсомоторное развитие и ключевых авторов младенчества.'
    }
  },
  {
    path: '/1-3',
    key: '1-3',
    navLabel: 'Раннее детство (1–3 года)',
    periodId: 'toddler',
    themeKey: 'toddler',
    meta: {
      title: 'Раннее детство 1–3 — Psych Dev Site',
      description: 'Речь, автономия и игры раннего детства в одном месте.'
    }
  },
  {
    path: '/3-6',
    key: '3-6',
    navLabel: 'Дошкольный возраст (3–7 лет)',
    periodId: 'preschool',
    themeKey: 'preschool',
    meta: {
      title: 'Дошкольный возраст 3–7 — Psych Dev Site',
      description: 'Игра, развитие мышления и социальные навыки дошкольников.'
    }
  },
  {
    path: '/7-9',
    key: '7-9',
    navLabel: 'Младший школьный возраст (7–10 лет)',
    periodId: 'primary-school',
    themeKey: 'school1',
    placeholderText: 'Контент для возраста 7–10 лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: false,
    meta: {
      title: 'Младший школьный возраст 7–10 — Psych Dev Site',
      description: 'Операции мышления, мотивация к учёбе и развитие школьников.'
    }
  },
  {
    path: '/10-13',
    key: '10-13',
    navLabel: 'Ранняя подростковость (10–13 лет)',
    periodId: 'earlyAdolescence',
    themeKey: 'earlyTeen',
    placeholderText: 'Контент для возраста 10–13 лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Ранняя подростковость 10–13 — Psych Dev Site',
      description: 'Нейробиология риска, идентичность и поддержка пре-подростков.'
    }
  },
  {
    path: '/14-18',
    key: '14-18',
    navLabel: 'Средняя подростковость (14–18 лет)',
    periodId: 'adolescence',
    themeKey: 'teen',
    placeholderText: 'Контент для возраста 14–18 лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Подростковость 14–18 — Psych Dev Site',
      description: 'Социализация, принятие решений и развитие личности подростков.'
    }
  },
  {
    path: '/19-22',
    key: '19-22',
    navLabel: 'Юность (19–22 года)',
    periodId: 'emergingAdult',
    themeKey: 'emergingAdult',
    placeholderText: 'Контент для возраста 19–22 года появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Юность 19–22 — Psych Dev Site',
      description: 'Переход ко взрослости, идентичность и профессиональный поиск.'
    }
  },
  {
    path: '/22-27',
    key: '22-27',
    navLabel: 'Ранняя зрелость (22–27 лет)',
    periodId: '22-27',
    themeKey: 'earlyAdult',
    placeholderText: 'Контент для возраста 22–27 лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Ранняя зрелость 22–27 — Psych Dev Site',
      description: 'Мы готовим материалы для ранней взрослости 22–27 лет.'
    }
  },
  {
    path: '/28-40',
    key: '28-40',
    navLabel: 'Ранняя зрелость (28–40 лет)',
    periodId: 'earlyAdult',
    themeKey: 'midAdult1',
    placeholderText: 'Контент для возраста 28–40 лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Ранняя зрелость 28–40 — Psych Dev Site',
      description: 'Работа, близость и развитие партнёрства в 28–40 лет.'
    }
  },
  {
    path: '/40-65',
    key: '40-65',
    navLabel: 'Средняя зрелость (40–65 лет)',
    periodId: 'midlife',
    themeKey: 'midAdult2',
    placeholderText: 'Контент для возраста 40–65 лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Средняя зрелость 40–65 — Psych Dev Site',
      description: 'Генеративность, кризисы и новые карьерные стратегии.'
    }
  },
  {
    path: '/66-80',
    key: '66-80',
    navLabel: 'Пожилой возраст (66–80 лет)',
    periodId: 'lateAdult',
    themeKey: 'older',
    placeholderText: 'Контент для возраста 66–80 лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Пожилой возраст 66–80 — Psych Dev Site',
      description: 'Когнитивные изменения и качество жизни пожилых людей.'
    }
  },
  {
    path: '/80-plus',
    key: '80-plus',
    navLabel: 'Долголетие (80+ лет)',
    periodId: 'oldestOld',
    themeKey: 'oldest',
    placeholderText: 'Контент для возраста 80+ лет появится в ближайшем обновлении.',
    placeholderDefaultEnabled: true,
    meta: {
      title: 'Долголетие 80+ — Psych Dev Site',
      description: 'Поддержка, исследования и смыслы самой поздней зрелости.'
    }
  }
];

export const NOT_FOUND_REDIRECT = false;

export const ROUTE_BY_PERIOD = ROUTE_CONFIG.reduce((acc, config) => {
  if (config.periodId) {
    acc[config.periodId] = config;
  }
  return acc;
}, {});

/**
 * Конфигурация роутов для курса клинической психологии
 */
export const CLINICAL_ROUTE_CONFIG = [
  {
    path: '/clinical/intro',
    key: 'clinical-intro',
    navLabel: 'Введение',
    periodId: 'clinical-intro',
    themeKey: 'clinical',
    meta: {
      title: 'Введение в клиническую психологию — Psych Dev Site',
      description: 'Вводное занятие курса клинической психологии.',
    },
  },
  {
    path: '/clinical/1',
    key: 'clinical-1',
    navLabel: 'Предмет, методы патопсихологии',
    periodId: 'clinical-1',
    themeKey: 'clinical',
    meta: {
      title: 'Патопсихология — Psych Dev Site',
      description: 'Предмет, методы и задачи патопсихологии. Аномалии эмоционально-личностной сферы.',
    },
  },
  {
    path: '/clinical/2',
    key: 'clinical-2',
    navLabel: 'Расстройства личности',
    periodId: 'clinical-2',
    themeKey: 'clinical',
    meta: {
      title: 'Расстройства личности — Psych Dev Site',
      description: 'Диагностика и терапия расстройств личности.',
    },
  },
  {
    path: '/clinical/3',
    key: 'clinical-3',
    navLabel: 'Аффективные расстройства (БАР)',
    periodId: 'clinical-3',
    themeKey: 'clinical',
    meta: {
      title: 'Аффективные расстройства — Psych Dev Site',
      description: 'Депрессия, мания и биполярное аффективное расстройство.',
    },
  },
  {
    path: '/clinical/4',
    key: 'clinical-4',
    navLabel: 'Суицидальность',
    periodId: 'clinical-4',
    themeKey: 'clinical',
    meta: {
      title: 'Суицидальность — Psych Dev Site',
      description: 'Аффективные расстройства и суицидальность.',
    },
  },
  {
    path: '/clinical/5',
    key: 'clinical-5',
    navLabel: 'Расстройства психотического спектра',
    periodId: 'clinical-5',
    themeKey: 'clinical',
    meta: {
      title: 'Психотические расстройства — Psych Dev Site',
      description: 'Шизофрения и расстройства психотического спектра.',
    },
  },
  {
    path: '/clinical/6',
    key: 'clinical-6',
    navLabel: 'Патология памяти, восприятия',
    periodId: 'clinical-6',
    themeKey: 'clinical',
    meta: {
      title: 'Патология ВПФ — Psych Dev Site',
      description: 'Патология памяти, восприятия и внимания.',
    },
  },
  {
    path: '/clinical/7',
    key: 'clinical-7',
    navLabel: 'Классификация расстройств ВПФ',
    periodId: 'clinical-7',
    themeKey: 'clinical',
    meta: {
      title: 'Расстройства ВПФ — Psych Dev Site',
      description: 'Классификация расстройств высших психических функций.',
    },
  },
  {
    path: '/clinical/8',
    key: 'clinical-8',
    navLabel: 'Патопсихологическая диагностика',
    periodId: 'clinical-8',
    themeKey: 'clinical',
    meta: {
      title: 'Патопсихологическая диагностика — Psych Dev Site',
      description: 'Методы патопсихологической диагностики.',
    },
  },
  {
    path: '/clinical/9',
    key: 'clinical-9',
    navLabel: 'Проективные методы',
    periodId: 'clinical-9',
    themeKey: 'clinical',
    meta: {
      title: 'Проективная диагностика — Psych Dev Site',
      description: 'Проективные методы психодиагностики.',
    },
  },
  {
    path: '/clinical/10',
    key: 'clinical-10',
    navLabel: 'Нарушения развития у детей',
    periodId: 'clinical-10',
    themeKey: 'clinical',
    meta: {
      title: 'Нарушения развития — Psych Dev Site',
      description: 'Нарушения психического развития в детском возрасте.',
    },
  },
];

export const CLINICAL_ROUTE_BY_PERIOD = CLINICAL_ROUTE_CONFIG.reduce((acc, config) => {
  if (config.periodId) {
    acc[config.periodId] = config;
  }
  return acc;
}, {});

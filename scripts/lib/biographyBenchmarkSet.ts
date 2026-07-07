/**
 * Набор биографий для benchmark'а biography import pipeline.
 *
 * Сплит:
 * - worker (15) — рабочий набор: на нём классифицируются ошибки и тюнятся
 *   изменения;
 * - holdout (5) — отложенный набор: НИКОГДА не подгонять промпты/код под
 *   него; прогоняется только для финальной проверки каждого принятого
 *   изменения. Ухудшение на holdout = откат изменения.
 *
 * Категории нужны для пер-категорийного сравнения метрик (изменение
 * принимается, только если ни одна категория заметно не просела).
 */

export type BiographyBenchmarkCategory =
  | 'ru' // русскоязычная статья
  | 'en' // англоязычная статья
  | 'psychologist' // психологи и учёные смежных областей
  | 'scientist' // естественные науки
  | 'multi-profession' // несколько профессий
  | 'migration' // миграции между странами
  | 'parallel-projects' // параллельные проекты/карьеры
  | 'incomplete-dates' // события с неполными/старостильными датами
  | 'long-article' // длинная статья (>60K символов biographyExtract)
  | 'short-article' // короткая статья (<25K символов)
  | 'contradictory'; // противоречивые сведения в источниках

export type BiographyBenchmarkEntry = {
  id: string;
  subject: string;
  sourceUrl: string;
  set: 'worker' | 'holdout';
  categories: BiographyBenchmarkCategory[];
};

export const biographyBenchmarkSet: BiographyBenchmarkEntry[] = [
  // ===== worker (15) =====
  {
    id: 'vygotsky',
    subject: 'Лев Выготский',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Выготский,_Лев_Семёнович',
    set: 'worker',
    categories: ['ru', 'psychologist'],
  },
  {
    id: 'pavlov',
    subject: 'Иван Павлов',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Павлов,_Иван_Петрович',
    set: 'worker',
    categories: ['ru', 'scientist', 'long-article'],
  },
  {
    id: 'bekhterev',
    subject: 'Владимир Бехтерев',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Бехтерев,_Владимир_Михайлович',
    set: 'worker',
    categories: ['ru', 'psychologist', 'multi-profession', 'contradictory'],
  },
  {
    id: 'james',
    subject: 'William James',
    sourceUrl: 'https://en.wikipedia.org/wiki/William_James',
    set: 'worker',
    categories: ['en', 'psychologist', 'multi-profession'],
  },
  {
    id: 'rogers',
    subject: 'Carl Rogers',
    sourceUrl: 'https://en.wikipedia.org/wiki/Carl_Rogers',
    set: 'worker',
    categories: ['en', 'psychologist'],
  },
  {
    id: 'freud',
    subject: 'Зигмунд Фрейд',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Фрейд,_Зигмунд',
    set: 'worker',
    categories: ['ru', 'psychologist', 'migration', 'long-article', 'contradictory'],
  },
  {
    id: 'erikson',
    subject: 'Erik Erikson',
    sourceUrl: 'https://en.wikipedia.org/wiki/Erik_Erikson',
    set: 'worker',
    categories: ['en', 'psychologist', 'migration', 'contradictory'],
  },
  {
    id: 'lomonosov',
    subject: 'Михаил Ломоносов',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Ломоносов,_Михаил_Васильевич',
    set: 'worker',
    categories: ['ru', 'scientist', 'multi-profession', 'incomplete-dates', 'long-article'],
  },
  {
    id: 'nabokov',
    subject: 'Владимир Набоков',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Набоков,_Владимир_Владимирович',
    set: 'worker',
    categories: ['ru', 'migration', 'parallel-projects'],
  },
  {
    id: 'chekhov',
    subject: 'Антон Чехов',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Чехов,_Антон_Павлович',
    set: 'worker',
    categories: ['ru', 'parallel-projects', 'long-article'],
  },
  {
    id: 'schweitzer',
    subject: 'Альберт Швейцер',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Швейцер,_Альберт',
    set: 'worker',
    categories: ['ru', 'multi-profession', 'migration'],
  },
  {
    id: 'lazursky',
    subject: 'Александр Лазурский',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Лазурский,_Александр_Фёдорович',
    set: 'worker',
    categories: ['ru', 'psychologist', 'short-article', 'incomplete-dates'],
  },
  {
    id: 'wundt',
    subject: 'Wilhelm Wundt',
    sourceUrl: 'https://en.wikipedia.org/wiki/Wilhelm_Wundt',
    set: 'worker',
    categories: ['en', 'psychologist', 'long-article'],
  },
  {
    id: 'frankl',
    subject: 'Виктор Франкл',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Франкл,_Виктор',
    set: 'worker',
    categories: ['ru', 'psychologist', 'migration'],
  },
  {
    id: 'kovalevskaya',
    subject: 'Софья Ковалевская',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Ковалевская,_Софья_Васильевна',
    set: 'worker',
    categories: ['ru', 'scientist', 'migration', 'parallel-projects', 'incomplete-dates'],
  },

  // ===== holdout (5) — не подгонять под них промпты/код =====
  {
    id: 'luria',
    subject: 'Александр Лурия',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Лурия,_Александр_Романович',
    set: 'holdout',
    categories: ['ru', 'psychologist'],
  },
  {
    id: 'skinner',
    subject: 'B. F. Skinner',
    sourceUrl: 'https://en.wikipedia.org/wiki/B._F._Skinner',
    set: 'holdout',
    categories: ['en', 'psychologist'],
  },
  {
    id: 'curie',
    subject: 'Мария Склодовская-Кюри',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Склодовская-Кюри,_Мария',
    set: 'holdout',
    categories: ['ru', 'scientist', 'migration', 'long-article'],
  },
  {
    id: 'blonsky',
    subject: 'Павел Блонский',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Блонский,_Павел_Петрович',
    set: 'holdout',
    categories: ['ru', 'psychologist', 'short-article'],
  },
  {
    id: 'piaget',
    subject: 'Jean Piaget',
    sourceUrl: 'https://en.wikipedia.org/wiki/Jean_Piaget',
    set: 'holdout',
    categories: ['en', 'psychologist', 'long-article'],
  },
];

/** Подмножество для замера стабильности (два прогона, только эти 5). */
export const STABILITY_SUBSET_IDS = ['vygotsky', 'pavlov', 'james', 'lazursky', 'nabokov'] as const;

/**
 * Каталог наклеек «Достижений» — v2.1, утверждён дизайнером 05.10.2026
 * (docs/design/макет-редизайна/наклейки-предложение-v2.md).
 * Картинки — public/achievements/<id>.webp.
 */

/** Набор наклеек по курсам человека: Старт / Курс / Программа. */
export type AchievementSet = 'S' | 'K' | 'P';

export type AchievementBlock = 'les' | 'crs' | 'prg' | 'tst' | 'nts' | 'rhy' | 'prc' | 'sec';

export interface AchievementDef {
  id: string;
  block: AchievementBlock;
  /** В каких наборах наклейка видна. Курсовые дополнительно фильтруются по доступу. */
  sets: AchievementSet[];
  name: string;
  condition: string;
  secret?: boolean;
  /** Данных для подсчёта пока нет — показываем с меткой «скоро». */
  soon?: boolean;
  /** Курсовая наклейка: курсы, прохождение любого из которых её даёт. */
  courseIds?: string[];
}

export const ACHIEVEMENT_BLOCKS: { key: AchievementBlock; title: string; description?: string }[] = [
  {
    key: 'les',
    title: 'За лекции и занятия',
    description:
      'Лекция — видео, просмотренное хотя бы на 60%. Занятие засчитывается, когда просмотрена его основная лекция.',
  },
  { key: 'crs', title: 'За курсы', description: 'Своя наклейка за каждый курс: пройдите все его занятия.' },
  {
    key: 'prg',
    title: 'За программу',
    description: 'Переподготовка «Психолог-консультант»: курсы, которые уже открыты вашему потоку.',
  },
  { key: 'tst', title: 'За тесты', description: 'Тест пройден, если набран его порог — обычно 70%.' },
  { key: 'nts', title: 'За конспекты и вопросы' },
  { key: 'rhy', title: 'За регулярность', description: 'Считается по времени тестов, конспектов и вопросов.' },
  {
    key: 'prc',
    title: 'За практику',
    description: 'Скоро здесь можно будет отмечать сданные задания потока.',
  },
  { key: 'sec', title: 'Секретные', description: 'Условие откроется, когда наклейка будет получена.' },
];

const ALL: AchievementSet[] = ['S', 'K', 'P'];
const KP: AchievementSet[] = ['K', 'P'];
const P: AchievementSet[] = ['P'];

/** Курсы переподготовки. Внутренний массив — один «курс программы» (2-й поток патопсихологии = тот же курс). */
export const PROGRAM_COURSE_UNITS: string[][] = [
  ['general'],
  ['development'],
  ['clinical', 'osnovy-patopsihologii-2y-potok'],
  ['vvedenie-v-osnovy-klinicheskoy-psihologii'],
  ['chastnye-voprosy-klinicheskoy-psihologii'],
  ['psihologiya-lichnosti-avtorskiy-kurs-aleksandra-za'],
  ['dvuhdnevnye-zanyatiya-3y-semestr-pervyy-potok'],
];

export const PROGRAM_COURSE_IDS = new Set(PROGRAM_COURSE_UNITS.flat());

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-lecture', block: 'les', sets: ALL, name: 'Ну, поехали!', condition: 'Посмотрели первую лекцию' },
  { id: 'understand', block: 'les', sets: ALL, name: 'Я хочу разобраться', condition: 'Пересмотрели лекцию', soon: true },
  { id: 'lessons-3', block: 'les', sets: ALL, name: 'Вошли во вкус', condition: 'Прошли 3 занятия' },
  { id: 'lessons-10', block: 'les', sets: KP, name: '10 занятий спустя', condition: 'Прошли 10 занятий' },

  { id: 'course-general', block: 'crs', sets: ALL, name: 'Основа основ', condition: 'Курс «Общая психология»', courseIds: ['general'] },
  { id: 'course-development', block: 'crs', sets: ALL, name: 'Вся жизнь целиком', condition: 'Курс «Психология развития»', courseIds: ['development'] },
  { id: 'course-pathopsychology', block: 'crs', sets: ALL, name: 'Норма и не только', condition: 'Курс «Основы патопсихологии»', courseIds: ['clinical', 'osnovy-patopsihologii-2y-potok'] },
  { id: 'course-clinical-intro', block: 'crs', sets: ALL, name: 'Взгляд клинициста', condition: 'Курс «Введение в основы клинической психологии»', courseIds: ['vvedenie-v-osnovy-klinicheskoy-psihologii'] },
  { id: 'course-clinical-special', block: 'crs', sets: ALL, name: 'Тонкие случаи', condition: 'Курс «Частные вопросы клинической психологии»', courseIds: ['chastnye-voprosy-klinicheskoy-psihologii'] },
  { id: 'course-personality', block: 'crs', sets: ALL, name: 'Кто я?', condition: 'Курс «Психология личности»', courseIds: ['psihologiya-lichnosti-avtorskiy-kurs-aleksandra-za'] },
  { id: 'course-psychodynamic', block: 'crs', sets: ALL, name: 'В глубину', condition: 'Курс «Двухдневные занятия, 3-й семестр»', courseIds: ['dvuhdnevnye-zanyatiya-3y-semestr-pervyy-potok'] },
  { id: 'course-social', block: 'crs', sets: P, name: 'Мы и другие', condition: 'Курс «Социальная психология» появится позже', soon: true },
  { id: 'course-group', block: 'crs', sets: ALL, name: 'В кругу', condition: 'Курс «Групповая психотерапия»', courseIds: ['gruppovaya-psihoterapiya'] },
  { id: 'course-ego', block: 'crs', sets: ALL, name: 'Встреча с собой', condition: 'Курс «Лекции ЭГО»', courseIds: ['lektsii-ot-ano-dpo-ekzistentsialno-gumanistichesko'] },

  { id: 'three-courses', block: 'prg', sets: P, name: 'С трёх сторон', condition: 'Прошли 3 курса программы' },
  { id: 'equator', block: 'prg', sets: P, name: 'Экватор', condition: 'Прошли половину занятий программы' },
  { id: 'seen-all', block: 'prg', sets: P, name: 'Я видел всё', condition: 'Прошли все курсы программы' },

  { id: 'first-test', block: 'tst', sets: KP, name: 'Я что-то знаю', condition: 'Прошли первый тест' },
  { id: 'bullseye', block: 'tst', sets: KP, name: 'В яблочко', condition: 'Прошли тест без ошибок' },
  { id: 'tests-10', block: 'tst', sets: KP, name: 'Проверено на себе', condition: 'Прошли 10 разных тестов' },
  { id: 'no-mistakes', block: 'tst', sets: KP, name: 'Ни единой ошибки', condition: '5 тестов на 100%' },
  { id: 'mistakes-work', block: 'tst', sets: KP, name: 'Работа над ошибками', condition: 'Улучшили результат теста при повторе' },
  { id: 'deep-dive', block: 'tst', sets: KP, name: 'До самой сути', condition: 'Прошли все уровни тестов одного занятия' },

  { id: 'first-note', block: 'nts', sets: ALL, name: 'Первый конспект', condition: 'Сделали первый конспект лекции' },
  { id: 'notes-5', block: 'nts', sets: ALL, name: 'На полях', condition: 'Конспекты к 5 занятиям' },
  { id: 'generosity', block: 'nts', sets: KP, name: 'Щедрость', condition: 'Поделились конспектом с группой или лекторами' },
  { id: 'first-question', block: 'nts', sets: KP, name: 'Есть вопрос', condition: 'Задали первый вопрос к лекции' },

  { id: 'slow-steady', block: 'rhy', sets: ALL, name: 'Медленно, но верно', condition: 'Учились 5 недель подряд' },
  { id: 'night-shift', block: 'rhy', sets: ALL, name: 'Ночная смена', condition: 'Учились после полуночи (00:00–05:00)' },
  { id: 'early-bird', block: 'rhy', sets: ALL, name: 'Пока все спят', condition: 'Учились до 8 утра (05:00–08:00)' },

  { id: 'first-task', block: 'prc', sets: P, name: 'Чистый лист', condition: 'Сдали первое задание', soon: true },
  { id: 'practitioner', block: 'prc', sets: P, name: 'Практик', condition: 'Выполнили 10 заданий', soon: true },

  { id: 'not-here', block: 'sec', sets: ALL, secret: true, name: 'Не туда', condition: 'Нашли страницу, которой не существует' },
  { id: 'why', block: 'sec', sets: KP, secret: true, name: 'Почемучка', condition: 'Задали 5 вопросов к лекциям' },
  { id: 'owl-lark', block: 'sec', sets: ALL, secret: true, name: 'Сова и жаворонок', condition: 'Учились и ночью, и до 8 утра' },
  { id: 'welcome-back', block: 'sec', sets: ALL, secret: true, name: 'С возвращением', condition: 'Вернулись к учёбе после перерыва больше 30 дней' },
];

/** XP за действия — как в макете. Каждые 300 XP — новый уровень. */
export const XP_RULES = [
  { key: 'lessons', label: 'Пройти занятие', xp: 20 },
  { key: 'tests', label: 'Пройти тест', xp: 20 },
  { key: 'perfectTests', label: 'Тест на 100%', xp: 10 },
  { key: 'noteLessons', label: 'Конспект к занятию', xp: 15 },
  { key: 'questions', label: 'Вопрос к лекции', xp: 10 },
  { key: 'courses', label: 'Пройти курс', xp: 200 },
] as const;

export const XP_PER_LEVEL = 300;

export function achievementImage(id: string): string {
  return `/achievements/${id}.webp`;
}

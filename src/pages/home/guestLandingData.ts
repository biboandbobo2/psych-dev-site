import { getCourseIntroPath } from '../../lib/courseLinks';
import type { CourseOption } from '../../hooks/useCourses';

/**
 * Данные гостевой главной (макет редизайна, 11.10.2026).
 * Какие курсы показывать гостю, задаёт супер-админ (поле courses/{id}.guestHome);
 * здесь — короткие названия, описания и обложки для карточек.
 */

export interface GuestCourseMeta {
  /** Короткое название для карточки (в базе названия длинные или с опечатками). */
  title: string;
  /** Подпись над названием. */
  eyebrow?: string;
  description: string;
  cover: string;
  /** Фон под прозрачной обложкой. */
  tone: string;
}

const COVER = '/images/academy-home/covers';

export const GUEST_COURSE_META: Record<string, GuestCourseMeta> = {
  'gruppovaya-psihoterapiya': {
    title: 'Групповая психотерапия',
    description: 'Открытая видеолекция «Границы группы».',
    cover: `${COVER}/group.webp`,
    tone: 'bg-pastel-sage',
  },
  'lektsii-ot-ano-dpo-ekzistentsialno-gumanistichesko': {
    title: 'Экзистенциально-гуманистическое образование',
    eyebrow: 'Лекции АНО ДПО',
    description: 'Лекции и интервью: обида, вина, стыд, шоковая триада.',
    cover: `${COVER}/humanistic.webp`,
    tone: 'bg-pastel-lilac',
  },
  general: {
    title: 'Общая психология',
    description: 'Познавательные процессы, эмоции, мотивация и воля.',
    cover: `${COVER}/general.webp`,
    tone: 'bg-pastel-terracotta',
  },
  development: {
    title: 'Психология развития',
    description: 'Весь жизненный путь — от периода до рождения до старости.',
    cover: `${COVER}/development.webp`,
    tone: 'bg-pastel-ochre',
  },
  clinical: {
    title: 'Основы патопсихологии',
    description: 'Методы, расстройства личности, настроения и мышления, детский возраст.',
    cover: `${COVER}/pathopsychology.webp`,
    tone: 'bg-pastel-blue',
  },
  'vvedenie-v-osnovy-klinicheskoy-psihologii': {
    title: 'Введение в клиническую психологию',
    description: 'Нервная система, первые шаги в нейропсихологии и психиатрии.',
    cover: `${COVER}/clinical.webp`,
    tone: 'bg-[#F8E1CC]',
  },
};

export const RETRAINING_LANDING_PATH = '/academy/retraining-psychologist-consultant-tbilisi';

export const ABOUT_LINKS: { label: string; to: string }[] = [
  { label: 'Проект «Академия»', to: '/about' },
  { label: 'Команда Академии', to: '/about?tab=team-academy' },
  { label: 'История', to: '/about?tab=history' },
  { label: 'Проекты', to: '/about?tab=projects' },
  { label: 'Офлайн-центр DOM', to: '/about?tab=offline' },
  { label: 'Партнёры', to: '/about?tab=partners' },
];

export const PLATFORM_FEATURES = [
  {
    title: 'Видео, заметки и транскрипт',
    description: 'Конспект рядом с лекцией сохраняется сам и привязан к курсу.',
    image: '/images/vozrast/screens/konspekt.jpg',
    alt: 'Экран лекции с видео, конспектом и транскриптом',
    tone: 'bg-pastel-blue',
  },
  {
    title: 'Тесты по занятиям',
    description: 'Видно, что усвоено, а за учёбу вы получаете наклейки.',
    image: '/images/vozrast/screens/tests.jpg',
    alt: 'Экран тестов по занятиям',
    tone: 'bg-pastel-ochre',
  },
  {
    title: 'Таймлайн жизни',
    description: 'События, возрастные периоды и развилки — на одной карте.',
    image: '/images/vozrast/screens/timeline.jpg',
    alt: 'Интерактивный таймлайн жизни',
    tone: 'bg-pastel-sage',
  },
];

// Курсы с собственным лендингом: карточка ведёт на него вместо вводной страницы
const COURSE_LANDING_PATHS: Record<string, string> = {
  development: '/vozrast',
};

export const courseLink = (id: string) => COURSE_LANDING_PATHS[id] ?? getCourseIntroPath(id);

/** Мета курса; для открытого курса без записи в таблице — название из базы. */
export function guestMeta(course: CourseOption): GuestCourseMeta {
  return (
    GUEST_COURSE_META[course.id] ?? {
      title: course.name,
      description: '',
      cover: '',
      tone: 'bg-pastel-plain',
    }
  );
}

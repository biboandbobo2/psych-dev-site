import type { CoreCourseType } from '../types/tests';

export type CourseMeta = {
  id: CoreCourseType;
  name: string;
  icon: string;
  basePath: string;
  collection: string;
};

export const CORE_COURSE_META: Record<CoreCourseType, CourseMeta> = {
  development: {
    id: 'development',
    name: 'Психология развития',
    icon: '👶',
    basePath: '/',
    collection: 'periods',
  },
  clinical: {
    id: 'clinical',
    name: 'Клиническая психология',
    icon: '🧠',
    basePath: '/clinical/',
    collection: 'clinical-topics',
  },
  general: {
    id: 'general',
    name: 'Общая психология',
    icon: '📚',
    basePath: '/general/',
    collection: 'general-topics',
  },
};

export const CORE_COURSE_ORDER: CoreCourseType[] = ['development', 'clinical', 'general'];

export const CORE_COURSE_LIST: CourseMeta[] = [
  CORE_COURSE_META.development,
  CORE_COURSE_META.clinical,
  CORE_COURSE_META.general,
];

export const isCoreCourse = (courseId: string): courseId is CoreCourseType =>
  courseId === 'development' || courseId === 'clinical' || courseId === 'general';

export const getCourseBasePath = (courseId: string): string => {
  if (isCoreCourse(courseId)) {
    return CORE_COURSE_META[courseId].basePath;
  }
  return `/course/${courseId}/`;
};

export const getCourseDisplayName = (courseId: string, fallback?: string): string => {
  if (isCoreCourse(courseId)) {
    return CORE_COURSE_META[courseId].name;
  }
  return fallback?.trim() || courseId;
};

export const getCourseIcon = (courseId: string, fallback: string = '🎓'): string => {
  if (isCoreCourse(courseId)) {
    return CORE_COURSE_META[courseId].icon;
  }
  return fallback;
};

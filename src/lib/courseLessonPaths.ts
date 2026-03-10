const DEVELOPMENT_LESSON_PATHS: Record<string, string> = {
  intro: '/intro',
  prenatal: '/prenatal',
  infancy: '/0-1',
  toddler: '/1-3',
  preschool: '/3-6',
  'primary-school': '/7-9',
  earlyAdolescence: '/10-13',
  adolescence: '/14-18',
  emergingAdult: '/19-22',
  '22-27': '/22-27',
  earlyAdult: '/28-40',
  midlife: '/40-65',
  lateAdult: '/66-80',
  oldestOld: '/80-plus',
};

const CLINICAL_LESSON_PATHS: Record<string, string> = {
  'clinical-intro': '/clinical/intro',
  'clinical-1': '/clinical/1',
  'clinical-2': '/clinical/2',
  'clinical-3': '/clinical/3',
  'clinical-4': '/clinical/4',
  'clinical-5': '/clinical/5',
  'clinical-6': '/clinical/6',
  'clinical-7': '/clinical/7',
  'clinical-8': '/clinical/8',
  'clinical-9': '/clinical/9',
  'clinical-10': '/clinical/10',
};

const GENERAL_LESSON_PATHS: Record<string, string> = {
  'general-1': '/general/1',
  'general-2': '/general/2',
  'general-3': '/general/3',
  'general-4': '/general/4',
  'general-5': '/general/5',
  'general-6': '/general/6',
  'general-7': '/general/7',
  'general-8': '/general/8',
  'general-9': '/general/9',
  'general-10': '/general/10',
  'general-11': '/general/11',
  'general-12': '/general/12',
};

function getStaticCourseLessonPath(courseId: string, periodId: string) {
  if (courseId === 'development') {
    return DEVELOPMENT_LESSON_PATHS[periodId] ?? null;
  }

  if (courseId === 'clinical') {
    return CLINICAL_LESSON_PATHS[periodId] ?? null;
  }

  if (courseId === 'general') {
    return GENERAL_LESSON_PATHS[periodId] ?? null;
  }

  return null;
}

export function buildCourseLessonPath(courseId: string, periodId: string) {
  const staticPath = getStaticCourseLessonPath(courseId, periodId);
  if (staticPath) {
    return staticPath;
  }

  if (courseId === 'development') {
    return `/${periodId}`;
  }

  if (courseId === 'clinical') {
    return `/clinical/${periodId}`;
  }

  if (courseId === 'general') {
    return `/general/${periodId}`;
  }

  return `/course/${encodeURIComponent(courseId)}/${encodeURIComponent(periodId)}`;
}

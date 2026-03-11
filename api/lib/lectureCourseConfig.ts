type LectureOrderItem = {
  courseId: string;
  periodId: string;
  periodTitle: string;
  lectureTitle: string;
};

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

const DEVELOPMENT_PERIOD_ORDER: Record<string, number> = {
  intro: 0,
  prenatal: 1,
  infancy: 2,
  toddler: 3,
  preschool: 4,
  'primary-school': 5,
  school: 5,
  earlyAdolescence: 6,
  adolescence: 7,
  emergingAdult: 8,
  '22-27': 9,
  earlyAdult: 10,
  midlife: 11,
  lateAdult: 12,
  oldestOld: 13,
  seminary: 14,
};

const CLINICAL_PERIOD_ORDER: Record<string, number> = {
  'clinical-intro': 0,
  'clinical-1': 1,
  'clinical-2': 2,
  'clinical-3': 3,
  'clinical-4': 4,
  'clinical-5': 5,
  'clinical-6': 6,
  'clinical-7': 7,
  'clinical-8': 8,
  'clinical-9': 9,
  'clinical-10': 10,
  'rasstroystva-lichnosti': 11,
};

const GENERAL_PERIOD_ORDER: Record<string, number> = {
  'general-1': 0,
  'general-2': 1,
  'general-3': 2,
  'general-4': 3,
  'vnimanie-teorii': 4,
  'general-5': 5,
  'general-6': 6,
  'general-7': 7,
  'general-8': 8,
  'general-9': 9,
  'general-10': 10,
  'general-11': 11,
  'general-12': 12,
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

function getCoursePeriodOrder(courseId: string, periodId: string) {
  if (courseId === 'development') {
    return DEVELOPMENT_PERIOD_ORDER[periodId] ?? Number.MAX_SAFE_INTEGER;
  }

  if (courseId === 'clinical') {
    return CLINICAL_PERIOD_ORDER[periodId] ?? Number.MAX_SAFE_INTEGER;
  }

  if (courseId === 'general') {
    return GENERAL_PERIOD_ORDER[periodId] ?? Number.MAX_SAFE_INTEGER;
  }

  return Number.MAX_SAFE_INTEGER;
}

export function compareLectureOrder<T extends LectureOrderItem>(left: T, right: T) {
  const orderDiff =
    getCoursePeriodOrder(left.courseId, left.periodId) -
    getCoursePeriodOrder(right.courseId, right.periodId);

  if (orderDiff !== 0) {
    return orderDiff;
  }

  const periodTitleDiff = left.periodTitle.localeCompare(right.periodTitle, 'ru');
  if (periodTitleDiff !== 0) {
    return periodTitleDiff;
  }

  return left.lectureTitle.localeCompare(right.lectureTitle, 'ru');
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

export function groupLectureSourcesByCourse<T extends LectureOrderItem & { courseId: string }>(
  sources: T[]
) {
  const groups = new Map<string, T[]>();

  sources.forEach((source) => {
    const list = groups.get(source.courseId) ?? [];
    list.push(source);
    groups.set(source.courseId, list);
  });

  return [...groups.entries()]
    .sort(([courseA], [courseB]) => courseA.localeCompare(courseB, 'ru'))
    .map(([courseId, lectures]) => ({
      courseId,
      lectures: [...lectures].sort(compareLectureOrder),
    }));
}

import {
  ACHIEVEMENTS,
  PROGRAM_COURSE_IDS,
  PROGRAM_COURSE_UNITS,
  XP_PER_LEVEL,
  type AchievementDef,
  type AchievementSet,
} from './catalog';

export interface CourseProgressInput {
  id: string;
  totalLessons: number;
  doneLessons: number;
}

export interface TestInput {
  testId: string;
  requiredPercentage: number;
  prerequisiteTestId?: string;
  /** Попытки пользователя; пусто — тест не проходили. */
  attempts: { percentage: number; at: Date }[];
}

export interface NoteInput {
  /** courseId::periodId — к какому занятию конспект; null у заметок вне занятий. */
  lessonKey: string | null;
  isLecture: boolean;
  shared: boolean;
  at: Date | null;
}

export interface AchievementInput {
  set: AchievementSet;
  accessibleCourseIds: string[];
  courses: CourseProgressInput[];
  watchedVideos: number;
  tests: TestInput[];
  notes: NoteInput[];
  questionDates: Date[];
  foundNotFound: boolean;
}

export interface AchievementProgress {
  done: number;
  total: number;
  unit?: string;
}

export const formatProgress = (p: AchievementProgress) => `${p.done} / ${p.total}${p.unit ?? ''}`;

export interface AchievementState {
  def: AchievementDef;
  status: 'got' | 'locked' | 'soon';
  progress?: AchievementProgress;
  earnedAt?: Date;
}

export interface AchievementsResult {
  items: AchievementState[];
  gotCount: number;
  xp: number;
  level: number;
  xpIntoLevel: number;
  latest: AchievementState | null;
  nearest: AchievementState[];
}

type Eval = { got: boolean; progress?: AchievementProgress; earnedAt?: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

const minDate = (dates: Date[]): Date | undefined =>
  dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : undefined;

/** Дата, когда набралось n-е событие (даты по возрастанию). */
const nthDate = (sorted: Date[], n: number): Date | undefined => sorted[n - 1];

const sortDates = (dates: Date[]) => [...dates].sort((a, b) => a.getTime() - b.getTime());

const count = (done: number, total: number, unit?: string): Eval => ({
  got: total > 0 && done >= total,
  progress: { done: Math.min(done, total), total, unit },
});

/** Номер недели (с понедельника) в локальном времени пользователя. */
function weekIndex(date: Date): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayShift = (local.getDay() + 6) % 7;
  return Math.round((local.getTime() - mondayShift * DAY_MS) / (7 * DAY_MS));
}

export function longestWeekStreak(dates: Date[]): number {
  const weeks = [...new Set(dates.map(weekIndex))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  weeks.forEach((week, i) => {
    run = i > 0 && week === weeks[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export function hasLongBreak(dates: Date[], days = 30): boolean {
  const sorted = sortDates(dates);
  return sorted.some((d, i) => i > 0 && d.getTime() - sorted[i - 1].getTime() > days * DAY_MS);
}

function testStats(tests: TestInput[]) {
  const passedFirst: Date[] = [];
  const perfectFirst: Date[] = [];
  const passedIds = new Set<string>();
  let improvedAt: Date | undefined;

  tests.forEach((test) => {
    const attempts = [...test.attempts].sort((a, b) => a.at.getTime() - b.at.getTime());
    const pass = attempts.find((a) => a.percentage >= test.requiredPercentage);
    if (pass) {
      passedFirst.push(pass.at);
      passedIds.add(test.testId);
    }
    const perfect = attempts.find((a) => a.percentage >= 100);
    if (perfect) perfectFirst.push(perfect.at);
    const improved = attempts.find((a, i) => i > 0 && a.percentage > attempts[i - 1].percentage);
    if (improved && (!improvedAt || improved.at < improvedAt)) improvedAt = improved.at;
  });

  // Цепочки уровней: идём от последнего уровня (на него никто не ссылается) к первому.
  const byId = new Map(tests.map((t) => [t.testId, t]));
  const hasNext = new Set(tests.map((t) => t.prerequisiteTestId).filter(Boolean));
  let bestChain: AchievementProgress = { done: 0, total: 3, unit: ' ур.' };
  let chainDone = false;
  tests
    .filter((t) => t.prerequisiteTestId && !hasNext.has(t.testId))
    .forEach((leaf) => {
      const chain: TestInput[] = [];
      for (let cur: TestInput | undefined = leaf; cur && chain.length < 10; cur = byId.get(cur.prerequisiteTestId ?? '')) {
        chain.push(cur);
      }
      const done = chain.filter((t) => passedIds.has(t.testId)).length;
      if (done === chain.length) chainDone = true;
      if (done / chain.length > bestChain.done / bestChain.total) {
        bestChain = { done, total: chain.length, unit: ' ур.' };
      }
    });

  return {
    passed: sortDates(passedFirst),
    perfect: sortDates(perfectFirst),
    improvedAt,
    chain: bestChain,
    chainDone,
  };
}

function courseUnitProgress(courseIds: string[], input: AchievementInput): CourseProgressInput | null {
  const accessible = new Set(input.accessibleCourseIds);
  const candidates = input.courses.filter((c) => courseIds.includes(c.id) && accessible.has(c.id) && c.totalLessons > 0);
  if (!candidates.length) return null;
  return candidates.reduce((best, c) =>
    c.doneLessons / c.totalLessons > best.doneLessons / best.totalLessons ? c : best
  );
}

/**
 * Набор: «Программа» — в потоке (несистемная группа с 2+ курсами переподготовки),
 * «Курс» — есть доступ к закрытому курсу, иначе «Старт».
 */
export function resolveAchievementSet(params: {
  groups: { isSystem?: boolean; grantedCourses?: string[] }[];
  accessibleCourseIds: string[];
  openCourseIds: Set<string>;
}): AchievementSet {
  const inStream = params.groups.some(
    (g) => !g.isSystem && (g.grantedCourses ?? []).filter((id) => PROGRAM_COURSE_IDS.has(id)).length >= 2
  );
  if (inStream) return 'P';
  return params.accessibleCourseIds.some((id) => !params.openCourseIds.has(id)) ? 'K' : 'S';
}

function isVisible(def: AchievementDef, input: AchievementInput): boolean {
  if (!def.sets.includes(input.set)) return false;
  if (!def.courseIds) return true;
  const accessible = new Set(input.accessibleCourseIds);
  return def.courseIds.some((id) => accessible.has(id));
}

export function computeAchievements(input: AchievementInput): AchievementsResult {
  const accessible = new Set(input.accessibleCourseIds);
  const lessonsDone = input.courses
    .filter((c) => accessible.has(c.id))
    .reduce((sum, c) => sum + Math.min(c.doneLessons, c.totalLessons), 0);
  const coursesDone = input.courses.filter(
    (c) => accessible.has(c.id) && c.totalLessons > 0 && c.doneLessons >= c.totalLessons
  ).length;

  const programUnits = PROGRAM_COURSE_UNITS.map((ids) => courseUnitProgress(ids, input)).filter(
    (u): u is CourseProgressInput => u !== null
  );
  const programUnitsDone = programUnits.filter((u) => u.doneLessons >= u.totalLessons).length;
  const programLessons = programUnits.reduce(
    (acc, u) => ({ done: acc.done + Math.min(u.doneLessons, u.totalLessons), total: acc.total + u.totalLessons }),
    { done: 0, total: 0 }
  );

  const tests = testStats(input.tests);

  const lectureNotes = input.notes.filter((n) => n.isLecture);
  const noteLessonFirst = new Map<string, Date | null>();
  input.notes.forEach((n) => {
    if (!n.lessonKey) return;
    const prev = noteLessonFirst.get(n.lessonKey);
    if (prev === undefined || (n.at && (!prev || n.at < prev))) noteLessonFirst.set(n.lessonKey, n.at);
  });
  const noteLessonDates = sortDates([...noteLessonFirst.values()].filter((d): d is Date => d !== null));
  const questions = sortDates(input.questionDates);

  const activity = [
    ...input.tests.flatMap((t) => t.attempts.map((a) => a.at)),
    ...input.notes.map((n) => n.at).filter((d): d is Date => d !== null),
    ...input.questionDates,
  ];
  const nights = sortDates(activity.filter((d) => d.getHours() < 5));
  const mornings = sortDates(activity.filter((d) => d.getHours() >= 5 && d.getHours() < 8));
  const streak = longestWeekStreak(activity);

  const evaluators: Record<string, () => Eval> = {
    'first-lecture': () => ({ got: input.watchedVideos > 0 || lessonsDone > 0 }),
    'lessons-3': () => count(lessonsDone, 3, ' зан.'),
    'lessons-10': () => count(lessonsDone, 10, ' зан.'),
    'three-courses': () => count(programUnitsDone, 3, ' курс.'),
    equator: () => ({
      got: programLessons.total > 0 && programLessons.done * 2 >= programLessons.total,
      progress: { done: programLessons.done, total: Math.ceil(programLessons.total / 2), unit: ' зан.' },
    }),
    'seen-all': () => count(programUnitsDone, programUnits.length, ' курс.'),
    'first-test': () => ({ got: tests.passed.length > 0, earnedAt: tests.passed[0] }),
    bullseye: () => ({ got: tests.perfect.length > 0, earnedAt: tests.perfect[0] }),
    'tests-10': () => ({ ...count(tests.passed.length, 10), earnedAt: nthDate(tests.passed, 10) }),
    'no-mistakes': () => ({ ...count(tests.perfect.length, 5), earnedAt: nthDate(tests.perfect, 5) }),
    'mistakes-work': () => ({ got: Boolean(tests.improvedAt), earnedAt: tests.improvedAt }),
    'deep-dive': () => ({ got: tests.chainDone, progress: tests.chain }),
    'first-note': () => ({ got: lectureNotes.length > 0, earnedAt: minDate(lectureNotes.map((n) => n.at).filter((d): d is Date => d !== null)) }),
    'notes-5': () => ({ ...count(noteLessonFirst.size, 5, ' зан.'), earnedAt: nthDate(noteLessonDates, 5) }),
    generosity: () => ({ got: input.notes.some((n) => n.shared) }),
    'first-question': () => ({ got: questions.length > 0, earnedAt: questions[0] }),
    'slow-steady': () => count(streak, 5, ' нед.'),
    'night-shift': () => ({ got: nights.length > 0, earnedAt: nights[0] }),
    'early-bird': () => ({ got: mornings.length > 0, earnedAt: mornings[0] }),
    'not-here': () => ({ got: input.foundNotFound }),
    why: () => ({ ...count(questions.length, 5), earnedAt: nthDate(questions, 5) }),
    'owl-lark': () => ({ got: nights.length > 0 && mornings.length > 0 }),
    'welcome-back': () => ({ got: hasLongBreak(activity) }),
  };

  const items: AchievementState[] = ACHIEVEMENTS.filter((def) => isVisible(def, input)).map((def) => {
    if (def.soon) return { def, status: 'soon' };
    let result: Eval;
    if (def.courseIds) {
      const unit = courseUnitProgress(def.courseIds, input);
      result = unit ? count(unit.doneLessons, unit.totalLessons, ' зан.') : { got: false };
    } else {
      result = evaluators[def.id]?.() ?? { got: false };
    }
    return {
      def,
      status: result.got ? 'got' : 'locked',
      progress: result.got ? undefined : result.progress,
      earnedAt: result.got ? result.earnedAt : undefined,
    };
  });

  const xp =
    lessonsDone * 20 +
    tests.passed.length * 20 +
    tests.perfect.length * 10 +
    noteLessonFirst.size * 15 +
    questions.length * 10 +
    coursesDone * 200;

  const got = items.filter((i) => i.status === 'got');
  const dated = got.filter((i) => i.earnedAt).sort((a, b) => b.earnedAt!.getTime() - a.earnedAt!.getTime());
  const nearest = items
    .filter((i) => i.status === 'locked' && !i.def.secret && i.progress && i.progress.done > 0)
    .sort((a, b) => b.progress!.done / b.progress!.total - a.progress!.done / a.progress!.total)
    .slice(0, 3);

  return {
    items,
    gotCount: got.length,
    xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    xpIntoLevel: xp % XP_PER_LEVEL,
    latest: dated[0] ?? got[got.length - 1] ?? null,
    nearest,
  };
}

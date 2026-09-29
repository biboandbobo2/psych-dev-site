import type { CloudVideoStat } from '../../../lib/courseProgress/types';
import { normalizeLessonId, type MemberProgress } from './courseProgress';
import type { CourseLessonVideos } from './useCourseLessonVideos';

/** Главная лекция занятия: просмотрена на сайте (60%+), открыта на YouTube или нет. */
export type MainLectureState = 'watched' | 'opened' | 'none';

export interface LessonSquare {
  lessonId: string;
  title: string;
  hasVideo: boolean;
  main: MainLectureState;
  /** Сколько дополнительных видео занятия просмотрено или открыто на YouTube. */
  extraSeen: number;
  extraTotal: number;
}

export interface StudentViews {
  squares: LessonSquare[];
  /** Занятия с просмотренной главной лекцией. */
  mainWatched: number;
  /** Занятия, где главная лекция не досмотрена на сайте, но открыта на YouTube. */
  mainOpened: number;
  /** Все основные видео курса, просмотренные на сайте. */
  videosWatched: number;
  videosTotal: number;
}

type Progress = Pick<MemberProgress, 'watchedLessonIds' | 'videoStats'>;

function statOf(
  progress: Progress | undefined,
  lessonId: string,
  videoKey: string
): CloudVideoStat | undefined {
  const lessonStats = progress?.videoStats?.[lessonId];
  if (!lessonStats || typeof lessonStats !== 'object') return undefined;
  const stat = lessonStats[videoKey];
  return stat && typeof stat === 'object' ? stat : undefined;
}

/**
 * Квадратик на занятие и сводные дроби. Старые отметки занятия (до учёта по
 * видео) считаются просмотром главной лекции.
 */
export function buildStudentViews(
  lessons: CourseLessonVideos[],
  progress: Progress | undefined
): StudentViews {
  const views: StudentViews = {
    squares: [],
    mainWatched: 0,
    mainOpened: 0,
    videosWatched: 0,
    videosTotal: 0,
  };

  for (const lesson of lessons) {
    const [mainKey, ...extraKeys] = lesson.videoKeys;
    const mainStat = mainKey ? statOf(progress, lesson.id, mainKey) : undefined;
    const mainWatched =
      progress?.watchedLessonIds.has(normalizeLessonId(lesson.id)) === true ||
      mainStat?.watched === true;
    const main: MainLectureState = mainWatched
      ? 'watched'
      : mainStat?.openedExternally === true
        ? 'opened'
        : 'none';

    const extraStats = extraKeys.map((key) => statOf(progress, lesson.id, key));
    const extraSeen = extraStats.filter(
      (stat) => stat?.watched === true || stat?.openedExternally === true
    ).length;

    views.squares.push({
      lessonId: lesson.id,
      title: lesson.title,
      hasVideo: lesson.videoKeys.length > 0,
      main,
      extraSeen,
      extraTotal: extraKeys.length,
    });
    if (main === 'watched') views.mainWatched += 1;
    if (main === 'opened') views.mainOpened += 1;
    views.videosTotal += lesson.videoKeys.length;
    views.videosWatched +=
      (mainKey && mainWatched ? 1 : 0) +
      extraStats.filter((stat) => stat?.watched === true).length;
  }

  return views;
}

const MAIN_LABEL: Record<MainLectureState, string> = {
  watched: 'главная лекция просмотрена',
  opened: 'главная лекция открыта на YouTube',
  none: 'главная лекция не просмотрена',
};

/** Подсказка квадратика: «3. Младенчество — главная лекция просмотрена; доп. видео: 1 из 2». */
export function lessonSquareTitle(square: LessonSquare, index: number): string {
  const head = `${index + 1}. ${square.title}`;
  if (!square.hasVideo) return `${head} — в занятии нет видео`;
  const extra =
    square.extraTotal > 0 ? `; доп. видео: ${square.extraSeen} из ${square.extraTotal}` : '';
  return `${head} — ${MAIN_LABEL[square.main]}${extra}`;
}

/** «Лекции 7/15 · YouTube 2 · Все видео 12/31 (39%)»; YouTube — только если было. */
export function studentViewsSummary(views: StudentViews): string {
  const lessonsTotal = views.squares.length;
  const parts = [`Лекции ${views.mainWatched}/${lessonsTotal}`];
  if (views.mainOpened > 0) parts.push(`YouTube ${views.mainOpened}`);
  if (views.videosTotal > 0) {
    const percent = Math.round((views.videosWatched / views.videosTotal) * 100);
    parts.push(`Все видео ${views.videosWatched}/${views.videosTotal} (${percent}%)`);
  }
  return parts.join(' · ');
}

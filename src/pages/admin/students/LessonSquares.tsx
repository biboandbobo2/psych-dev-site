import {
  lessonSquareTitle,
  studentViewsSummary,
  type MainLectureState,
  type StudentViews,
} from './studentViews';

const SQUARE_TONE: Record<MainLectureState, string> = {
  watched: 'bg-accent text-white',
  opened: 'bg-amber-300 text-amber-900',
  none: 'bg-pastel-plain text-ink-soft',
};

const SQUARE_BASE =
  'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold leading-none';

/**
 * Квадратик на каждое занятие курса: цвет — главная лекция, цифра — сколько
 * дополнительных видео занятия посмотрено или открыто. Под ними — дроби.
 */
export function LessonSquares({ views }: { views: StudentViews }) {
  const summary = studentViewsSummary(views);
  const isEmpty = views.mainWatched === 0 && views.mainOpened === 0 && views.videosWatched === 0;

  return (
    <div className="space-y-1.5">
      <div role="img" aria-label={summary} className="flex flex-wrap gap-1">
        {views.squares.map((square, index) => (
          <span
            key={square.lessonId}
            title={lessonSquareTitle(square, index)}
            className={`${SQUARE_BASE} ${
              square.hasVideo ? SQUARE_TONE[square.main] : 'border border-dashed border-border'
            }`}
          >
            {square.extraSeen > 0 ? square.extraSeen : null}
          </span>
        ))}
      </div>
      <p className={`text-xs ${isEmpty ? 'text-muted' : 'text-ink-soft'}`}>{summary}</p>
    </div>
  );
}

function LegendItem({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`h-3 w-3 rounded-[3px] ${tone}`} />
      {label}
    </span>
  );
}

export function LessonSquaresLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span>Квадратик — занятие:</span>
      <LegendItem tone="bg-accent" label="главная лекция просмотрена (60%+)" />
      <LegendItem tone="bg-amber-300" label="открыта на YouTube" />
      <LegendItem tone="bg-pastel-plain" label="не смотрели" />
      <span>цифра — сколько доп. видео занятия посмотрено</span>
    </p>
  );
}

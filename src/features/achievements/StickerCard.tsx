import { achievementImage } from './catalog';
import { formatProgress, type AchievementProgress, type AchievementState } from './compute';

export function ProgressBar({ progress, className = '' }: { progress: AchievementProgress; className?: string }) {
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-border ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.done}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function StickerCard({ item }: { item: AchievementState }) {
  const { def, status, progress } = item;
  const got = status === 'got';
  const hidden = def.secret && !got;
  const name = hidden ? 'Секретная наклейка' : def.name;
  const condition = hidden ? 'Условие откроется, когда получите' : def.condition;

  return (
    <div
      className={`group flex h-full flex-col gap-1 rounded-2xl border border-border p-3 ${
        got ? 'bg-card' : 'bg-bg'
      }`}
    >
      <div className="relative mb-1.5 flex justify-center">
        <img
          src={achievementImage(hidden ? 'secret' : def.id)}
          alt={`Наклейка «${name}»`}
          loading="lazy"
          className={`h-28 w-full object-contain transition-transform sm:h-36 duration-200 ${
            got ? 'group-hover:-rotate-3 group-hover:scale-105' : 'opacity-[0.35] grayscale'
          }`}
        />
        {def.secret && got && (
          <span className="absolute left-0 top-0 rounded-md bg-pastel-lilac px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
            секретная
          </span>
        )}
      </div>
      <b className={`text-[13.5px] font-semibold leading-snug ${got ? 'text-fg' : 'text-gray-600'}`}>{name}</b>
      <small className="text-[11.5px] leading-snug text-muted">{condition}</small>
      <div className="mt-auto pt-1.5">
        {status === 'soon' && (
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-accent-muted">скоро</span>
        )}
        {got && (
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-accent-muted">Получена ✓</span>
        )}
        {status === 'locked' && !hidden && progress && (
          <>
            <ProgressBar progress={progress} />
            <span className="text-[11px] tabular-nums text-muted">{formatProgress(progress)}</span>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ACHIEVEMENT_BLOCKS, XP_PER_LEVEL, XP_RULES, achievementImage, type AchievementSet } from './catalog';
import { formatProgress, type AchievementState, type AchievementsResult } from './compute';
import { ProgressBar, StickerCard } from './StickerCard';
import { useAchievements } from './useAchievements';

type Filter = 'all' | 'got' | 'locked';

const SET_LABELS: Record<AchievementSet, string> = {
  P: 'Программа: вы учитесь в потоке переподготовки',
  K: 'Курс: наклейки за ваши курсы',
  S: 'Старт: наклейки за открытые курсы',
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'got', label: 'Полученные' },
  { key: 'locked', label: 'Ещё впереди' },
];

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

function LevelCard({ result, firstName }: { result: AchievementsResult; firstName: string }) {
  return (
    <section aria-label="Уровень" className="grid gap-x-6 gap-y-2.5 rounded-[22px] bg-pastel-sage px-6 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-muted">{firstName}</span>
        <h2 className="font-display text-3xl text-ink">Уровень {result.level}</h2>
      </div>
      <div className="flex items-end gap-1">
        <b className="font-display text-3xl text-ink">{result.gotCount}</b>
        <span className="pb-1 text-sm text-muted">/ {result.items.length} наклеек</span>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <ProgressBar progress={{ done: result.xpIntoLevel, total: XP_PER_LEVEL }} className="h-2.5 bg-white/70" />
        <div className="flex justify-between gap-3 text-[12.5px] font-semibold tabular-nums text-accent-muted">
          <span>{result.xp} XP</span>
          <span>До уровня {result.level + 1} — {XP_PER_LEVEL - result.xpIntoLevel} XP</span>
        </div>
      </div>
    </section>
  );
}

function LatestCard({ item }: { item: AchievementState | null }) {
  if (!item) {
    return (
      <section className="mt-5 rounded-[22px] border border-border bg-card px-6 py-5 text-sm text-muted">
        Первая наклейка уже близко: посмотрите лекцию или пройдите тест.
      </section>
    );
  }
  return (
    <section aria-label="Последняя наклейка" className="mt-5 grid items-center gap-5 rounded-[22px] border border-border bg-card px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <img src={achievementImage(item.def.id)} alt={`Наклейка «${item.def.name}»`} className="mx-auto max-h-44 w-full object-contain" />
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-muted">Новая наклейка</span>
        <h3 className="mb-1 mt-1.5 font-display text-2xl text-ink">{item.def.name}</h3>
        <p className="text-[13.5px] text-muted">{item.def.condition}</p>
        {item.earnedAt && (
          <span className="mt-2.5 inline-block rounded-lg bg-mark px-2.5 py-0.5 text-xs font-semibold">
            Получена {dateFormatter.format(item.earnedAt)}
          </span>
        )}
      </div>
    </section>
  );
}

function Aside({ nearest }: { nearest: AchievementState[] }) {
  return (
    <aside className="flex flex-col gap-4" aria-label="Ближайшие достижения">
      {nearest.length > 0 && (
        <div className="rounded-[22px] border border-border bg-card p-5">
          <h4 className="mb-3 text-lg font-semibold text-fg">Ближе всего</h4>
          <div className="flex flex-col gap-3">
            {nearest.map((item) => (
              <div key={item.def.id}>
                <b className="block text-[13.5px] font-semibold">{item.def.name}</b>
                <small className="text-xs text-muted">{item.def.condition}</small>
                <div className="mt-1.5 flex items-center gap-2.5 text-[11.5px] tabular-nums text-muted">
                  <ProgressBar progress={item.progress!} className="flex-1" />
                  {formatProgress(item.progress!)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-[22px] border border-border bg-card p-5">
        <h4 className="mb-3 text-lg font-semibold text-fg">Как начисляется XP</h4>
        <div className="flex flex-col gap-1.5 text-[12.5px]">
          {XP_RULES.map((rule) => (
            <div key={rule.key} className="flex justify-between">
              <span>{rule.label}</span>
              <b>+{rule.xp}</b>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Каждые {XP_PER_LEVEL} XP — новый уровень. Повторные просмотры XP не приносят.</p>
      </div>
    </aside>
  );
}

function Album({ items }: { items: AchievementState[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const matches = (item: AchievementState) =>
    filter === 'all' || (filter === 'got') === (item.status === 'got');

  const blocks = ACHIEVEMENT_BLOCKS.map((block) => {
    const all = items.filter((i) => i.def.block === block.key);
    return { block, all, list: all.filter(matches) };
  }).filter(({ list }) => list.length > 0);

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-ink">Альбом наклеек</h2>
        <span className="text-xs text-muted">Полученные — в цвете, остальные пока ждут своего часа</span>
      </div>
      <div className="mb-2 flex gap-2" role="group" aria-label="Фильтр альбома">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
              filter === f.key ? 'border-fg bg-fg text-white' : 'border-border bg-card text-fg hover:border-fg'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {blocks.length === 0 && <p className="py-5 text-sm text-muted">Здесь пока пусто.</p>}
      {blocks.map(({ block, all, list }) => (
        <details key={block.key} open className="group/blk border-t border-border last:border-b">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-1 py-4 [&::-webkit-details-marker]:hidden">
            <h3 className="flex-1 text-base font-bold text-fg">{block.title}</h3>
            <span className="text-[12.5px] tabular-nums text-muted">
              {all.filter((i) => i.status === 'got').length} из {all.length}
            </span>
            <span aria-hidden className="mx-1.5 text-muted transition-transform group-open/blk:rotate-180">⌄</span>
          </summary>
          {block.description && <p className="-mt-1.5 mb-3 max-w-[70ch] px-1 text-[12.5px] text-muted">{block.description}</p>}
          <div className="grid grid-cols-2 gap-3 pb-5 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((item) => (
              <StickerCard key={item.def.id} item={item} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function AchievementsSection({ firstName }: { firstName: string }) {
  const { result, set, loading } = useAchievements();

  if (loading || !result) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <div className="h-32 animate-pulse rounded-[22px] bg-pastel-sage" />
        <div className="h-48 animate-pulse rounded-[22px] bg-card" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-5 inline-block rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted">
        Ваш набор — {SET_LABELS[set]}
      </p>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div>
          <LevelCard result={result} firstName={firstName} />
          <LatestCard item={result.latest} />
        </div>
        <Aside nearest={result.nearest} />
      </div>
      <Album items={result.items} />
    </div>
  );
}

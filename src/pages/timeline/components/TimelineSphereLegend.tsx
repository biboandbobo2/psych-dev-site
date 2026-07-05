import { useMemo } from 'react';
import { SPHERE_META } from '../constants';
import type { NodeT, Sphere } from '../types';

interface TimelineSphereLegendProps {
  nodes: NodeT[];
  activeSphere: Sphere | null;
  onChange: (sphere: Sphere | null) => void;
}

/**
 * Компактный список сфер жизни для левой панели: цвет + эмодзи +
 * количество. Клик подсвечивает только эту сферу на холсте (остальные
 * приглушаются), повторный клик или «Показать все» — сброс.
 */
export function TimelineSphereLegend({ nodes, activeSphere, onChange }: TimelineSphereLegendProps) {
  const counts = useMemo(() => {
    const bySphere = new Map<Sphere, number>();
    for (const node of nodes) {
      if (!node.sphere) continue;
      bySphere.set(node.sphere, (bySphere.get(node.sphere) ?? 0) + 1);
    }
    return bySphere;
  }, [nodes]);

  if (counts.size === 0) return null;

  return (
    <div className="mt-2 space-y-1 border-t border-slate-200 pt-2" role="group" aria-label="Фильтр по сферам жизни">
      {(Object.keys(SPHERE_META) as Sphere[]).map((sphere) => {
        const count = counts.get(sphere);
        if (!count) return null;
        const meta = SPHERE_META[sphere];
        const isActive = activeSphere === sphere;
        return (
          <button
            key={sphere}
            type="button"
            title={
              isActive
                ? `${meta.label}: показать все сферы`
                : `${meta.label}: показать только эту сферу`
            }
            onClick={() => onChange(isActive ? null : sphere)}
            className={`flex w-full items-center justify-between rounded-lg px-1.5 py-1 text-xs transition ${
              isActive
                ? 'bg-slate-800 font-semibold text-white'
                : activeSphere !== null
                ? 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
              <span>{meta.emoji}</span>
            </span>
            <span className={isActive ? 'text-slate-200' : 'font-semibold text-slate-900'}>{count}</span>
          </button>
        );
      })}
      {activeSphere !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="w-full rounded-lg bg-slate-50 px-1.5 py-1 text-center text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Показать все
        </button>
      )}
    </div>
  );
}

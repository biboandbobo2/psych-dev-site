import { useMemo } from 'react';
import { SPHERE_META } from '../constants';
import type { NodeT, Sphere } from '../types';

interface TimelineSphereLegendProps {
  nodes: NodeT[];
  activeSphere: Sphere | null;
  onChange: (sphere: Sphere | null) => void;
}

/**
 * Легенда сфер жизни внизу холста. Клик по сфере подсвечивает только её
 * события (остальные приглушаются на холсте), повторный клик или «Все» —
 * сброс. Показываются только сферы, у которых есть события.
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
    <div
      className="fixed bottom-4 left-1/2 z-30 flex max-w-[70vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur"
      style={{ fontFamily: 'Georgia, serif' }}
      role="group"
      aria-label="Фильтр по сферам жизни"
    >
      {activeSphere !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Все
        </button>
      )}
      {(Object.keys(SPHERE_META) as Sphere[]).map((sphere) => {
        const count = counts.get(sphere);
        if (!count) return null;
        const meta = SPHERE_META[sphere];
        const isActive = activeSphere === sphere;
        return (
          <button
            key={sphere}
            type="button"
            title={`${meta.label}: показать только эту сферу`}
            onClick={() => onChange(isActive ? null : sphere)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition ${
              isActive
                ? 'border-slate-400 bg-slate-800 font-semibold text-white'
                : activeSphere !== null
                ? 'border-slate-200 bg-white text-slate-400 hover:text-slate-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span
              className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            <span>{meta.emoji}</span>
            <span className="hidden sm:inline">{meta.label}</span>
            <span className={isActive ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

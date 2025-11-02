import type { Periodization } from '../types';
import { YEAR_PX } from '../constants';

interface PeriodizationLayerProps {
  periodization: Periodization | null;
  ageMax: number; // Максимальный возраст для расчёта высоты холста
  worldHeight: number; // Высота мирового пространства холста
  canvasWidth: number; // Ширина холста
  onBoundaryClick?: (periodIndex: number) => void; // Клик на границу между периодами
}

/**
 * Компонент визуализации периодизации развития на холсте
 * Рендерит горизонтальные полосы с очень ненасыщенными пастельными цветами
 * и тонкие линии между периодами
 */
export function PeriodizationLayer({
  periodization,
  ageMax,
  worldHeight,
  canvasWidth,
  onBoundaryClick
}: PeriodizationLayerProps) {
  if (!periodization) return null;

  return (
    <g className="periodization-layer">
      {/* Сначала все прямоугольники периодов */}
      {periodization.periods.map((period, index) => {
        const startY = worldHeight - Math.min(period.endAge, ageMax) * YEAR_PX;
        const endY = worldHeight - period.startAge * YEAR_PX;
        const height = endY - startY;

        if (height <= 0) return null;

        return (
          <rect
            key={`period-rect-${index}`}
            x={0}
            y={startY}
            width={canvasWidth}
            height={height}
            fill={period.color}
            className="transition-opacity"
          />
        );
      })}

      {/* Затем все линии границ сверху (чтобы не перекрывались прямоугольниками) */}
      {periodization.periods.map((period, index) => {
        if (index >= periodization.periods.length - 1) return null;

        const startY = worldHeight - Math.min(period.endAge, ageMax) * YEAR_PX;

        return (
          <g key={`period-boundary-${index}`}>
            {/* Видимая линия */}
            <line
              x1={0}
              y1={startY}
              x2={canvasWidth}
              y2={startY}
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="8 4"
              opacity={0.8}
              className="pointer-events-none"
            />

            {/* Увеличенная область клика (для удобства) */}
            <rect
              x={0}
              y={startY - 30}
              width={canvasWidth}
              height={60}
              fill="transparent"
              className="cursor-pointer transition-opacity hover:fill-slate-300 hover:opacity-30"
              onClick={() => onBoundaryClick?.(index)}
              data-period-index={index}
              data-period-name={period.name}
              data-next-period-name={periodization.periods[index + 1]?.name}
            >
              <title>
                Переход: {period.name} → {periodization.periods[index + 1]?.name}
              </title>
            </rect>
          </g>
        );
      })}
    </g>
  );
}

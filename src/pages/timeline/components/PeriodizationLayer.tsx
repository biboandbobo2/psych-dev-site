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
          <g key={`period-rect-${index}`}>
            <rect
              x={0}
              y={startY}
              width={canvasWidth}
              height={height}
              fill={period.color}
              opacity={0.55}
              className="transition-opacity"
            />
            {/* Название периода вдоль левого края полосы — «география»
                жизни видна без клика по границе. */}
            {height >= 60 && (
              <text
                x={40}
                y={startY + Math.min(height / 2 + 14, height - 16)}
                fontSize={34}
                fontStyle="italic"
                fill="#64748b"
                opacity={0.75}
                fontFamily="Georgia, serif"
                pointerEvents="none"
              >
                {period.name}
              </text>
            )}
          </g>
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
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="8 6"
              opacity={0.6}
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

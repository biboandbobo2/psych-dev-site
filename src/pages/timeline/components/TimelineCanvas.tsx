import { memo, useMemo, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import type { NodeT, EdgeT, Transform } from '../types';
import { PeriodizationLayer } from './PeriodizationLayer';
import { getPeriodizationById } from '../data/periodizations';
import {
  YEAR_PX,
  LINE_X_POSITION,
  SPHERE_META,
  BASE_NODE_RADIUS,
  MIN_NODE_RADIUS,
  MAX_NODE_RADIUS,
} from '../constants';
import { clamp } from '../utils';
import { EVENT_ICON_MAP } from '../../../data/eventIcons';

interface TimelineCanvasProps {
  svgRef: RefObject<SVGSVGElement>;
  transform: Transform;
  onWheel: (e: WheelEvent<SVGSVGElement>) => void;
  onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDragStart: (event: PointerEvent, nodeId: string) => void;
  onPeriodBoundaryClick: (periodIndex: number) => void;
  onSelectBranch: (x: number) => void;
  onClearSelection: () => void;
  onSelectBirth: () => void;
  worldWidth: number;
  worldHeight: number;
  ageMax: number;
  currentAge: number;
  nodes: NodeT[];
  edges: EdgeT[];
  selectedPeriodization: string | null;
  selectedId: string | null;
  selectedBranchX: number | null;
  draggingNodeId: string | null;
  birthSelected: boolean;
  birthBaseYear: number | null;
  formattedCurrentAge: string;
  currentYearLabel: number | null;
  cursorClass: string;
}

export const TimelineCanvas = memo(function TimelineCanvas(props: TimelineCanvasProps) {
  const {
    svgRef,
    transform,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onNodeClick,
    onNodeDragStart,
    onPeriodBoundaryClick,
    onSelectBranch,
    onClearSelection,
    onSelectBirth,
    worldWidth,
    worldHeight,
    ageMax,
    currentAge,
    nodes,
    edges,
    selectedPeriodization,
    selectedId,
    selectedBranchX,
    draggingNodeId,
    birthSelected,
    birthBaseYear,
    formattedCurrentAge,
    currentYearLabel,
    cursorClass,
  } = props;

  // Мемоизация вычислений для предотвращения лишних ре-рендеров
  const adaptiveRadius = useMemo(
    () => clamp(BASE_NODE_RADIUS / transform.k, MIN_NODE_RADIUS, MAX_NODE_RADIUS),
    [transform.k]
  );

  const periodization = useMemo(
    () => (selectedPeriodization ? getPeriodizationById(selectedPeriodization) ?? null : null),
    [selectedPeriodization]
  );

  // Мемоизация меток возраста — пересчитываются только при изменении ageMax
  const ageLabels = useMemo(
    () => Array.from({ length: Math.floor(ageMax / 5) + 1 }, (_, i) => i * 5),
    [ageMax]
  );

  // Мемоизация валидных рёбер — фильтрация только при изменении edges
  const validEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          typeof edge.x === 'number' &&
          typeof edge.startAge === 'number' &&
          typeof edge.endAge === 'number' &&
          !isNaN(edge.x) &&
          !isNaN(edge.startAge) &&
          !isNaN(edge.endAge)
      ),
    [edges]
  );

  // Мемоизация валидных узлов — фильтрация только при изменении nodes
  const validNodes = useMemo(
    () => nodes.filter((node) => typeof node.age === 'number' && !isNaN(node.age)),
    [nodes]
  );

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className={`w-full h-full ${cursorClass}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        data-world-width={worldWidth}
        data-world-height={worldHeight}
      >
        <g data-export-root="true" transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          <rect x={0} y={-100} width={worldWidth} height={worldHeight + 200} fill="#ffffff" />

          <PeriodizationLayer
            periodization={periodization}
            ageMax={ageMax}
            worldHeight={worldHeight}
            canvasWidth={worldWidth}
            onBoundaryClick={onPeriodBoundaryClick}
          />

          {ageLabels.map((age) => {
            const rightLabel = birthBaseYear !== null ? `${birthBaseYear + age}` : null;
            return (
              <g key={age}>
                <line
                  x1={0}
                  y1={worldHeight - age * YEAR_PX}
                  x2={worldWidth}
                  y2={worldHeight - age * YEAR_PX}
                  stroke="#e2e8f0"
                  strokeWidth={age % 10 === 0 ? 2 : 1}
                />
                <text
                  x={LINE_X_POSITION - 35}
                  y={worldHeight - age * YEAR_PX + 5}
                  fontSize={42}
                  textAnchor="end"
                  fill="#475569"
                  fontWeight="500"
                  fontFamily="Georgia, serif"
                >
                  {age}
                </text>
                {rightLabel && (
                  <text
                    x={LINE_X_POSITION + 35}
                    y={worldHeight - age * YEAR_PX + 5}
                    fontSize={42}
                    textAnchor="start"
                    fill="#475569"
                    fontWeight="500"
                    fontFamily="Georgia, serif"
                  >
                    {rightLabel}
                  </text>
                )}
              </g>
            );
          })}

          <line
            x1={LINE_X_POSITION}
            y1={worldHeight}
            x2={LINE_X_POSITION}
            y2={worldHeight - currentAge * YEAR_PX}
            stroke="#93c5fd"
            strokeWidth={selectedBranchX === null ? 16 : 11}
            strokeLinecap="round"
            onClick={(e) => {
              e.stopPropagation();
              onClearSelection();
            }}
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
          />

          <line
            x1={LINE_X_POSITION}
            y1={worldHeight - currentAge * YEAR_PX}
            x2={LINE_X_POSITION}
            y2={worldHeight - ageMax * YEAR_PX}
            stroke="#cbd5e1"
            strokeWidth={selectedBranchX === null ? 16 : 11}
            strokeLinecap="round"
            strokeDasharray="10 5"
            onClick={(e) => {
              e.stopPropagation();
              onClearSelection();
            }}
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
          />

          <g
            onClick={(e) => {
              e.stopPropagation();
              onSelectBirth();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={LINE_X_POSITION}
              cy={worldHeight}
              r={adaptiveRadius * 0.8}
              fill="#ffffff"
              stroke={birthSelected ? '#38bdf8' : '#0f172a'}
              strokeWidth={birthSelected ? 5 : 3}
            />
            <text
              x={LINE_X_POSITION}
              y={worldHeight + adaptiveRadius * 1.8}
              fontSize={16}
              textAnchor="middle"
              fontWeight={birthSelected ? '700' : '600'}
              fill={birthSelected ? '#0ea5e9' : '#0f172a'}
              fontFamily="Georgia, serif"
            >
              👶 Рождение
            </text>
          </g>

          <g>
            <circle cx={LINE_X_POSITION} cy={worldHeight - currentAge * YEAR_PX} r={adaptiveRadius * 0.5} fill="#3b82f6" />
            <text
              x={LINE_X_POSITION - adaptiveRadius - 12}
              y={worldHeight - currentAge * YEAR_PX + 4}
              fontSize={16}
              fontWeight="600"
              fill="#1d4ed8"
              textAnchor="end"
              fontFamily="Georgia, serif"
            >
              Сейчас · {formattedCurrentAge} лет
            </text>
            {currentYearLabel !== null && (
              <text
                x={LINE_X_POSITION + adaptiveRadius + 12}
                y={worldHeight - currentAge * YEAR_PX + 4}
                fontSize={16}
                fontWeight="600"
                fill="#1d4ed8"
                textAnchor="start"
                fontFamily="Georgia, serif"
              >
                {currentYearLabel}
              </text>
            )}
          </g>

          {validEdges.map((edge) => {
              const isSelected = selectedBranchX === edge.x;
              return (
                <g key={edge.id}>
                  <line
                    x1={edge.x}
                    y1={worldHeight - edge.startAge * YEAR_PX}
                    x2={edge.x}
                    y2={worldHeight - edge.endAge * YEAR_PX}
                    stroke="transparent"
                    strokeWidth={isSelected ? 24 : 12}
                    strokeLinecap="round"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBranch(edge.x);
                    }}
                    className="cursor-pointer"
                    style={{ cursor: 'pointer' }}
                  />
                  <line
                    x1={edge.x}
                    y1={worldHeight - edge.startAge * YEAR_PX}
                    x2={edge.x}
                    y2={worldHeight - edge.endAge * YEAR_PX}
                    stroke={edge.color}
                    strokeWidth={isSelected ? 8 : 4}
                    strokeLinecap="round"
                    opacity={isSelected ? 1 : 0.8}
                    pointerEvents="none"
                  />
                </g>
              );
            })}

          {validNodes.map((node) => {
              const isSelected = node.id === selectedId;
              const isDragging = node.id === draggingNodeId;
              const meta = node.sphere ? SPHERE_META[node.sphere] : SPHERE_META.other;
              const y = worldHeight - node.age * YEAR_PX;
              const x = node.x ?? LINE_X_POSITION;
              const iconMeta = node.iconId ? EVENT_ICON_MAP[node.iconId] : null;
              const iconSize = adaptiveRadius * 2;
              const isBranchSelected =
                selectedBranchX !== null &&
                x === selectedBranchX &&
                x !== LINE_X_POSITION;
              const parentLineX = node.parentX ?? LINE_X_POSITION;
              const shouldDrawHorizontalLine =
                x !== parentLineX &&
                typeof parentLineX === 'number' &&
                typeof x === 'number' &&
                typeof y === 'number' &&
                !isNaN(parentLineX) &&
                !isNaN(x) &&
                !isNaN(y);

              return (
                <g key={node.id}>
                  {shouldDrawHorizontalLine && (
                    <line
                      x1={parentLineX}
                      y1={y}
                      x2={x}
                      y2={y}
                      stroke={meta.color}
                      strokeWidth={isBranchSelected ? 6 : 3}
                      strokeLinecap="round"
                      opacity={isBranchSelected ? 1 : 0.6}
                    />
                  )}

                  <g
                    onPointerDown={(event) => onNodeDragStart(event, node.id)}
                    onClick={() => !isDragging && onNodeClick(node.id)}
                    className="cursor-move"
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  >
                    {iconMeta ? (
                      <>
                        <circle cx={x} cy={y} r={adaptiveRadius} fill="transparent" stroke="transparent" strokeWidth={0} />
                        <image
                          data-icon-id={node.iconId ?? undefined}
                          href={`/icons/events/${iconMeta.filename}`}
                          x={x - adaptiveRadius}
                          y={y - adaptiveRadius}
                          width={iconSize}
                          height={iconSize}
                          preserveAspectRatio="xMidYMid meet"
                          pointerEvents="none"
                        />
                      </>
                    ) : (
                      <circle cx={x} cy={y} r={adaptiveRadius} fill="white" stroke={meta.color} strokeWidth={4} />
                    )}
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={adaptiveRadius + 4}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth={3}
                        opacity={0.8}
                      />
                    )}
                    {node.isDecision === true && !iconMeta && (
                      <g>
                        <line
                          x1={x - adaptiveRadius * 0.4}
                          y1={y - adaptiveRadius * 0.4}
                          x2={x + adaptiveRadius * 0.4}
                          y2={y + adaptiveRadius * 0.4}
                          stroke={meta.color}
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                        <line
                          x1={x - adaptiveRadius * 0.4}
                          y1={y + adaptiveRadius * 0.4}
                          x2={x + adaptiveRadius * 0.4}
                          y2={y - adaptiveRadius * 0.4}
                          stroke={meta.color}
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                      </g>
                    )}
                    <text
                      x={x + adaptiveRadius + 10}
                      y={y - adaptiveRadius - 5}
                      fontSize={28}
                      fontWeight="500"
                      fill="#0f172a"
                      fontFamily="Georgia, serif"
                    >
                      {node.label}
                    </text>
                  </g>
                </g>
              );
            })}
        </g>
      </svg>
    </div>
  );
});

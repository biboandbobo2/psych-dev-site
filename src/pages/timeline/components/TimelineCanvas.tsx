import { memo, useMemo, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import type { NodeT, EdgeT, Sphere, Transform } from '../types';
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
import { clamp, screenToWorld } from '../utils';
import { EVENT_ICON_MAP } from '../../../data/eventIcons';

interface TimelineCanvasProps {
  svgRef: RefObject<SVGSVGElement>;
  transform: Transform;
  onWheel: (e: WheelEvent<SVGSVGElement>) => void;
  onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: PointerEvent<SVGSVGElement>) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDragStart: (event: PointerEvent, nodeId: string) => void;
  /** Кнопка «+ ветка» у выбранного события (не рендерится, если не передан). */
  onAddBranchFromNode?: (nodeId: string) => void;
  onPeriodBoundaryClick: (periodIndex: number) => void;
  /** clickedAge — возраст в точке клика по ветке (для автоподстановки в форму). */
  onSelectBranch: (edgeId: string, clickedAge?: number) => void;
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
  selectedBranchId: string | null;
  /** Активный фильтр легенды сфер: чужие события приглушаются. */
  sphereFilter: Sphere | null;
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
    onAddBranchFromNode,
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
    selectedBranchId,
    sphereFilter,
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
        className={`w-full h-full touch-none ${cursorClass}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        data-world-width={worldWidth}
        data-world-height={worldHeight}
      >
        <g data-export-root="true" transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Тёплый фон вместо чисто-белого — мягче для глаза. */}
          <rect x={0} y={-100} width={worldWidth} height={worldHeight + 200} fill="#fffdf8" />

          <PeriodizationLayer
            periodization={periodization}
            ageMax={ageMax}
            worldHeight={worldHeight}
            canvasWidth={worldWidth}
            onBoundaryClick={onPeriodBoundaryClick}
          />

          {/* Сетка: десятилетия заметные, пятилетки едва видимые —
              холст перестаёт быть «тетрадкой в клеточку».
              data-layer="grid" позволяет постер-экспорту убрать сетку. */}
          <g data-layer="grid">
          {ageLabels.map((age) => {
            const isDecade = age % 10 === 0;
            const rightLabel = birthBaseYear !== null ? `${birthBaseYear + age}` : null;
            return (
              <g key={age}>
                <line
                  x1={0}
                  y1={worldHeight - age * YEAR_PX}
                  x2={worldWidth}
                  y2={worldHeight - age * YEAR_PX}
                  stroke={isDecade ? '#e2e8f0' : '#f1f5f9'}
                  strokeWidth={isDecade ? 2 : 1}
                />
                <text
                  x={LINE_X_POSITION - 35}
                  y={worldHeight - age * YEAR_PX + 5}
                  fontSize={isDecade ? 42 : 30}
                  textAnchor="end"
                  fill={isDecade ? '#475569' : '#a8b3c2'}
                  fontWeight="500"
                  fontFamily="Georgia, serif"
                >
                  {age}
                </text>
                {rightLabel && (
                  <text
                    x={LINE_X_POSITION + 35}
                    y={worldHeight - age * YEAR_PX + 5}
                    fontSize={isDecade ? 42 : 30}
                    textAnchor="start"
                    fill={isDecade ? '#475569' : '#a8b3c2'}
                    fontWeight="500"
                    fontFamily="Georgia, serif"
                  >
                    {rightLabel}
                  </text>
                )}
              </g>
            );
          })}
          </g>

          <line
            x1={LINE_X_POSITION}
            y1={worldHeight}
            x2={LINE_X_POSITION}
            y2={worldHeight - currentAge * YEAR_PX}
            stroke="#5aa2f7"
            strokeWidth={selectedBranchId === null ? 18 : 13}
            strokeLinecap="round"
            onClick={(e) => {
              e.stopPropagation();
              onClearSelection();
            }}
            className="cursor-pointer"
            style={{ cursor: 'pointer' }}
          />

          {/* Будущее — тоньше и бледнее прожитого: стержень читается сразу. */}
          <line
            x1={LINE_X_POSITION}
            y1={worldHeight - currentAge * YEAR_PX}
            x2={LINE_X_POSITION}
            y2={worldHeight - ageMax * YEAR_PX}
            stroke="#dde5ee"
            strokeWidth={selectedBranchId === null ? 10 : 8}
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
              const isSelected = selectedBranchId === edge.id;
              const originNode = validNodes.find((node) => node.id === edge.nodeId);
              const originX = originNode?.x ?? LINE_X_POSITION;
              const startY = worldHeight - edge.startAge * YEAR_PX;
              const endY = worldHeight - edge.endAge * YEAR_PX;
              const shouldDrawConnector =
                typeof originX === 'number' &&
                typeof edge.x === 'number' &&
                !isNaN(originX) &&
                !isNaN(edge.x) &&
                originX !== edge.x;
              // Плавная дуга в месте, где ветка отходит от события:
              // «живое дерево» вместо прямого угла схемы метро.
              const cornerR = shouldDrawConnector
                ? Math.min(28, Math.abs(edge.x - originX) / 2, Math.abs(startY - endY) / 2)
                : 0;
              const dir = edge.x > originX ? 1 : -1;
              const branchPath = shouldDrawConnector
                ? `M ${originX} ${startY} L ${edge.x - dir * cornerR} ${startY} ` +
                  `Q ${edge.x} ${startY} ${edge.x} ${startY - cornerR} L ${edge.x} ${endY}`
                : `M ${edge.x} ${startY} L ${edge.x} ${endY}`;
              const dimmedBySphere = sphereFilter !== null && originNode?.sphere !== sphereFilter;
              return (
                <g key={edge.id} opacity={dimmedBySphere ? 0.15 : 1}>
                  <path
                    d={branchPath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={isSelected ? 24 : 14}
                    strokeLinecap="round"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Возраст из точки клика: событие на ветке создаётся
                      // «там, где кликнул», без ручного ввода возраста.
                      const world = screenToWorld(e, svgRef.current, transform);
                      const rawAge = (worldHeight - world.y) / YEAR_PX;
                      const clickedAge =
                        Math.round(clamp(rawAge, edge.startAge, edge.endAge) * 10) / 10;
                      onSelectBranch(edge.id, clickedAge);
                    }}
                    className="cursor-pointer"
                    style={{ cursor: 'pointer' }}
                  />
                  <path
                    d={branchPath}
                    fill="none"
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
              // Highlight events sitting on the currently selected branch.
              // selectedBranchId resolves to an edge.x via the edges list.
              const selectedBranchEdgeX = selectedBranchId
                ? validEdges.find((e) => e.id === selectedBranchId)?.x ?? null
                : null;
              const isBranchSelected =
                selectedBranchEdgeX !== null &&
                x === selectedBranchEdgeX &&
                x !== LINE_X_POSITION;
              const parentLineX = node.parentX ?? LINE_X_POSITION;
              const labelOnLeft = x < LINE_X_POSITION;
              const labelX = labelOnLeft ? x - adaptiveRadius - 10 : x + adaptiveRadius + 10;
              const shouldDrawHorizontalLine =
                x !== parentLineX &&
                typeof parentLineX === 'number' &&
                typeof x === 'number' &&
                typeof y === 'number' &&
                !isNaN(parentLineX) &&
                !isNaN(x) &&
                !isNaN(y);

              const dimmedBySphere = sphereFilter !== null && node.sphere !== sphereFilter;

              return (
                <g key={node.id} opacity={dimmedBySphere ? 0.2 : 1}>
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
                    className="tl-node cursor-move"
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
                    {/* «Решение» — внешнее кольцо цвета сферы (крупнее обычного события). */}
                    {node.isDecision === true && (
                      <circle
                        cx={x}
                        cy={y}
                        r={adaptiveRadius + (isSelected ? 9 : 7)}
                        fill="none"
                        stroke={meta.color}
                        strokeWidth={2.5}
                        opacity={0.7}
                        pointerEvents="none"
                      />
                    )}
                    {/* Точка-индикатор: у события есть заметки. */}
                    {Boolean(node.notes && node.notes.trim()) && (
                      <circle
                        cx={x + adaptiveRadius * 0.85}
                        cy={y + adaptiveRadius * 0.85}
                        r={Math.max(3, adaptiveRadius * 0.22)}
                        fill="#64748b"
                        stroke="#fffdf8"
                        strokeWidth={1.5}
                        pointerEvents="none"
                      />
                    )}
                    <text
                      x={labelX}
                      y={y - adaptiveRadius - 5}
                      fontSize={28}
                      fontWeight="500"
                      fill="#0f172a"
                      fontFamily="Georgia, serif"
                      textAnchor={labelOnLeft ? 'end' : 'start'}
                    >
                      {node.label}
                    </text>
                  </g>

                  {/* «+ ветка» у выбранного события — создание ветки
                      прямо с холста, без поиска кнопки в панели. */}
                  {isSelected && !isDragging && onAddBranchFromNode && (
                    <g
                      data-layer="ui"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddBranchFromNode(node.id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                      style={{ cursor: 'pointer' }}
                    >
                      <title>Создать ветку от события</title>
                      <circle
                        cx={x + adaptiveRadius + 22}
                        cy={y + adaptiveRadius + 14}
                        r={13}
                        fill="#ffffff"
                        stroke="#5aa2f7"
                        strokeWidth={2}
                      />
                      <text
                        x={x + adaptiveRadius + 22}
                        y={y + adaptiveRadius + 20}
                        fontSize={20}
                        fontWeight="600"
                        fill="#2563eb"
                        textAnchor="middle"
                        pointerEvents="none"
                      >
                        +
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
        </g>
      </svg>
    </div>
  );
});

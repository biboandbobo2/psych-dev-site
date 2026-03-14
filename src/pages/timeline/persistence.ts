import { DEFAULT_AGE_MAX, DEFAULT_CURRENT_AGE } from './constants';
import type { EdgeT, NodeT, TimelineCanvas, TimelineData, TimelineDocument } from './types';

export const DEFAULT_TIMELINE_NAME = 'Таймлайн 1';

export function createEmptyTimelineData(): TimelineData {
  return {
    currentAge: DEFAULT_CURRENT_AGE,
    ageMax: DEFAULT_AGE_MAX,
    nodes: [],
    edges: [],
    birthDetails: {},
    selectedPeriodization: null,
  };
}

function normalizeImportedNode(node: unknown): NodeT | null {
  if (!node || typeof node !== 'object') return null;

  const candidate = node as Partial<NodeT>;
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;
  if (!Number.isFinite(candidate.age) || typeof candidate.label !== 'string' || !candidate.label.trim()) return null;
  if (typeof candidate.isDecision !== 'boolean') return null;

  return {
    id: candidate.id,
    age: candidate.age,
    x: Number.isFinite(candidate.x) ? candidate.x : undefined,
    parentX: Number.isFinite(candidate.parentX) ? candidate.parentX : undefined,
    label: candidate.label.trim(),
    notes: typeof candidate.notes === 'string' && candidate.notes.trim() ? candidate.notes.trim() : undefined,
    sphere: candidate.sphere,
    isDecision: candidate.isDecision,
    iconId: candidate.iconId,
  };
}

function normalizeImportedEdge(edge: unknown): EdgeT | null {
  if (!edge || typeof edge !== 'object') return null;

  const candidate = edge as Partial<EdgeT>;
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;
  if (
    !Number.isFinite(candidate.x) ||
    !Number.isFinite(candidate.startAge) ||
    !Number.isFinite(candidate.endAge) ||
    typeof candidate.color !== 'string' ||
    !candidate.color.trim() ||
    typeof candidate.nodeId !== 'string' ||
    !candidate.nodeId.trim()
  ) {
    return null;
  }

  return {
    id: candidate.id,
    x: candidate.x,
    startAge: candidate.startAge,
    endAge: candidate.endAge,
    color: candidate.color.trim(),
    nodeId: candidate.nodeId,
  };
}

export function normalizeImportedTimelineData(data: unknown): TimelineData {
  if (!data || typeof data !== 'object') {
    throw new Error('Файл таймлайна должен содержать JSON-объект формата TimelineData.');
  }

  const candidate = data as Partial<TimelineData>;
  const nodes = Array.isArray(candidate.nodes) ? candidate.nodes.map(normalizeImportedNode).filter(Boolean) as NodeT[] : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.isArray(candidate.edges)
    ? candidate.edges
        .map(normalizeImportedEdge)
        .filter((edge): edge is EdgeT => Boolean(edge) && nodeIds.has(edge.nodeId))
    : [];
  const computedMaxAge = Math.max(
    DEFAULT_AGE_MAX,
    ...nodes.map((node) => node.age),
    ...edges.map((edge) => edge.endAge),
    Number.isFinite(candidate.currentAge) ? Number(candidate.currentAge) : DEFAULT_CURRENT_AGE
  );

  return {
    currentAge: Number.isFinite(candidate.currentAge) ? Number(candidate.currentAge) : DEFAULT_CURRENT_AGE,
    ageMax: Number.isFinite(candidate.ageMax) ? Math.max(Number(candidate.ageMax), computedMaxAge) : computedMaxAge,
    nodes,
    edges,
    birthDetails:
      candidate.birthDetails && typeof candidate.birthDetails === 'object'
        ? {
            date:
              typeof candidate.birthDetails.date === 'string' && candidate.birthDetails.date.trim()
                ? candidate.birthDetails.date.trim()
                : undefined,
            place:
              typeof candidate.birthDetails.place === 'string' && candidate.birthDetails.place.trim()
                ? candidate.birthDetails.place.trim()
                : undefined,
            notes:
              typeof candidate.birthDetails.notes === 'string' && candidate.birthDetails.notes.trim()
                ? candidate.birthDetails.notes.trim()
                : undefined,
          }
        : {},
    selectedPeriodization:
      typeof candidate.selectedPeriodization === 'string' || candidate.selectedPeriodization === null
        ? candidate.selectedPeriodization
        : null,
  };
}

export function createTimelineCanvas(name: string, data?: Partial<TimelineData>): TimelineCanvas {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    data: {
      ...createEmptyTimelineData(),
      ...data,
      birthDetails: data?.birthDetails ?? {},
      selectedPeriodization: data?.selectedPeriodization ?? null,
      nodes: data?.nodes ?? [],
      edges: data?.edges ?? [],
    },
  };
}

export function hasTimelineContent(data: TimelineData): boolean {
  return Boolean(
    data.nodes.length > 0 ||
      data.edges.length > 0 ||
      data.birthDetails?.date ||
      data.birthDetails?.place ||
      data.birthDetails?.notes ||
      data.selectedPeriodization
  );
}

export function getNextTimelineName(canvases: TimelineCanvas[]): string {
  return `Таймлайн ${canvases.length + 1}`;
}

function normalizeTimelineData(data?: Partial<TimelineData> | null): TimelineData {
  return normalizeImportedTimelineData(data ?? {});
}

function normalizeCanvas(canvas: Partial<TimelineCanvas> | null | undefined, fallbackName: string): TimelineCanvas {
  return {
    id: canvas?.id || crypto.randomUUID(),
    name: canvas?.name?.trim() || fallbackName,
    createdAt: canvas?.createdAt || new Date().toISOString(),
    data: normalizeTimelineData(canvas?.data),
  };
}

export function normalizeTimelineDocument(doc: TimelineDocument | null | undefined): {
  activeCanvasId: string;
  canvases: TimelineCanvas[];
} {
  const normalizedCanvases =
    doc?.canvases?.length && doc.canvases.length > 0
      ? doc.canvases.map((canvas, index) =>
          normalizeCanvas(canvas, index === 0 ? DEFAULT_TIMELINE_NAME : `Таймлайн ${index + 1}`)
        )
      : [
          normalizeCanvas(
            {
              name: DEFAULT_TIMELINE_NAME,
              data: doc?.data,
            },
            DEFAULT_TIMELINE_NAME
          ),
        ];

  const activeCanvasId =
    normalizedCanvases.find((canvas) => canvas.id === doc?.activeCanvasId)?.id ?? normalizedCanvases[0].id;

  return {
    activeCanvasId,
    canvases: normalizedCanvases,
  };
}

export function buildTimelineDocument(userId: string, activeCanvasId: string, canvases: TimelineCanvas[]): TimelineDocument {
  return {
    userId,
    activeCanvasId,
    canvases,
  };
}

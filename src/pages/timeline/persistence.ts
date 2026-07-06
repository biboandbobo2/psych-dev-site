import { DEFAULT_AGE_MAX, DEFAULT_CURRENT_AGE, LINE_X_POSITION } from './constants';
import { buildTimelineTree } from './utils/timelineTree';
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
  // Dedupe by id at load — Firestore documents corrupted by the pre-fix
  // duplication bug can have the same node id repeated thousands of
  // times. First occurrence wins.
  const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    return out;
  };

  const rawNodesRaw = Array.isArray(candidate.nodes)
    ? (candidate.nodes.map(normalizeImportedNode).filter(Boolean) as NodeT[])
    : [];
  const rawNodes = dedupeById(rawNodesRaw);
  const nodeIds = new Set(rawNodes.map((node) => node.id));
  const rawEdges = Array.isArray(candidate.edges)
    ? candidate.edges
        .map(normalizeImportedEdge)
        .filter((edge): edge is EdgeT => Boolean(edge) && nodeIds.has(edge.nodeId))
    : [];
  const edges = dedupeById(rawEdges);

  // B5: heal orphan nodes whose parentX points at a now-missing branch.
  // After previous bugs (B6/B7) these accumulated in Firestore; on read
  // we re-anchor them to the main line so the canvas doesn't render
  // events floating on a non-existent branch.
  const validEdgeXs = new Set(edges.map((e) => e.x));
  const nodes = rawNodes.map((n) => {
    if (
      n.parentX !== undefined &&
      n.parentX !== LINE_X_POSITION &&
      !validEdgeXs.has(n.parentX)
    ) {
      return { ...n, x: LINE_X_POSITION, parentX: undefined };
    }
    return n;
  });

  // I12-healing: ветка обязана покрывать возрасты своих событий — UI
  // такое состояние создать не даёт (B11/B13/B14), но legacy-документы
  // могут его содержать. Расширяем окно ветки (данные не двигаем);
  // принадлежность берём из дерева, как и все операции.
  const windowFixes = new Map<string, { startAge: number; endAge: number }>();
  for (const root of buildTimelineTree(nodes, edges)) {
    const stack = [root];
    while (stack.length > 0) {
      const event = stack.pop()!;
      for (const branch of event.branches) {
        let { startAge, endAge } = branch.data;
        for (const child of branch.events) {
          startAge = Math.min(startAge, child.data.age);
          endAge = Math.max(endAge, child.data.age);
          stack.push(child);
        }
        if (startAge !== branch.data.startAge || endAge !== branch.data.endAge) {
          windowFixes.set(branch.data.id, { startAge, endAge });
        }
      }
    }
  }
  const healedEdges = edges.map((e) => {
    const fix = windowFixes.get(e.id);
    return fix ? { ...e, ...fix } : e;
  });

  const computedMaxAge = Math.max(
    25,
    ...nodes.map((node) => node.age),
    ...healedEdges.map((edge) => edge.endAge),
    Number.isFinite(candidate.currentAge) ? Number(candidate.currentAge) : DEFAULT_CURRENT_AGE
  );

  return {
    currentAge: Number.isFinite(candidate.currentAge) ? Number(candidate.currentAge) : DEFAULT_CURRENT_AGE,
    ageMax: Number.isFinite(candidate.ageMax) ? Math.max(Number(candidate.ageMax), computedMaxAge) : computedMaxAge,
    nodes,
    edges: healedEdges,
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

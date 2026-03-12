import { DEFAULT_AGE_MAX, DEFAULT_CURRENT_AGE } from './constants';
import type { TimelineCanvas, TimelineData, TimelineDocument } from './types';

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
  return {
    currentAge: data?.currentAge ?? DEFAULT_CURRENT_AGE,
    ageMax: DEFAULT_AGE_MAX,
    nodes: data?.nodes ?? [],
    edges: data?.edges ?? [],
    birthDetails: data?.birthDetails ?? {},
    selectedPeriodization: data?.selectedPeriodization ?? null,
  };
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

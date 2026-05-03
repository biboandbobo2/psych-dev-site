import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../auth/AuthProvider';
import type {
  NodeT,
  EdgeT,
  BirthDetails,
  TimelineCanvas,
  TimelineData,
  TimelineDocument,
  SaveStatus,
  Transform,
} from '../types';
import {
  DEFAULT_AGE_MAX,
  DEFAULT_CURRENT_AGE,
  LINE_X_POSITION,
  YEAR_PX,
  SAVE_DEBOUNCE_MS,
} from '../constants';
import {
  buildTimelineDocument,
  createEmptyTimelineData,
  createTimelineCanvas as createTimelineCanvasModel,
  DEFAULT_TIMELINE_NAME,
  getNextTimelineName,
  hasTimelineContent,
  normalizeImportedTimelineData,
  normalizeTimelineDocument,
} from '../persistence';
import { reportAppError } from '../../../lib/errorHandler';
import { removeUndefined } from '../../../utils/removeUndefined';

function getViewportTargetAge(data: TimelineData) {
  if (data.nodes.length > 0 || data.currentAge !== DEFAULT_CURRENT_AGE) {
    // Center on middle of life, not on the end
    return Math.round(data.currentAge / 2);
  }
  return 0;
}

export function useTimelineState() {
  const { user } = useAuth();
  const [canvases, setCanvases] = useState<TimelineCanvas[]>(() => [
    createTimelineCanvasModel(DEFAULT_TIMELINE_NAME),
  ]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [transform, setTransform] = useState<Transform>({ x: 50, y: 100, k: 1 });
  const [viewportAge, setViewportAge] = useState<number>(DEFAULT_CURRENT_AGE);
  const [hasLoaded, setHasLoaded] = useState(false);

  const activeCanvas = useMemo(() => {
    if (canvases.length === 0) return null;
    return canvases.find((canvas) => canvas.id === activeCanvasId) ?? canvases[0];
  }, [canvases, activeCanvasId]);

  const activeData = activeCanvas?.data ?? createEmptyTimelineData();

  const syncViewportForTimeline = useCallback((data: TimelineData) => {
    window.setTimeout(() => {
      const targetAge = getViewportTargetAge(data);
      const currentWorldHeight = (data.ageMax || DEFAULT_AGE_MAX) * YEAR_PX + 500;
      const targetY = currentWorldHeight - targetAge * YEAR_PX;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      setTransform({
        x: viewportWidth / 2 - LINE_X_POSITION,
        y: viewportHeight / 2 - targetY,
        k: 1,
      });
      setViewportAge(targetAge);
    }, 100);
  }, []);

  const updateActiveCanvasData = useCallback(
    (updater: (data: TimelineData) => TimelineData) => {
      setCanvases((prev) => {
        if (prev.length === 0) return prev;

        const targetId = activeCanvasId ?? prev[0].id;
        return prev.map((canvas) =>
          canvas.id === targetId
            ? {
                ...canvas,
                data: updater(canvas.data),
              }
            : canvas
        );
      });
    },
    [activeCanvasId]
  );

  const saveToFirestore = useCallback(
    async (nextActiveCanvasId: string, nextCanvases: TimelineCanvas[]) => {
      if (!user) return;
      setSaveStatus('saving');
      const docRef = doc(db, 'timelines', user.uid);

      try {
        await setDoc(
          docRef,
          {
            ...removeUndefined(buildTimelineDocument(user.uid, nextActiveCanvasId, nextCanvases)),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        reportAppError({ message: 'Ошибка сохранения таймлайна', error, context: 'useTimelineState.save' });
        setSaveStatus('error');
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'timelines', user.uid);
    getDoc(docRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          const initialCanvas = createTimelineCanvasModel(DEFAULT_TIMELINE_NAME);
          setCanvases([initialCanvas]);
          setActiveCanvasId(initialCanvas.id);
          syncViewportForTimeline(initialCanvas.data);
          setHasLoaded(true);
          return;
        }

        const normalized = normalizeTimelineDocument(snapshot.data() as TimelineDocument);
        const nextActiveCanvas =
          normalized.canvases.find((canvas) => canvas.id === normalized.activeCanvasId) ?? normalized.canvases[0];

        setCanvases(normalized.canvases);
        setActiveCanvasId(nextActiveCanvas.id);
        syncViewportForTimeline(nextActiveCanvas.data);
        setHasLoaded(true);
      })
      .catch((error) => {
        reportAppError({ message: 'Ошибка загрузки таймлайна', error, context: 'useTimelineState.load' });
      });
  }, [user, syncViewportForTimeline]);

  useEffect(() => {
    if (!user || !hasLoaded || !activeCanvas) return;

    const shouldPersist = canvases.length > 1 || canvases.some((canvas) => hasTimelineContent(canvas.data));
    if (!shouldPersist) return;

    const timer = window.setTimeout(() => {
      saveToFirestore(activeCanvas.id, canvases);
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [canvases, activeCanvas, hasLoaded, saveToFirestore, user]);

  const selectTimelineCanvas = useCallback(
    (canvasId: string) => {
      const targetCanvas = canvases.find((canvas) => canvas.id === canvasId);
      if (!targetCanvas) return;

      setActiveCanvasId(canvasId);
      syncViewportForTimeline(targetCanvas.data);
    },
    [canvases, syncViewportForTimeline]
  );

  const createTimelineCanvas = useCallback(() => {
    const newCanvas = createTimelineCanvasModel(getNextTimelineName(canvases));
    setCanvases((prev) => [...prev, newCanvas]);
    setActiveCanvasId(newCanvas.id);
    syncViewportForTimeline(newCanvas.data);
  }, [canvases, syncViewportForTimeline]);

  const replaceActiveTimeline = useCallback(
    (nextData: TimelineData, options?: { name?: string }) => {
      const normalizedData = normalizeImportedTimelineData(nextData);

      setCanvases((prev) => {
        if (prev.length === 0) return prev;

        const targetId = activeCanvasId ?? prev[0].id;
        return prev.map((canvas) =>
          canvas.id === targetId
            ? {
                ...canvas,
                name: options?.name?.trim() || canvas.name,
                data: normalizedData,
              }
            : canvas
        );
      });
      syncViewportForTimeline(normalizedData);
    },
    [activeCanvasId, syncViewportForTimeline]
  );

  const setCurrentAge = useCallback(
    (age: number) => {
      updateActiveCanvasData((data) => ({ ...data, currentAge: age }));
    },
    [updateActiveCanvasData]
  );

  const setAgeMax = useCallback(
    (ageMax: number) => {
      updateActiveCanvasData((data) => ({ ...data, ageMax }));
    },
    [updateActiveCanvasData]
  );

  const setNodes = useCallback(
    (nodes: NodeT[]) => {
      updateActiveCanvasData((data) => ({ ...data, nodes }));
    },
    [updateActiveCanvasData]
  );

  const setEdges = useCallback(
    (edges: EdgeT[]) => {
      updateActiveCanvasData((data) => ({ ...data, edges }));
    },
    [updateActiveCanvasData]
  );

  const setBirthDetails = useCallback(
    (birthDetails: BirthDetails) => {
      updateActiveCanvasData((data) => ({ ...data, birthDetails }));
    },
    [updateActiveCanvasData]
  );

  const setSelectedPeriodization = useCallback(
    (selectedPeriodization: string | null) => {
      updateActiveCanvasData((data) => ({ ...data, selectedPeriodization }));
    },
    [updateActiveCanvasData]
  );

  return {
    currentAge: activeData.currentAge,
    setCurrentAge,
    ageMax: activeData.ageMax ?? DEFAULT_AGE_MAX,
    setAgeMax,
    nodes: activeData.nodes,
    setNodes,
    edges: activeData.edges,
    setEdges,
    birthDetails: activeData.birthDetails ?? {},
    setBirthDetails,
    selectedPeriodization: activeData.selectedPeriodization ?? null,
    setSelectedPeriodization,
    saveStatus,
    transform,
    setTransform,
    viewportAge,
    setViewportAge,
    timelineCanvases: canvases,
    activeTimelineId: activeCanvas?.id ?? null,
    activeTimelineName: activeCanvas?.name ?? DEFAULT_TIMELINE_NAME,
    createTimelineCanvas,
    selectTimelineCanvas,
    replaceActiveTimeline,
  };
}

export type TimelineState = ReturnType<typeof useTimelineState>;

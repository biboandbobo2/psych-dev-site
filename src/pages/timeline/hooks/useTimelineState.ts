import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../auth/AuthProvider';
import type { NodeT, EdgeT, BirthDetails, TimelineData, SaveStatus, Transform } from '../types';
import {
  DEFAULT_AGE_MAX,
  DEFAULT_CURRENT_AGE,
  LINE_X_POSITION,
  YEAR_PX,
  SAVE_DEBOUNCE_MS,
} from '../constants';
import { removeUndefined } from '../utils';
import { reportAppError } from '../../../lib/errorHandler';

export function useTimelineState() {
  const { user } = useAuth();
  const [currentAge, setCurrentAge] = useState(DEFAULT_CURRENT_AGE);
  const [ageMax, setAgeMax] = useState(DEFAULT_AGE_MAX);
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [edges, setEdges] = useState<EdgeT[]>([]);
  const [birthDetails, setBirthDetails] = useState<BirthDetails>({});
  const [selectedPeriodization, setSelectedPeriodization] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [transform, setTransform] = useState<Transform>({ x: 50, y: 100, k: 1 });
  const [viewportAge, setViewportAge] = useState<number>(currentAge);
  const [initialViewportSet, setInitialViewportSet] = useState(false);

  async function saveToFirestore(data: TimelineData) {
    if (!user) return;
    setSaveStatus('saving');
    const docRef = doc(db, 'timelines', user.uid);

    try {
      const cleanedData = removeUndefined(data);

      await setDoc(
        docRef,
        {
          userId: user.uid,
          updatedAt: serverTimestamp(),
          data: cleanedData,
        },
        { merge: true }
      );

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      reportAppError({ message: 'Ошибка сохранения таймлайна', error, context: 'useTimelineState.save' });
      setSaveStatus('error');
    }
  }

  useEffect(() => {
    if (!user) return;

    const timer = window.setTimeout(() => {
      const hasBirthData = Boolean(birthDetails.date || birthDetails.place || birthDetails.notes);
      if (nodes.length > 0 || edges.length > 0 || hasBirthData || selectedPeriodization) {
        saveToFirestore({ currentAge, ageMax, nodes, edges, birthDetails, selectedPeriodization });
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [nodes, edges, birthDetails, currentAge, ageMax, selectedPeriodization, user]);

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'timelines', user.uid);
    getDoc(docRef)
      .then((snapshot) => {
      if (!snapshot.exists()) {
        if (!initialViewportSet) {
          setTimeout(() => {
            const currentWorldHeight = DEFAULT_AGE_MAX * YEAR_PX + 500;
            const targetY = currentWorldHeight;
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            setTransform({
              x: viewportWidth / 2 - LINE_X_POSITION,
              y: viewportHeight / 2 - targetY,
              k: 1,
            });
            setViewportAge(0);
            setInitialViewportSet(true);
          }, 100);
        }
        setBirthDetails({});
        return;
      }

      const data = snapshot.data()?.data as TimelineData | undefined;
      if (!data) return;

      const loadedAge = data.currentAge || DEFAULT_CURRENT_AGE;
      setCurrentAge(loadedAge);
      const finalAgeMax = DEFAULT_AGE_MAX;
      setAgeMax(finalAgeMax);

      const normalizedNodes = (data.nodes || []).map((node: any) => ({
        id: node.id,
        age: node.age,
        x: node.x ?? LINE_X_POSITION,
        parentX: node.parentX,
        label: node.label || 'Событие',
        notes: node.notes || '',
        sphere: node.sphere || 'other',
        isDecision: node.isDecision ?? false,
        iconId: node.iconId ?? undefined,
      }));
      setNodes(normalizedNodes);

      const normalizedEdges = (data.edges || []).map((edge: any) => ({
        id: edge.id,
        x: edge.x,
        startAge: edge.startAge,
        endAge: edge.endAge,
        color: edge.color,
        nodeId: edge.nodeId,
      }));
      setEdges(normalizedEdges);
      setBirthDetails(data.birthDetails || {});
      setSelectedPeriodization(data.selectedPeriodization ?? null);

      if (!initialViewportSet) {
        setTimeout(() => {
          const targetAge = normalizedNodes.length > 0 || loadedAge !== DEFAULT_CURRENT_AGE ? loadedAge : 0;
          const currentWorldHeight = finalAgeMax * YEAR_PX + 500;
          const targetY = currentWorldHeight - targetAge * YEAR_PX;
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          setTransform({
            x: viewportWidth / 2 - LINE_X_POSITION,
            y: viewportHeight / 2 - targetY,
            k: 1,
          });
          setViewportAge(targetAge);
          setInitialViewportSet(true);
        }, 100);
      }
      })
      .catch((error) => {
        reportAppError({ message: 'Ошибка загрузки таймлайна', error, context: 'useTimelineState.load' });
      });
  }, [user]);

  return {
    currentAge,
    setCurrentAge,
    ageMax,
    nodes,
    setNodes,
    edges,
    setEdges,
    birthDetails,
    setBirthDetails,
    selectedPeriodization,
    setSelectedPeriodization,
    saveStatus,
    transform,
    setTransform,
    viewportAge,
    setViewportAge,
  };
}

export type TimelineState = ReturnType<typeof useTimelineState>;

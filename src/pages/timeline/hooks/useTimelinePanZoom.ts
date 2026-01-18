import { useState, useCallback, useRef } from 'react';
import { clamp } from '../utils';
import { LINE_X_POSITION, MIN_SCALE, MAX_SCALE } from '../constants';
import type { Transform } from '../types';

interface UseTimelinePanZoomOptions {
  transform: Transform;
  setTransform: (transform: Transform) => void;
  onBirthDeselect?: () => void;
}

/**
 * Hook for managing pan and zoom interactions on timeline canvas
 */
export function useTimelinePanZoom({
  transform,
  setTransform,
  onBirthDeselect,
}: UseTimelinePanZoomOptions) {
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDistanceRef = useRef<number | null>(null);

  /**
   * Handle mouse wheel for zooming
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const scaleBy = 1 + -e.deltaY * 0.001;
      const newK = clamp(transform.k * scaleBy, MIN_SCALE, MAX_SCALE);

      // Scale relative to the life line (LINE_X_POSITION)
      // This ensures the life line stays centered during scaling
      const centerY = window.innerHeight / 2;

      // Current position of life line on screen
      const lineScreenX = transform.x + LINE_X_POSITION * transform.k;

      // New position after scaling
      const newTransform = {
        k: newK,
        x: lineScreenX - LINE_X_POSITION * newK,
        y: transform.y + (centerY - transform.y) * (1 - newK / transform.k),
      };
      setTransform(newTransform);
    },
    [transform, setTransform]
  );

  /**
   * Start panning
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === 'touch') {
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointersRef.current.size === 2) {
          const [p1, p2] = Array.from(activePointersRef.current.values());
          lastDistanceRef.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          setIsPanning(false);
          setLastPointer(null);
        } else {
          setIsPanning(true);
          setLastPointer({ x: e.clientX, y: e.clientY });
        }
      } else {
        setIsPanning(true);
        setLastPointer({ x: e.clientX, y: e.clientY });
      }
      onBirthDeselect?.();
    },
    [onBirthDeselect]
  );

  /**
   * Handle pointer move for panning
   * Note: This is called from Timeline for panning only.
   * Drag & drop is handled separately by useTimelineDragDrop
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === 'touch' && activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointersRef.current.size === 2) {
          const [p1, p2] = Array.from(activePointersRef.current.values());
          const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const lastDistance = lastDistanceRef.current ?? currentDistance;
          const scaleBy = currentDistance / lastDistance;
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          setTransform((prev) => {
            const nextK = clamp(prev.k * scaleBy, MIN_SCALE, MAX_SCALE);
            const normalizedScale = nextK / prev.k;
            return {
              k: nextK,
              x: prev.x + (midX - prev.x) * (1 - normalizedScale),
              y: prev.y + (midY - prev.y) * (1 - normalizedScale),
            };
          });

          lastDistanceRef.current = currentDistance;
          return;
        }
      }

      if (isPanning && lastPointer) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
        setLastPointer({ x: e.clientX, y: e.clientY });
      }
    },
    [isPanning, lastPointer, setTransform]
  );

  /**
   * End panning
   */
  const handlePointerUp = useCallback((e?: React.PointerEvent<SVGSVGElement>) => {
    if (e?.pointerType === 'touch') {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size === 1) {
        const [remaining] = Array.from(activePointersRef.current.values());
        setIsPanning(true);
        setLastPointer(remaining);
      } else {
        setIsPanning(false);
        setLastPointer(null);
      }
      if (activePointersRef.current.size < 2) {
        lastDistanceRef.current = null;
      }
      return;
    }
    setIsPanning(false);
    setLastPointer(null);
  }, []);

  return {
    // State
    isPanning,
    lastPointer,

    // Handlers
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

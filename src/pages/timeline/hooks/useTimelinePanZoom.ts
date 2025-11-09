import { useState, useCallback } from 'react';
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
      setIsPanning(true);
      setLastPointer({ x: e.clientX, y: e.clientY });
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
  const handlePointerUp = useCallback(() => {
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

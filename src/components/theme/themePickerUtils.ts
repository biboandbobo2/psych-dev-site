/**
 * Utility functions for ThemePicker component
 */
import type { Gradient } from '../../types/themes';

export const hexRegex = /^#?[0-9a-f]{6}$/i;

/**
 * Compares two gradients for equality
 */
export const gradientsEqual = (a: Gradient, b: Gradient): boolean => {
  if (a.type !== b.type) return false;
  if ((a.angle ?? 0) !== (b.angle ?? 0)) return false;
  if (a.stops.length !== b.stops.length) return false;
  return a.stops.every((stop, index) => {
    const other = b.stops[index];
    return stop.color.toLowerCase() === other.color.toLowerCase() && stop.position === other.position;
  });
};

/**
 * Normalizes hex color to uppercase with # prefix
 */
export const sanitizeHex = (value: string): string => {
  const normalized = value.startsWith('#') ? value : `#${value}`;
  return normalized.toUpperCase();
};

/**
 * Clamps a value between min and max
 */
export const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Adds a new stop to the gradient
 */
export const addStop = (gradient: Gradient): Gradient => {
  const stops = [...gradient.stops];
  if (stops.length >= 8) return gradient;
  const midpoint = stops.length > 1 ? (stops[0].position + stops[stops.length - 1].position) / 2 : 50;
  const insertAt = stops.findIndex((stop) => stop.position > midpoint);
  const newStop = {
    color: stops[Math.max(0, stops.length - 1)].color,
    position: Math.round(midpoint),
  };
  if (insertAt === -1) {
    stops.push(newStop);
  } else {
    stops.splice(insertAt, 0, newStop);
  }
  return {
    ...gradient,
    stops,
  };
};

/**
 * Removes a stop from the gradient by index
 */
export const removeStop = (gradient: Gradient, index: number): Gradient => {
  if (gradient.stops.length <= 2) return gradient;
  const stops = gradient.stops.filter((_, idx) => idx !== index);
  return {
    ...gradient,
    stops,
  };
};

/**
 * Updates a gradient stop at the specified index
 */
export const updateStop = (
  gradient: Gradient,
  index: number,
  updates: Partial<{ color: string; position: number }>
): Gradient => {
  const stops = gradient.stops.map((stop, idx) => {
    if (idx !== index) return stop;
    return {
      color: updates.color ?? stop.color,
      position: updates.position ?? stop.position,
    };
  });
  stops.sort((a, b) => a.position - b.position);
  return {
    ...gradient,
    stops,
  };
};

import type { Transform } from './types';

/**
 * Преобразует экранные координаты в координаты мира (с учётом pan/zoom)
 */
export function screenToWorld(
  e: React.PointerEvent | React.WheelEvent | React.MouseEvent,
  svg: SVGSVGElement | null,
  transform: Transform
) {
  if (!svg) return { x: 0, y: 0 };
  const rect = svg.getBoundingClientRect();
  const screenX = 'clientX' in e ? e.clientX : 0;
  const screenY = 'clientY' in e ? e.clientY : 0;
  return {
    x: (screenX - rect.left - transform.x) / transform.k,
    y: (screenY - rect.top - transform.y) / transform.k,
  };
}

/**
 * Ограничивает значение в пределах min-max
 */
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Парсит возраст из строки (заменяет запятую на точку, убирает лидирующие нули)
 */
export function parseAge(value: string): number {
  const cleaned = value.replace(',', '.').replace(/^0+(?=\d)/, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Русское склонение: pluralizeRu(3, ['событие', 'события', 'событий']) → 'события'
 */
export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export { removeUndefined } from '../../utils/removeUndefined';

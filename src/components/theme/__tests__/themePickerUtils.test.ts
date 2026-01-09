import { describe, it, expect } from 'vitest';
import {
  hexRegex,
  gradientsEqual,
  sanitizeHex,
  clampValue,
  addStop,
  removeStop,
  updateStop,
} from '../themePickerUtils';
import type { Gradient } from '../../../types/themes';

describe('themePickerUtils', () => {
  describe('hexRegex', () => {
    it('matches valid 6-digit hex colors', () => {
      expect(hexRegex.test('#FFFFFF')).toBe(true);
      expect(hexRegex.test('#000000')).toBe(true);
      expect(hexRegex.test('#abc123')).toBe(true);
      expect(hexRegex.test('FFFFFF')).toBe(true);
      expect(hexRegex.test('abc123')).toBe(true);
    });

    it('rejects invalid hex colors', () => {
      expect(hexRegex.test('#FFF')).toBe(false);
      expect(hexRegex.test('#GGGGGG')).toBe(false);
      expect(hexRegex.test('invalid')).toBe(false);
      expect(hexRegex.test('')).toBe(false);
    });
  });

  describe('sanitizeHex', () => {
    it('adds # prefix if missing', () => {
      expect(sanitizeHex('FFFFFF')).toBe('#FFFFFF');
    });

    it('keeps # prefix if present', () => {
      expect(sanitizeHex('#FFFFFF')).toBe('#FFFFFF');
    });

    it('converts to uppercase', () => {
      expect(sanitizeHex('#ffffff')).toBe('#FFFFFF');
      expect(sanitizeHex('abc123')).toBe('#ABC123');
    });
  });

  describe('clampValue', () => {
    it('returns value when within range', () => {
      expect(clampValue(50, 0, 100)).toBe(50);
    });

    it('clamps to min when value is below', () => {
      expect(clampValue(-10, 0, 100)).toBe(0);
    });

    it('clamps to max when value is above', () => {
      expect(clampValue(150, 0, 100)).toBe(100);
    });
  });

  describe('gradientsEqual', () => {
    const gradient1: Gradient = {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#000000', position: 100 },
      ],
    };

    it('returns true for equal gradients', () => {
      const gradient2 = { ...gradient1 };
      expect(gradientsEqual(gradient1, gradient2)).toBe(true);
    });

    it('returns false when types differ', () => {
      const gradient2: Gradient = { ...gradient1, type: 'radial' };
      expect(gradientsEqual(gradient1, gradient2)).toBe(false);
    });

    it('returns false when angles differ', () => {
      const gradient2: Gradient = { ...gradient1, angle: 45 };
      expect(gradientsEqual(gradient1, gradient2)).toBe(false);
    });

    it('returns false when stops count differs', () => {
      const gradient2: Gradient = {
        ...gradient1,
        stops: [{ color: '#FFFFFF', position: 0 }],
      };
      expect(gradientsEqual(gradient1, gradient2)).toBe(false);
    });

    it('returns false when stop colors differ', () => {
      const gradient2: Gradient = {
        ...gradient1,
        stops: [
          { color: '#FF0000', position: 0 },
          { color: '#000000', position: 100 },
        ],
      };
      expect(gradientsEqual(gradient1, gradient2)).toBe(false);
    });

    it('compares colors case-insensitively', () => {
      const gradient2: Gradient = {
        ...gradient1,
        stops: [
          { color: '#ffffff', position: 0 },
          { color: '#000000', position: 100 },
        ],
      };
      expect(gradientsEqual(gradient1, gradient2)).toBe(true);
    });
  });

  describe('addStop', () => {
    const baseGradient: Gradient = {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#000000', position: 100 },
      ],
    };

    it('adds a new stop at midpoint', () => {
      const result = addStop(baseGradient);
      expect(result.stops.length).toBe(3);
      expect(result.stops[1].position).toBe(50);
    });

    it('does not modify original gradient', () => {
      addStop(baseGradient);
      expect(baseGradient.stops.length).toBe(2);
    });

    it('does not add stop if already at 8 stops', () => {
      const fullGradient: Gradient = {
        ...baseGradient,
        stops: Array.from({ length: 8 }, (_, i) => ({
          color: '#FFFFFF',
          position: i * 12.5,
        })),
      };
      const result = addStop(fullGradient);
      expect(result.stops.length).toBe(8);
    });
  });

  describe('removeStop', () => {
    const baseGradient: Gradient = {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#808080', position: 50 },
        { color: '#000000', position: 100 },
      ],
    };

    it('removes stop at specified index', () => {
      const result = removeStop(baseGradient, 1);
      expect(result.stops.length).toBe(2);
      expect(result.stops[0].color).toBe('#FFFFFF');
      expect(result.stops[1].color).toBe('#000000');
    });

    it('does not remove if only 2 stops remain', () => {
      const twoStopGradient: Gradient = {
        ...baseGradient,
        stops: [
          { color: '#FFFFFF', position: 0 },
          { color: '#000000', position: 100 },
        ],
      };
      const result = removeStop(twoStopGradient, 0);
      expect(result.stops.length).toBe(2);
    });

    it('does not modify original gradient', () => {
      removeStop(baseGradient, 1);
      expect(baseGradient.stops.length).toBe(3);
    });
  });

  describe('updateStop', () => {
    const baseGradient: Gradient = {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#000000', position: 100 },
      ],
    };

    it('updates stop color', () => {
      const result = updateStop(baseGradient, 0, { color: '#FF0000' });
      expect(result.stops[0].color).toBe('#FF0000');
    });

    it('updates stop position', () => {
      const result = updateStop(baseGradient, 0, { position: 25 });
      expect(result.stops[0].position).toBe(25);
    });

    it('sorts stops by position after update', () => {
      const result = updateStop(baseGradient, 0, { position: 150 });
      expect(result.stops[0].position).toBe(100);
      expect(result.stops[1].position).toBe(150);
    });

    it('does not modify original gradient', () => {
      updateStop(baseGradient, 0, { color: '#FF0000' });
      expect(baseGradient.stops[0].color).toBe('#FFFFFF');
    });
  });
});

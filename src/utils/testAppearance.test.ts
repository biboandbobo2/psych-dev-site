import { describe, it, expect } from 'vitest';
import { hexToRgba, mergeAppearance } from './testAppearance';

describe('hexToRgba', () => {
  it('should convert hex color to rgba with alpha', () => {
    const result = hexToRgba('#7c3aed', 0.5);
    expect(result).toBe('rgba(124, 58, 237, 0.5)');
  });

  it('should handle shorthand hex colors', () => {
    const result = hexToRgba('#fff', 0.8);
    expect(result).toBe('rgba(255, 255, 255, 0.8)');
  });

  it('should handle colors without hash', () => {
    const result = hexToRgba('ff0000', 0.5);
    expect(result).toBe('rgba(255, 0, 0, 0.5)');
  });
});

describe('mergeAppearance', () => {
  it('should merge with default appearance when no custom provided', () => {
    const result = mergeAppearance();
    expect(result).toHaveProperty('introIcon');
    expect(result).toHaveProperty('backgroundGradientFrom');
    expect(result).toHaveProperty('accentGradientFrom');
  });

  it('should override defaults with custom values', () => {
    const custom = {
      introIcon: '🚀',
    };
    const result = mergeAppearance(custom);
    expect(result.introIcon).toBe('🚀');
  });

  it('should preserve default values when not overridden', () => {
    const custom = {
      introIcon: '🎨',
    };
    const result = mergeAppearance(custom);
    expect(result.introIcon).toBe('🎨');
    expect(result.backgroundGradientFrom).toBeTruthy();
  });
});

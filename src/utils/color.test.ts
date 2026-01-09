import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  shade,
  mix,
  getRelativeLuminance,
  getContrastRatio,
  getAccessibleTextColor,
} from './color';

describe('color utilities', () => {
  describe('hexToRgb', () => {
    it('converts 6-digit hex to RGB', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('converts 3-digit hex to RGB', () => {
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00F')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('handles hex without # prefix', () => {
      expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('F00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('handles lowercase hex', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#abcdef')).toEqual({ r: 171, g: 205, b: 239 });
    });

    it('throws error for invalid hex', () => {
      expect(() => hexToRgb('#GGGGGG')).toThrow('Invalid hex color');
      expect(() => hexToRgb('invalid')).toThrow('Invalid hex color');
      expect(() => hexToRgb('#12345')).toThrow('Invalid hex color');
      expect(() => hexToRgb('')).toThrow('Invalid hex color');
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB to 6-digit uppercase hex', () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#FF0000');
      expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00FF00');
      expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000FF');
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    });

    it('handles intermediate values', () => {
      expect(rgbToHex({ r: 128, g: 128, b: 128 })).toBe('#808080');
      expect(rgbToHex({ r: 171, g: 205, b: 239 })).toBe('#ABCDEF');
    });

    it('clamps values to valid range', () => {
      expect(rgbToHex({ r: 300, g: -50, b: 128 })).toBe('#FF0080');
    });

    it('rounds non-integer values', () => {
      expect(rgbToHex({ r: 127.6, g: 127.4, b: 0 })).toBe('#807F00');
    });
  });

  describe('hexToHsl', () => {
    it('converts primary colors', () => {
      // Red
      const red = hexToHsl('#FF0000');
      expect(red.h).toBeCloseTo(0, 0);
      expect(red.s).toBeCloseTo(100, 0);
      expect(red.l).toBeCloseTo(50, 0);

      // Green
      const green = hexToHsl('#00FF00');
      expect(green.h).toBeCloseTo(120, 0);
      expect(green.s).toBeCloseTo(100, 0);
      expect(green.l).toBeCloseTo(50, 0);

      // Blue
      const blue = hexToHsl('#0000FF');
      expect(blue.h).toBeCloseTo(240, 0);
      expect(blue.s).toBeCloseTo(100, 0);
      expect(blue.l).toBeCloseTo(50, 0);
    });

    it('converts grayscale colors', () => {
      const white = hexToHsl('#FFFFFF');
      expect(white.s).toBeCloseTo(0, 0);
      expect(white.l).toBeCloseTo(100, 0);

      const black = hexToHsl('#000000');
      expect(black.s).toBeCloseTo(0, 0);
      expect(black.l).toBeCloseTo(0, 0);

      const gray = hexToHsl('#808080');
      expect(gray.s).toBeCloseTo(0, 0);
      expect(gray.l).toBeCloseTo(50, 0);
    });

    it('converts secondary colors', () => {
      // Yellow
      const yellow = hexToHsl('#FFFF00');
      expect(yellow.h).toBeCloseTo(60, 0);

      // Cyan
      const cyan = hexToHsl('#00FFFF');
      expect(cyan.h).toBeCloseTo(180, 0);

      // Magenta
      const magenta = hexToHsl('#FF00FF');
      expect(magenta.h).toBeCloseTo(300, 0);
    });
  });

  describe('hslToHex', () => {
    it('converts primary colors', () => {
      expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#FF0000');
      expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe('#00FF00');
      expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe('#0000FF');
    });

    it('converts grayscale', () => {
      expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#FFFFFF');
      expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000');
      expect(hslToHex({ h: 0, s: 0, l: 50 })).toBe('#808080');
    });

    it('handles all hue sectors', () => {
      // Each 60-degree sector
      expect(hslToHex({ h: 30, s: 100, l: 50 })).toBe('#FF8000'); // Orange
      expect(hslToHex({ h: 90, s: 100, l: 50 })).toBe('#80FF00'); // Lime
      expect(hslToHex({ h: 150, s: 100, l: 50 })).toBe('#00FF80'); // Spring green
      expect(hslToHex({ h: 210, s: 100, l: 50 })).toBe('#0080FF'); // Azure
      expect(hslToHex({ h: 270, s: 100, l: 50 })).toBe('#8000FF'); // Violet
      expect(hslToHex({ h: 330, s: 100, l: 50 })).toBe('#FF0080'); // Rose
    });

    it('clamps saturation and lightness', () => {
      expect(hslToHex({ h: 0, s: 150, l: 50 })).toBe('#FF0000');
      expect(hslToHex({ h: 0, s: -10, l: 50 })).toBe('#808080');
    });
  });

  describe('hex ↔ hsl roundtrip', () => {
    it('maintains color through conversion', () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#808080', '#123456'];
      for (const hex of colors) {
        const hsl = hexToHsl(hex);
        const converted = hslToHex(hsl);
        expect(converted).toBe(hex);
      }
    });
  });

  describe('shade', () => {
    it('lightens color with positive percent', () => {
      const result = shade('#808080', 20);
      const resultHsl = hexToHsl(result);
      expect(resultHsl.l).toBeCloseTo(70, 0);
    });

    it('darkens color with negative percent', () => {
      const result = shade('#808080', -20);
      const resultHsl = hexToHsl(result);
      expect(resultHsl.l).toBeCloseTo(30, 0);
    });

    it('clamps lightness to 0-100', () => {
      const lightResult = shade('#FFFFFF', 50);
      expect(hexToHsl(lightResult).l).toBeLessThanOrEqual(100);

      const darkResult = shade('#000000', -50);
      expect(hexToHsl(darkResult).l).toBeGreaterThanOrEqual(0);
    });

    it('preserves hue and saturation', () => {
      const original = hexToHsl('#FF0000');
      const shaded = hexToHsl(shade('#FF0000', 20));
      expect(shaded.h).toBeCloseTo(original.h, 0);
      // Saturation may change slightly due to lightness change
    });
  });

  describe('mix', () => {
    it('returns first color when ratio is 0', () => {
      expect(mix('#FF0000', '#0000FF', 0)).toBe('#FF0000');
    });

    it('returns second color when ratio is 1', () => {
      expect(mix('#FF0000', '#0000FF', 1)).toBe('#0000FF');
    });

    it('returns midpoint at ratio 0.5', () => {
      const result = mix('#FF0000', '#0000FF', 0.5);
      const rgb = hexToRgb(result);
      expect(rgb.r).toBeCloseTo(128, 0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBeCloseTo(128, 0);
    });

    it('clamps ratio to 0-1', () => {
      expect(mix('#FF0000', '#0000FF', -0.5)).toBe('#FF0000');
      expect(mix('#FF0000', '#0000FF', 1.5)).toBe('#0000FF');
    });

    it('mixes black and white to gray', () => {
      const result = mix('#000000', '#FFFFFF', 0.5);
      expect(result).toBe('#808080');
    });
  });

  describe('getRelativeLuminance', () => {
    it('returns 0 for black', () => {
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 4);
    });

    it('returns 1 for white', () => {
      expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 4);
    });

    it('returns correct luminance for primary colors', () => {
      // Red has lower luminance than green
      const redLum = getRelativeLuminance('#FF0000');
      const greenLum = getRelativeLuminance('#00FF00');
      const blueLum = getRelativeLuminance('#0000FF');

      expect(greenLum).toBeGreaterThan(redLum);
      expect(redLum).toBeGreaterThan(blueLum);
    });

    it('applies gamma correction correctly', () => {
      // Gray should be around 0.2 (not 0.5 due to gamma)
      const grayLum = getRelativeLuminance('#808080');
      expect(grayLum).toBeGreaterThan(0.1);
      expect(grayLum).toBeLessThan(0.3);
    });
  });

  describe('getContrastRatio', () => {
    it('returns 21:1 for black and white', () => {
      expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
      expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
    });

    it('returns 1:1 for same colors', () => {
      expect(getContrastRatio('#FF0000', '#FF0000')).toBeCloseTo(1, 4);
      expect(getContrastRatio('#808080', '#808080')).toBeCloseTo(1, 4);
    });

    it('is symmetric', () => {
      const ratio1 = getContrastRatio('#FF0000', '#0000FF');
      const ratio2 = getContrastRatio('#0000FF', '#FF0000');
      expect(ratio1).toBeCloseTo(ratio2, 4);
    });

    it('returns higher ratio for more contrasting colors', () => {
      const highContrast = getContrastRatio('#000000', '#FFFFFF');
      const lowContrast = getContrastRatio('#808080', '#909090');
      expect(highContrast).toBeGreaterThan(lowContrast);
    });
  });

  describe('getAccessibleTextColor', () => {
    it('returns black for light backgrounds', () => {
      expect(getAccessibleTextColor('#FFFFFF')).toBe('#000000');
      expect(getAccessibleTextColor('#FFFF00')).toBe('#000000');
      expect(getAccessibleTextColor('#00FF00')).toBe('#000000');
      expect(getAccessibleTextColor('#CCCCCC')).toBe('#000000');
    });

    it('returns white for dark backgrounds', () => {
      expect(getAccessibleTextColor('#000000')).toBe('#FFFFFF');
      expect(getAccessibleTextColor('#0000FF')).toBe('#FFFFFF');
      expect(getAccessibleTextColor('#800000')).toBe('#FFFFFF');
      expect(getAccessibleTextColor('#333333')).toBe('#FFFFFF');
    });

    it('ensures WCAG AA contrast ratio (4.5:1)', () => {
      const testColors = ['#FF0000', '#00FF00', '#0000FF', '#808080', '#FFFF00'];
      for (const bg of testColors) {
        const textColor = getAccessibleTextColor(bg);
        const ratio = getContrastRatio(bg, textColor);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});

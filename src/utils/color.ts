const HEX_REGEX = /^#?([a-f\d]{3}|[a-f\d]{6})$/i;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export function hexToRgb(hex: string): Rgb {
  if (!HEX_REGEX.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const intVal = parseInt(sanitized, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (value: number) => {
    const hexValue = Math.round(clamp(value, 0, 255)).toString(16);
    return hexValue.length === 1 ? `0${hexValue}` : hexValue;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: ((h * 60) + 360) % 360,
    s: clamp(s) * 100,
    l: clamp(l) * 100,
  };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sNorm = clamp(s / 100, 0, 1);
  const lNorm = clamp(l / 100, 0, 1);

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  const rgb: Rgb = {
    r: (rPrime + m) * 255,
    g: (gPrime + m) * 255,
    b: (bPrime + m) * 255,
  };

  return rgbToHex(rgb);
}

export function shade(hex: string, percent: number): string {
  const hsl = hexToHsl(hex);
  hsl.l = clamp(hsl.l + percent, 0, 100);
  return hslToHex(hsl);
}

export function mix(colorA: string, colorB: string, ratio: number): string {
  const alpha = clamp(ratio, 0, 1);
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  const mixComponent = (a: number, b: number) => a * (1 - alpha) + b * alpha;
  return rgbToHex({
    r: mixComponent(rgbA.r, rgbB.r),
    g: mixComponent(rgbA.g, rgbB.g),
    b: mixComponent(rgbA.b, rgbB.b),
  });
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  const rL = transform(r);
  const gL = transform(g);
  const bL = transform(b);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

export function getContrastRatio(colorA: string, colorB: string): number {
  const luminanceA = getRelativeLuminance(colorA);
  const luminanceB = getRelativeLuminance(colorB);
  const brightest = Math.max(luminanceA, luminanceB);
  const darkest = Math.min(luminanceA, luminanceB);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function getAccessibleTextColor(backgroundHex: string): '#000000' | '#FFFFFF' {
  return getContrastRatio(backgroundHex, '#000000') >= 4.5 ? '#000000' : '#FFFFFF';
}

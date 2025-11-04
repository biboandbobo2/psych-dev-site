import { THEME_PRESETS } from '../constants/themePresets';
import type { DerivedTheme, Gradient, ThemeOverrides, ThemePreset } from '../types/themes';
import { shade, mix, getContrastRatio } from './color';

const WHITE = '#FFFFFF';

export const cloneGradient = (gradient: Gradient): Gradient => ({
  type: gradient.type,
  angle: gradient.angle,
  stops: gradient.stops.map((stop) => ({ ...stop })),
});

export function findPresetById(presetId: string): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === presetId) ?? THEME_PRESETS[0];
}

const ensureStops = (gradient: Gradient): Gradient => {
  if (!gradient.stops || gradient.stops.length === 0) {
    return {
      ...gradient,
      stops: [
        { color: '#000000', position: 0 },
        { color: '#000000', position: 100 },
      ],
    };
  }
  if (gradient.stops.length === 1) {
    const color = gradient.stops[0].color;
    return {
      ...gradient,
      stops: [
        { color, position: 0 },
        { color, position: 100 },
      ],
    };
  }
  return gradient;
};

const defaultPrimaryFromMain = (mainColor: string): Gradient => ({
  type: 'linear',
  angle: 135,
  stops: [
    { color: shade(mainColor, -8), position: 0 },
    { color: shade(mainColor, 8), position: 100 },
  ],
});

const defaultBackgroundFromMain = (preset: ThemePreset, mainColor: string): Gradient => ({
  type: 'linear',
  angle: preset.background.angle ?? 135,
  stops: [
    { color: mix(mainColor, WHITE, 0.92), position: 0 },
    { color: mix(mainColor, WHITE, 0.85), position: 100 },
  ],
});

const defaultBadgeFromMain = (preset: ThemePreset, mainColor: string): Gradient =>
  preset.badge
    ? cloneGradient(preset.badge)
    : {
        type: 'linear',
        angle: preset.primary.angle ?? 135,
        stops: [
          { color: shade(mainColor, -6), position: 0 },
          { color: shade(mainColor, 12), position: 100 },
        ],
      };

const applyOverrides = (base: Gradient, override?: Gradient): Gradient => {
  if (!override) {
    return ensureStops(base);
  }
  return ensureStops({
    ...base,
    ...override,
    stops: override.stops && override.stops.length > 0 ? override.stops.map((stop) => ({ ...stop })) : base.stops,
  });
};

export function deriveTheme(
  preset: ThemePreset,
  mainColor: string,
  badgeLocked: boolean,
  overrides?: ThemeOverrides
): DerivedTheme {
  const basePrimary = defaultPrimaryFromMain(mainColor);
  const baseBackground = defaultBackgroundFromMain(preset, mainColor);
  const baseBadge = badgeLocked ? basePrimary : defaultBadgeFromMain(preset, mainColor);

  return {
    background: applyOverrides(baseBackground, overrides?.background),
    primary: applyOverrides(basePrimary, overrides?.primary),
    badge: badgeLocked ? applyOverrides(basePrimary, badgeLocked ? undefined : overrides?.badge) : applyOverrides(baseBadge, overrides?.badge),
  };
}

export function gradientToCss(gradient: Gradient): string {
  const stops = gradient.stops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(', ');

  if (gradient.type === 'radial') {
    return `radial-gradient(circle, ${stops})`;
  }

  const angle = gradient.angle ?? 135;
  return `linear-gradient(${angle}deg, ${stops})`;
}

export function firstAndLastStops(gradient: Gradient): { start: string; end: string } {
  if (!gradient.stops.length) {
    return { start: '#000000', end: '#000000' };
  }
  const first = gradient.stops[0].color;
  const last = gradient.stops[gradient.stops.length - 1].color;
  return { start: first, end: last };
}

export function averageColorOfGradient(gradient: Gradient): string {
  if (!gradient.stops.length) return '#7C3AED';
  const midpoint = gradient.stops[Math.floor(gradient.stops.length / 2)];
  return midpoint.color;
}

export function getPresetDefaultMainColor(preset: ThemePreset): string {
  return averageColorOfGradient(preset.primary);
}

export function getButtonTextColor(primaryGradient: Gradient): '#000000' | '#FFFFFF' {
  const { start, end } = firstAndLastStops(primaryGradient);
  const candidates: Array<'#000000' | '#FFFFFF'> = ['#000000', '#FFFFFF'];
  let best: { color: '#000000' | '#FFFFFF'; score: number } = {
    color: '#FFFFFF',
    score: 0,
  };

  for (const candidate of candidates) {
    const contrastStart = getContrastRatio(candidate, start);
    const contrastEnd = getContrastRatio(candidate, end);
    const score = Math.min(contrastStart, contrastEnd);
    if (score > best.score) {
      best = { color: candidate, score };
    }
  }

  return best.color;
}

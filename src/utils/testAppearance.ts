import type { TestAppearance } from '../types/tests';
import type { ThemeSettings, ThemeOverrides, Gradient } from '../types/themes';
import { THEME_PRESETS } from '../constants/themePresets';
import {
  deriveTheme,
  findPresetById,
  firstAndLastStops,
  getPresetDefaultMainColor,
  gradientToCss,
} from './theme';
import { mix } from './color';

const sanitizeHex = (value: string): string => {
  const normalized = value.startsWith('#') ? value : `#${value}`;
  return normalized.toUpperCase();
};

const cloneOverrides = (overrides?: ThemeOverrides): ThemeOverrides | undefined => {
  if (!overrides) return undefined;
  const next: ThemeOverrides = {};
  if (overrides.background) next.background = { ...overrides.background, stops: overrides.background.stops.map((stop) => ({ ...stop })) };
  if (overrides.primary) next.primary = { ...overrides.primary, stops: overrides.primary.stops.map((stop) => ({ ...stop })) };
  if (overrides.badge) next.badge = { ...overrides.badge, stops: overrides.badge.stops.map((stop) => ({ ...stop })) };
  return Object.keys(next).length ? next : undefined;
};

// Lazy initialization to avoid "Cannot access uninitialized variable" in production
let _DEFAULT_PRESET: typeof THEME_PRESETS[0] | null = null;
let _DEFAULT_THEME_SETTINGS: ThemeSettings | null = null;
let _DEFAULT_TEST_APPEARANCE: TestAppearance | null = null;

function getDefaultPreset() {
  if (!_DEFAULT_PRESET) {
    _DEFAULT_PRESET = THEME_PRESETS[0];
  }
  return _DEFAULT_PRESET;
}

function getDefaultThemeSettings(): ThemeSettings {
  if (!_DEFAULT_THEME_SETTINGS) {
    const preset = getDefaultPreset();
    _DEFAULT_THEME_SETTINGS = {
      presetId: preset.id,
      mainColor: getPresetDefaultMainColor(preset),
      badgeLockedToPrimary: true,
    };
  }
  return _DEFAULT_THEME_SETTINGS;
}

export function getDefaultTestAppearance(): TestAppearance {
  if (!_DEFAULT_TEST_APPEARANCE) {
    _DEFAULT_TEST_APPEARANCE = {
      introIcon: '📝',
      introDescription: 'Проверьте свои знания и закрепите материал курса.',
      backgroundGradientFrom: '#f5f3ff',
      backgroundGradientTo: '#e0f2fe',
      accentGradientFrom: '#7c3aed',
      accentGradientTo: '#3b82f6',
      badgeGradientFrom: '#7c3aed',
      badgeGradientTo: '#3b82f6',
      theme: getDefaultThemeSettings(),
    };
  }
  return _DEFAULT_TEST_APPEARANCE;
}

// Export as lazy Proxy to avoid top-level function call
export const DEFAULT_TEST_APPEARANCE: TestAppearance = new Proxy(
  {} as TestAppearance,
  {
    get(target, prop) {
      const appearance = getDefaultTestAppearance();
      return appearance[prop as keyof TestAppearance];
    },
  }
);

export function mergeAppearance(appearance?: TestAppearance): TestAppearance {
  const rawTheme = appearance?.theme;
  const preset = findPresetById(rawTheme?.presetId ?? getDefaultThemeSettings().presetId);

  let mainColor = rawTheme?.mainColor ?? getPresetDefaultMainColor(preset);
  if (!rawTheme?.mainColor && appearance?.accentGradientFrom && appearance?.accentGradientTo) {
    try {
      mainColor = sanitizeHex(mix(appearance.accentGradientFrom, appearance.accentGradientTo, 0.5));
    } catch {
      mainColor = getPresetDefaultMainColor(preset);
    }
  }
  mainColor = sanitizeHex(mainColor);

  let badgeLocked = rawTheme?.badgeLockedToPrimary;
  if (badgeLocked === undefined) {
    const primaryFrom = appearance?.accentGradientFrom?.toLowerCase();
    const primaryTo = appearance?.accentGradientTo?.toLowerCase();
    const badgeFrom = appearance?.badgeGradientFrom?.toLowerCase();
    const badgeTo = appearance?.badgeGradientTo?.toLowerCase();
    badgeLocked = !(
      badgeFrom &&
      badgeTo &&
      primaryFrom &&
      primaryTo &&
      (badgeFrom !== primaryFrom || badgeTo !== primaryTo)
    );
  }
  badgeLocked = badgeLocked ?? true;

  let themeOverrides = cloneOverrides(rawTheme?.overrides);

  if (!rawTheme) {
    const fallbackOverrides: ThemeOverrides = {};
    if (appearance?.backgroundGradientFrom && appearance?.backgroundGradientTo) {
      fallbackOverrides.background = {
        type: 'linear',
        angle: 135,
        stops: [
          { color: sanitizeHex(appearance.backgroundGradientFrom), position: 0 },
          { color: sanitizeHex(appearance.backgroundGradientTo), position: 100 },
        ],
      };
    }
    if (appearance?.accentGradientFrom && appearance?.accentGradientTo) {
      fallbackOverrides.primary = {
        type: 'linear',
        angle: 135,
        stops: [
          { color: sanitizeHex(appearance.accentGradientFrom), position: 0 },
          { color: sanitizeHex(appearance.accentGradientTo), position: 100 },
        ],
      };
    }
    if (!badgeLocked && appearance?.badgeGradientFrom && appearance?.badgeGradientTo) {
      fallbackOverrides.badge = {
        type: 'linear',
        angle: 135,
        stops: [
          { color: sanitizeHex(appearance.badgeGradientFrom), position: 0 },
          { color: sanitizeHex(appearance.badgeGradientTo), position: 100 },
        ],
      };
    }
    themeOverrides = cloneOverrides(fallbackOverrides);
  }

  const derived = deriveTheme(preset, mainColor, badgeLocked, themeOverrides);

  const defaultAppearance = getDefaultTestAppearance();
  const resolved: TestAppearance = {
    ...defaultAppearance,
    ...(appearance ?? {}),
    bulletPoints: appearance?.bulletPoints
      ? appearance.bulletPoints.filter(Boolean)
      : defaultAppearance.bulletPoints,
    theme: {
      presetId: preset.id,
      mainColor,
      badgeLockedToPrimary: badgeLocked,
      overrides: themeOverrides,
    },
    resolvedTheme: derived,
  };

  const backgroundStops = firstAndLastStops(derived.background);
  const primaryStops = firstAndLastStops(derived.primary);
  const badgeStops = firstAndLastStops(derived.badge);

  resolved.backgroundGradientFrom = backgroundStops.start;
  resolved.backgroundGradientTo = backgroundStops.end;
  resolved.accentGradientFrom = primaryStops.start;
  resolved.accentGradientTo = primaryStops.end;
  resolved.badgeGradientFrom = badgeStops.start;
  resolved.badgeGradientTo = badgeStops.end;

  return resolved;
}

export function createGradient(from?: string, to?: string, gradient?: Gradient): string {
  if (gradient) {
    return gradientToCss(gradient);
  }
  const start = from || '#7c3aed';
  const end = to || start || '#7c3aed';
  return `linear-gradient(135deg, ${start}, ${end})`;
}

export function hexToRgba(hex: string | undefined, alpha: number): string {
  if (!hex) return `rgba(124, 58, 237, ${alpha})`;
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (sanitized.length !== 6) {
    return `rgba(124, 58, 237, ${alpha})`;
  }
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

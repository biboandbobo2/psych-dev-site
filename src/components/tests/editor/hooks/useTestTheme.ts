import { useState, useMemo, useCallback } from 'react';
import type { TestAppearance, ThemePreset } from '../../../../types/tests';
import type { ThemeOverrides, DerivedTheme } from '../../../../types/themes';
import { mergeAppearance } from '../../../../utils/testAppearance';
import { THEME_PRESETS } from '../../../../constants/themePresets';
import {
  deriveTheme,
  findPresetById,
  getPresetDefaultMainColor,
  firstAndLastStops,
  getButtonTextColor,
  cloneGradient,
} from '../../../../utils/theme';
import { hexToHsl, hslToHex, getContrastRatio } from '../../../../utils/color';

const HEX_COLOR_REGEX = /^#?[0-9a-f]{6}$/i;

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sanitizeHex = (value: string): string => {
  const normalized = value.startsWith('#') ? value : `#${value}`;
  return normalized.toUpperCase();
};

const randomizeAroundColor = (hex: string): string => {
  try {
    const hsl = hexToHsl(hex);
    const newHue = (hsl.h + (Math.random() * 40 - 20) + 360) % 360;
    const newSaturation = clampValue(hsl.s + (Math.random() * 20 - 10), 30, 90);
    const newLightness = clampValue(hsl.l + (Math.random() * 16 - 8), 30, 85);
    return hslToHex({
      h: newHue,
      s: newSaturation,
      l: newLightness,
    });
  } catch {
    return hex;
  }
};

const cloneThemeOverrides = (overrides?: ThemeOverrides): ThemeOverrides | undefined => {
  if (!overrides) return undefined;
  const next: ThemeOverrides = {};
  if (overrides.background) next.background = cloneGradient(overrides.background);
  if (overrides.primary) next.primary = cloneGradient(overrides.primary);
  if (overrides.badge) next.badge = cloneGradient(overrides.badge);
  return Object.keys(next).length ? next : undefined;
};

export function useTestTheme() {
  // Appearance state
  const [appearance, setAppearance] = useState<TestAppearance>(mergeAppearance());
  const [appearanceBullets, setAppearanceBullets] = useState('');

  // Badge configuration
  const [showBadgeConfig, setShowBadgeConfig] = useState<boolean>(false);

  // Theme state
  const [themePresetId, setThemePresetId] = useState<string>(THEME_PRESETS[0].id);
  const [mainColor, setMainColor] = useState<string>(getPresetDefaultMainColor(THEME_PRESETS[0]));
  const [badgeLockedToPrimary, setBadgeLockedToPrimary] = useState<boolean>(true);
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverrides | undefined>(undefined);
  const [themeAdvancedOpen, setThemeAdvancedOpen] = useState<boolean>(false);

  // Set appearance from loaded test
  const setAppearanceFromTest = useCallback((value?: TestAppearance) => {
    const merged = mergeAppearance(value);
    setAppearance(merged);
    setAppearanceBullets((value?.bulletPoints ?? []).join('\n'));
    const themeSettings = merged.theme ?? {
      presetId: THEME_PRESETS[0].id,
      mainColor: getPresetDefaultMainColor(THEME_PRESETS[0]),
      badgeLockedToPrimary: true,
    };
    setThemePresetId(themeSettings.presetId);
    setMainColor(themeSettings.mainColor);
    setBadgeLockedToPrimary(themeSettings.badgeLockedToPrimary ?? true);
    setThemeOverrides(cloneThemeOverrides(themeSettings.overrides));
    setThemeAdvancedOpen(false);
  }, []);

  // Current theme preset
  const currentThemePreset: ThemePreset = useMemo(
    () => findPresetById(themePresetId),
    [themePresetId]
  );

  // Base theme (without overrides)
  const baseTheme: DerivedTheme = useMemo(
    () => deriveTheme(currentThemePreset, mainColor, badgeLockedToPrimary, undefined),
    [currentThemePreset, mainColor, badgeLockedToPrimary]
  );

  // Derived theme (with overrides)
  const derivedTheme: DerivedTheme = useMemo(
    () => deriveTheme(currentThemePreset, mainColor, badgeLockedToPrimary, themeOverrides),
    [currentThemePreset, mainColor, badgeLockedToPrimary, themeOverrides]
  );

  // Button text color and contrast
  const buttonTextColor = useMemo(
    () => getButtonTextColor(derivedTheme.primary),
    [derivedTheme]
  );

  const primaryStops = useMemo(() => firstAndLastStops(derivedTheme.primary), [derivedTheme]);

  const buttonContrast = useMemo(
    () =>
      Math.min(
        getContrastRatio(buttonTextColor, primaryStops.start),
        getContrastRatio(buttonTextColor, primaryStops.end)
      ),
    [buttonTextColor, primaryStops]
  );

  const contrastWarning = buttonContrast < 4.5
    ? `Контраст кнопки ${buttonContrast.toFixed(2)} ниже рекомендуемого уровня 4.5`
    : null;

  // Handlers
  const handlePresetChange = useCallback((id: string) => {
    const preset = findPresetById(id);
    setThemePresetId(preset.id);
    setMainColor(getPresetDefaultMainColor(preset));
    setThemeOverrides(undefined);
    setBadgeLockedToPrimary(true);
  }, []);

  const handleMainColorChange = useCallback((color: string) => {
    setMainColor(sanitizeHex(color));
  }, []);

  const handleBadgeLockedChange = useCallback((value: boolean) => {
    setBadgeLockedToPrimary(value);
    if (value) {
      setThemeOverrides((prev) => {
        if (!prev || !prev.badge) return prev;
        const { badge, ...rest } = prev;
        return Object.keys(rest).length ? rest : undefined;
      });
    }
  }, []);

  const handleOverridesChange = useCallback((next?: ThemeOverrides) => {
    setThemeOverrides(cloneThemeOverrides(next));
  }, []);

  const handleResetTheme = useCallback(() => {
    const preset = findPresetById(themePresetId);
    setMainColor(getPresetDefaultMainColor(preset));
    setThemeOverrides(undefined);
    setBadgeLockedToPrimary(true);
  }, [themePresetId]);

  const handleRandomizeTheme = useCallback(() => {
    setMainColor((prev) => randomizeAroundColor(prev));
  }, []);

  const handleAppearanceChange = useCallback((key: keyof TestAppearance, value: string) => {
    setAppearance((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  }, []);

  const handleToggleBadgeConfig = useCallback((checked: boolean) => {
    setShowBadgeConfig(checked);
    if (!checked) {
      setAppearance((prev) => ({
        ...prev,
        badgeIcon: undefined,
        badgeLabel: undefined,
      }));
    }
  }, []);

  // Build appearance payload for saving
  const buildAppearancePayload = useCallback((): TestAppearance => {
    const bulletPoints = appearanceBullets
      .split('\n')
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-•\u2022]+\s*/, '').trim())
      .filter(Boolean);

    const preset = findPresetById(themePresetId);
    const normalizedOverrides = cloneThemeOverrides(themeOverrides);
    const derived = deriveTheme(preset, mainColor, badgeLockedToPrimary, normalizedOverrides);
    const backgroundStops = firstAndLastStops(derived.background);
    const primaryStops = firstAndLastStops(derived.primary);
    const badgeStops = firstAndLastStops(derived.badge);

    const payload: TestAppearance = {
      ...appearance,
      introIcon: appearance.introIcon?.trim() || undefined,
      introDescription: appearance.introDescription?.trim() || undefined,
      badgeIcon: appearance.badgeIcon?.trim() || undefined,
      badgeLabel: appearance.badgeLabel?.trim() || undefined,
      bulletPoints: bulletPoints.length ? bulletPoints : undefined,
      theme: {
        presetId: preset.id,
        mainColor,
        badgeLockedToPrimary,
        overrides: normalizedOverrides,
      },
      backgroundGradientFrom: backgroundStops.start,
      backgroundGradientTo: backgroundStops.end,
      accentGradientFrom: primaryStops.start,
      accentGradientTo: primaryStops.end,
      badgeGradientFrom: badgeStops.start,
      badgeGradientTo: badgeStops.end,
    };

    if (!showBadgeConfig) {
      payload.badgeIcon = undefined;
      payload.badgeLabel = undefined;
    }

    return payload;
  }, [appearance, appearanceBullets, themePresetId, mainColor, badgeLockedToPrimary, themeOverrides, showBadgeConfig]);

  return {
    // State
    appearance,
    appearanceBullets,
    showBadgeConfig,
    themePresetId,
    mainColor,
    badgeLockedToPrimary,
    themeOverrides,
    themeAdvancedOpen,
    // Computed
    currentThemePreset,
    baseTheme,
    derivedTheme,
    buttonTextColor,
    primaryStops,
    buttonContrast,
    contrastWarning,
    // Handlers
    handlers: {
      handlePresetChange,
      handleMainColorChange,
      handleBadgeLockedChange,
      handleOverridesChange,
      handleResetTheme,
      handleRandomizeTheme,
      handleAppearanceChange,
      handleToggleBadgeConfig,
      setAppearanceBullets,
      setThemeAdvancedOpen,
      setAppearanceFromTest,
    },
    // Utilities
    buildAppearancePayload,
  };
}

import { TestAppearanceEditor } from './TestAppearanceEditor';
import type { TestAppearance, ThemePreset } from '../../../types/tests';
import type { ThemeOverrides, DerivedTheme } from '../../../types/themes';

interface TestThemeSectionProps {
  appearance: TestAppearance;
  onAppearanceChange: (key: keyof TestAppearance, value: string) => void;
  bulletPoints: string;
  onBulletPointsChange: (value: string) => void;
  themePresets: readonly ThemePreset[];
  themePresetId: string;
  onPresetChange: (id: string) => void;
  mainColor: string;
  onMainColorChange: (color: string) => void;
  badgeLockedToPrimary: boolean;
  onBadgeLockedChange: (value: boolean) => void;
  themeOverrides?: ThemeOverrides;
  onOverridesChange: (next?: ThemeOverrides) => void;
  derivedTheme: DerivedTheme;
  baseTheme: DerivedTheme;
  contrastWarning: string | null;
  onResetTheme: () => void;
  onRandomizeTheme: () => void;
  themeAdvancedOpen: boolean;
  onAdvancedToggle: (value: boolean) => void;
  buttonTextColor: string;
  showBadgeConfig: boolean;
  onToggleBadgeConfig: (checked: boolean) => void;
  saving: boolean;
}

/**
 * Wrapper component for test appearance and theme configuration
 */
export function TestThemeSection(props: TestThemeSectionProps) {
  return (
    <TestAppearanceEditor
      appearance={props.appearance}
      onAppearanceChange={props.onAppearanceChange}
      bulletPoints={props.bulletPoints}
      onBulletPointsChange={props.onBulletPointsChange}
      themePresets={props.themePresets}
      themePresetId={props.themePresetId}
      onPresetChange={props.onPresetChange}
      mainColor={props.mainColor}
      onMainColorChange={props.onMainColorChange}
      badgeLockedToPrimary={props.badgeLockedToPrimary}
      onBadgeLockedChange={props.onBadgeLockedChange}
      themeOverrides={props.themeOverrides}
      onOverridesChange={props.onOverridesChange}
      derivedTheme={props.derivedTheme}
      baseTheme={props.baseTheme}
      contrastWarning={props.contrastWarning}
      onResetTheme={props.onResetTheme}
      onRandomizeTheme={props.onRandomizeTheme}
      themeAdvancedOpen={props.themeAdvancedOpen}
      onAdvancedToggle={props.onAdvancedToggle}
      buttonTextColor={props.buttonTextColor}
      showBadgeConfig={props.showBadgeConfig}
      onToggleBadgeConfig={props.onToggleBadgeConfig}
      saving={props.saving}
    />
  );
}

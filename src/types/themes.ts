export type GradientType = 'linear' | 'radial';

export interface GradientStop {
  color: string;
  position: number; // 0..100
}

export interface Gradient {
  type: GradientType;
  angle?: number; // only for linear
  stops: GradientStop[];
}

export type ThemeMood = 'pastel' | 'calm' | 'bright' | 'neutral';

export interface ThemePreset {
  id: string;
  name: string;
  mood: ThemeMood;
  background: Gradient;
  primary: Gradient;
  badge?: Gradient;
}

export interface ThemeOverrides {
  background?: Gradient;
  primary?: Gradient;
  badge?: Gradient;
}

export interface ThemeSettings {
  presetId: string;
  mainColor: string;
  badgeLockedToPrimary?: boolean;
  overrides?: ThemeOverrides;
}

export interface DerivedTheme {
  background: Gradient;
  primary: Gradient;
  badge: Gradient;
}

import { useEffect } from 'react';
import { PERIOD_THEME, DEFAULT_THEME } from '../../../theme/periods';

const hexToRgb = (value: string | undefined) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace('#', '');
  if (trimmed.length === 3) {
    const r = trimmed[0];
    const g = trimmed[1];
    const b = trimmed[2];
    return hexToRgb(`${r}${r}${g}${g}${b}${b}`);
  }
  if (trimmed.length !== 6 || /[^0-9a-fA-F]/.test(trimmed)) return null;
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return `${r} ${g} ${b}`;
};

export function usePeriodTheme(themeKey?: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const theme = themeKey && PERIOD_THEME[themeKey]
      ? PERIOD_THEME[themeKey]
      : DEFAULT_THEME;
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-100', theme.accent100);
    const accentRgb = hexToRgb(theme.accent);
    if (accentRgb) {
      root.style.setProperty('--accent-rgb', accentRgb);
    }
  }, [themeKey]);
}

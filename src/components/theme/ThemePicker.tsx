import { useMemo, useState, useEffect } from 'react';
import type { DerivedTheme, Gradient, ThemeOverrides, ThemePreset } from '../../types/themes';
import { gradientToCss, cloneGradient } from '../../utils/theme';
import { hexRegex, gradientsEqual, sanitizeHex, clampValue } from './themePickerUtils';
import { GradientEditor } from './GradientEditor';

interface ThemePickerProps {
  presets: ThemePreset[];
  presetId: string;
  onPresetChange: (id: string) => void;
  mainColor: string;
  onMainColorChange: (color: string) => void;
  badgeLockedToPrimary: boolean;
  onBadgeLockedChange: (value: boolean) => void;
  overrides?: ThemeOverrides;
  onOverridesChange: (overrides?: ThemeOverrides) => void;
  derivedTheme: DerivedTheme;
  baseTheme: DerivedTheme;
  contrastWarning?: string | null;
  onReset: () => void;
  onRandomize: () => void;
  advancedOpen: boolean;
  onAdvancedToggle: (value: boolean) => void;
  buttonTextColor: string;
}

interface PresetSelectorProps {
  presets: ThemePreset[];
  activeId: string;
  onSelect: (id: string) => void;
}

interface MainColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

interface ThemePreviewProps {
  theme: DerivedTheme;
  buttonTextColor: string;
  contrastWarning?: string | null;
}


const PresetSelector = ({ presets, activeId, onSelect }: PresetSelectorProps) => {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-zinc-800">Пресеты</span>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {presets.map((preset) => {
          const isActive = preset.id === activeId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={`relative h-20 rounded-xl border px-3 py-2 text-left transition shadow-sm ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-zinc-200 hover:border-indigo-300'
              }`}
            >
              <div
                className="absolute inset-0 rounded-xl opacity-60"
                style={{ backgroundImage: gradientToCss(preset.background) }}
                aria-hidden
              />
              <div className="relative flex h-full flex-col justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                  {preset.mood}
                </div>
                <div className="text-sm font-semibold text-zinc-900">{preset.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const MainColorPicker = ({ value, onChange }: MainColorPickerProps) => {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleHexInputChange = (next: string) => {
    setInputValue(next);
    if (hexRegex.test(next)) {
      onChange(sanitizeHex(next));
    }
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-zinc-800">Главный цвет</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => {
            const hex = sanitizeHex(event.target.value);
            setInputValue(hex);
            onChange(hex);
          }}
          className="h-11 w-14 cursor-pointer rounded-lg border border-zinc-300"
        />
        <input
          type="text"
          value={inputValue}
          onChange={(event) => handleHexInputChange(event.target.value)}
          className="h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-[15px] leading-none outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          placeholder="#4B8BFF"
        />
      </div>
      <p className="text-xs text-zinc-500">Изменяет оттенок кнопок и фона пресета.</p>
    </div>
  );
};

const ThemePreview = ({ theme, buttonTextColor, contrastWarning }: ThemePreviewProps) => {
  const primaryCss = useMemo(() => gradientToCss(theme.primary), [theme.primary]);
  const badgeCss = useMemo(() => gradientToCss(theme.badge), [theme.badge]);
  const backgroundCss = useMemo(() => gradientToCss(theme.background), [theme.background]);

  return (
    <div
      className="relative h-[420px] w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 shadow-sm"
      style={{ backgroundImage: backgroundCss }}
    >
      <div className="flex h-full flex-col justify-between p-6 text-zinc-900">
        <div>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundImage: badgeCss }}
          >
            Бейдж
          </span>
          <h4 className="mt-5 text-xl font-bold">Название теста</h4>
          <p className="mt-2 text-sm opacity-80">
            Краткое описание теста, чтобы показать пример оформления. Текст подстраивается под фон.
          </p>
        </div>

        <div className="space-y-3">
          <div className="h-2 w-full rounded-full" style={{ backgroundImage: primaryCss }} />
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold shadow"
            style={{
              backgroundImage: primaryCss,
              color: buttonTextColor,
            }}
          >
            Пройти тест
          </button>
        </div>
      </div>
      {contrastWarning && (
        <div className="absolute inset-x-0 bottom-0 bg-white/90 p-3 text-xs text-amber-700">
          ⚠️ {contrastWarning}
        </div>
      )}
    </div>
  );
};

export function ThemePicker({
  presets,
  presetId,
  onPresetChange,
  mainColor,
  onMainColorChange,
  badgeLockedToPrimary,
  onBadgeLockedChange,
  overrides,
  onOverridesChange,
  derivedTheme,
  baseTheme,
  contrastWarning,
  onReset,
  onRandomize,
  advancedOpen,
  onAdvancedToggle,
  buttonTextColor,
}: ThemePickerProps) {
  const [importJson, setImportJson] = useState('');

  const backgroundGradient = overrides?.background ?? derivedTheme.background;
  const primaryGradient = overrides?.primary ?? derivedTheme.primary;
  const badgeGradient = overrides?.badge ?? derivedTheme.badge;

  const handleOverrideChange = (key: keyof ThemeOverrides, gradient: Gradient) => {
    if (key === 'badge' && badgeLockedToPrimary) {
      return;
    }
    const clone = cloneGradient(gradient);
    const next: ThemeOverrides = {
      ...(overrides ?? {}),
    };
    const baseGradient = baseTheme[key];
    if (gradientsEqual(clone, baseGradient)) {
      delete next[key];
    } else {
      next[key] = clone;
    }
    onOverridesChange(Object.keys(next).length ? next : undefined);
  };

  const handleImport = () => {
    if (!importJson.trim()) return;
    try {
      const parsed = JSON.parse(importJson);
      const maybeGradient = (value: unknown): Gradient | undefined => {
        if (
          value &&
          typeof value === 'object' &&
          'type' in value &&
          (value as any).type &&
          ((value as any).type === 'linear' || (value as any).type === 'radial') &&
          Array.isArray((value as any).stops)
        ) {
          return {
            type: (value as any).type,
            angle: (value as any).angle,
            stops: (value as any).stops.map((stop: any) => ({
              color: sanitizeHex(stop.color),
              position: clampValue(Number(stop.position) || 0, 0, 100),
            })),
          };
        }
        return undefined;
      };

      const nextOverrides: ThemeOverrides = {};
      if (parsed.background) nextOverrides.background = maybeGradient(parsed.background);
      if (parsed.primary) nextOverrides.primary = maybeGradient(parsed.primary);
      if (parsed.badge) nextOverrides.badge = maybeGradient(parsed.badge);

      onOverridesChange(Object.keys(nextOverrides).length ? nextOverrides : undefined);
      setImportJson('');
      alert('Тема импортирована');
    } catch (error) {
      alert('Не удалось импортировать JSON: ' + (error as Error).message);
    }
  };

  const handleExport = async () => {
    const data = {
      presetId,
      mainColor,
      badgeLockedToPrimary,
      theme: derivedTheme,
      overrides,
    };
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert('JSON скопирован в буфер обмена');
    } catch {
      alert('Не удалось скопировать JSON');
    }
  };

  const handleCopyCss = async () => {
    const css = `:root {
  --test-background: ${gradientToCss(derivedTheme.background)};
  --test-primary: ${gradientToCss(derivedTheme.primary)};
  --test-badge: ${gradientToCss(derivedTheme.badge)};
}`;
    try {
      await navigator.clipboard.writeText(css);
      alert('CSS скопирован в буфер обмена');
    } catch {
      alert('Не удалось скопировать CSS');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PresetSelector presets={presets} activeId={presetId} onSelect={onPresetChange} />
        <MainColorPicker value={mainColor} onChange={onMainColorChange} />
      </div>

      <div className="flex flex-col items-start gap-6 md:flex-row">
        <ThemePreview
          theme={derivedTheme}
          buttonTextColor={buttonTextColor}
          contrastWarning={contrastWarning}
        />
        <div className="flex flex-1 flex-col gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
              checked={badgeLockedToPrimary}
              onChange={(event) => onBadgeLockedChange(event.target.checked)}
            />
            <span>Бейдж = как у кнопок</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              Сбросить к пресету
            </button>
            <button
              type="button"
              onClick={onRandomize}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              Случайная вариация
            </button>
            <button
              type="button"
              onClick={() => onAdvancedToggle(!advancedOpen)}
              className="rounded-lg border border-indigo-500 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
            >
              Подробнее {advancedOpen ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {advancedOpen && (
        <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
          <h4 className="text-sm font-semibold text-indigo-700">Расширенные настройки</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <GradientEditor
              label="Фон страницы"
              gradient={backgroundGradient}
              onChange={(gradient) => handleOverrideChange('background', gradient)}
            />
            <GradientEditor
              label="Кнопки и прогресс"
              gradient={primaryGradient}
              onChange={(gradient) => handleOverrideChange('primary', gradient)}
            />
            <GradientEditor
              label="Бейдж"
              gradient={badgeGradient}
              onChange={(gradient) => handleOverrideChange('badge', gradient)}
              disabled={badgeLockedToPrimary}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Импорт JSON</label>
              <textarea
                value={importJson}
                onChange={(event) => setImportJson(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-zinc-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder='{"background": {...}}'
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleImport}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600"
                >
                  Импортировать
                </button>
                <button
                  type="button"
                  onClick={() => setImportJson('')}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500 transition hover:border-red-300 hover:text-red-500"
                >
                  Очистить
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700">Экспорт / CSS</label>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600"
              >
                Скопировать JSON
              </button>
              <button
                type="button"
                onClick={handleCopyCss}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-600"
              >
                Скопировать CSS переменные
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

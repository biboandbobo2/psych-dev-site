import { useState } from 'react';
import type { TestAppearance } from '../../../types/tests';
import type { ThemeOverrides, DerivedTheme, BaseTheme } from '../../../types/themes';
import type { ThemePreset } from '../../../constants/themePresets';
import { ThemePicker } from '../../theme/ThemePicker';
import { EmojiPicker } from '../../EmojiPicker';
import { Field } from '../../Field';
import { EmojiText } from '../../Emoji';

const TEXTAREA = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
const CONTROL_CLASS = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
const DESCRIPTION_MAX = 300;

const prefaceHint = `Максимум ${DESCRIPTION_MAX} символов. Будет показано на главном экране перед началом.`;
const featuresHint = 'Каждый пункт с новой строки. Например: • 10 вопросов\\n• Пояснения после ответа';

interface TestAppearanceEditorProps {
  // Appearance state
  appearance: TestAppearance;
  onAppearanceChange: (key: keyof TestAppearance, value: string) => void;

  // Bullet points
  bulletPoints: string;
  onBulletPointsChange: (value: string) => void;

  // Theme state
  themePresets: ThemePreset[];
  themePresetId: string;
  onPresetChange: (id: string) => void;
  mainColor: string;
  onMainColorChange: (color: string) => void;
  badgeLockedToPrimary: boolean;
  onBadgeLockedChange: (value: boolean) => void;
  themeOverrides?: ThemeOverrides;
  onOverridesChange: (overrides?: ThemeOverrides) => void;
  derivedTheme: DerivedTheme;
  baseTheme: BaseTheme;
  contrastWarning: string;
  onResetTheme: () => void;
  onRandomizeTheme: () => void;
  themeAdvancedOpen: boolean;
  onAdvancedToggle: (value: boolean) => void;
  buttonTextColor: string;

  // Badge config
  showBadgeConfig: boolean;
  onToggleBadgeConfig: (value: boolean) => void;

  // Saving state
  saving: boolean;
}

export function TestAppearanceEditor({
  appearance,
  onAppearanceChange,
  bulletPoints,
  onBulletPointsChange,
  themePresets,
  themePresetId,
  onPresetChange,
  mainColor,
  onMainColorChange,
  badgeLockedToPrimary,
  onBadgeLockedChange,
  themeOverrides,
  onOverridesChange,
  derivedTheme,
  baseTheme,
  contrastWarning,
  onResetTheme,
  onRandomizeTheme,
  themeAdvancedOpen,
  onAdvancedToggle,
  buttonTextColor,
  showBadgeConfig,
  onToggleBadgeConfig,
  saving,
}: TestAppearanceEditorProps) {
  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-lg font-bold text-gray-900">Оформление теста</h3>

      {/* Иконка и описание стартового экрана */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          htmlFor="test-start-icon"
          label="Иконка на стартовом экране"
          hint="Можно использовать эмодзи или короткий текст."
        >
          <EmojiPicker
            inputId="test-start-icon"
            value={appearance.introIcon}
            onChange={(emoji) => onAppearanceChange('introIcon', emoji)}
            placeholder="Например: 📖"
            disabled={saving}
          />
        </Field>

        <Field htmlFor="test-preface" label="Описание перед стартом" hint={prefaceHint}>
          <textarea
            id="test-preface"
            value={appearance.introDescription ?? ''}
            onChange={(e) => onAppearanceChange('introDescription', e.target.value)}
            placeholder="Кратко опишите, что ждёт пользователя в тесте"
            maxLength={DESCRIPTION_MAX}
            className={TEXTAREA}
            disabled={saving}
          />
        </Field>
      </div>

      {/* Theme Picker */}
      <ThemePicker
        presets={themePresets}
        presetId={themePresetId}
        onPresetChange={onPresetChange}
        mainColor={mainColor}
        onMainColorChange={onMainColorChange}
        badgeLockedToPrimary={badgeLockedToPrimary}
        onBadgeLockedChange={onBadgeLockedChange}
        overrides={themeOverrides}
        onOverridesChange={onOverridesChange}
        derivedTheme={derivedTheme}
        baseTheme={baseTheme}
        contrastWarning={contrastWarning}
        onReset={onResetTheme}
        onRandomize={onRandomizeTheme}
        advancedOpen={themeAdvancedOpen}
        onAdvancedToggle={onAdvancedToggle}
        buttonTextColor={buttonTextColor}
      />

      {/* Badge configuration toggle */}
      <div className="mt-2">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
            checked={showBadgeConfig}
            onChange={(e) => onToggleBadgeConfig(e.target.checked)}
            disabled={saving}
          />
          <span>Настраивать бейдж уровня</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Бейдж отображается на карточке теста, если это уровень в цепочке
        </p>
      </div>

      {/* Badge settings */}
      {showBadgeConfig && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          aria-hidden={!showBadgeConfig}
        >
          <Field
            htmlFor="test-badge-icon"
            label="Иконка бейджа уровня"
            hint="Если оставить пустым, бейдж будет без иконки."
          >
            <EmojiPicker
              inputId="test-badge-icon"
              value={appearance.badgeIcon}
              onChange={(emoji) => onAppearanceChange('badgeIcon', emoji)}
              placeholder="Например: 🔥🔥"
              disabled={saving}
            />
          </Field>

          <Field
            htmlFor="test-badge-label"
            label="Подпись бейджа"
            hint="Например: УРОВЕНЬ 3"
          >
            <input
              id="test-badge-label"
              type="text"
              value={appearance.badgeLabel ?? ''}
              onChange={(e) => onAppearanceChange('badgeLabel', e.target.value)}
              placeholder="Например: УРОВЕНЬ 3"
              className={CONTROL_CLASS}
              disabled={saving}
              maxLength={50}
            />
          </Field>
        </div>
      )}

      {/* Bullet points (особенности теста) */}
      <Field
        htmlFor="test-features"
        label="Особенности теста (каждый пункт с новой строки)"
        hint={featuresHint}
      >
        <textarea
          id="test-features"
          value={bulletPoints}
          onChange={(e) => onBulletPointsChange(e.target.value)}
          placeholder={'• Всего 10 вопросов\n• После ответа появляется пояснение'}
          className={TEXTAREA}
          disabled={saving}
          rows={4}
        />
      </Field>

      {/* Подсказка */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
        <EmojiText text="💡 Совет:" /> Настройка темы позволяет создать уникальный визуальный стиль для каждого теста.
        Используйте контрастные цвета для лучшей читаемости.
      </div>
    </div>
  );
}

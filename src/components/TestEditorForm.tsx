import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  createTest,
  updateTest,
  updateTestQuestions,
  getTestById,
  publishTest,
  unpublishTest,
  isTestTitleUnique,
} from '../lib/tests';
import type { Test, TestQuestion, TestRubric, TestAppearance } from '../types/tests';
import { DEFAULT_REVEAL_POLICY, MIN_QUESTION_ANSWERS } from '../types/tests';
import type { ThemeOverrides, ThemePreset, DerivedTheme } from '../types/themes';
import { AGE_RANGE_LABELS } from '../types/notes';
import type { AgeRange } from '../hooks/useNotes';
import { QuestionEditor } from './QuestionEditor';
import { mergeAppearance } from '../utils/testAppearance';
import { THEME_PRESETS } from '../constants/themePresets';
import { TestMetadataEditor } from './tests/editor/TestMetadataEditor';
import { TestPrerequisiteSelector } from './tests/editor/TestPrerequisiteSelector';
import { TestAppearanceEditor } from './tests/editor/TestAppearanceEditor';
import { TestQuestionsManager } from './tests/editor/TestQuestionsManager';
import { TestPolicyEditor } from './tests/editor/TestPolicyEditor';
import { TestImportExport } from './tests/editor/TestImportExport';
import {
  deriveTheme,
  findPresetById,
  getPresetDefaultMainColor,
  firstAndLastStops,
  getButtonTextColor,
  cloneGradient,
} from '../utils/theme';
import { hexToHsl, hslToHex, getContrastRatio } from '../utils/color';
import { ThemePicker } from './theme/ThemePicker';
import { importTestFromJson, readFileAsText, generateQuestionsTemplate, downloadJson } from '../utils/testImportExport';
import { Field } from './Field';
import { EmojiPicker } from './EmojiPicker';

interface TestEditorFormProps {
  testId: string | null; // null = создание нового теста
  onClose: () => void;
  onSaved: () => void;
  existingTests: Test[];
  importedData?: {
    data?: Partial<Test>;
    questions?: TestQuestion[];
  } | null;
}

const TITLE_MAX = 20;
const DESCRIPTION_MAX = 40;

const CONTROL =
  'h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[15px] leading-none outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
const CONTROL_ERROR = 'border-red-400 focus:border-red-500 focus:ring-red-500/60';
const TEXTAREA =
  'min-h-[112px] w-full rounded-lg border border-zinc-300 bg-white p-3 text-[15px] leading-snug outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';

function controlClass(hasError?: boolean, extra?: string) {
  return `${CONTROL} ${hasError ? CONTROL_ERROR : ''} ${extra ?? ''}`.trim();
}

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

const createEmptyQuestion = (): TestQuestion => ({
  id: crypto.randomUUID(),
  questionText: '',
  answers: Array.from({ length: 4 }, () => ({
    id: crypto.randomUUID(),
    text: '',
  })),
  correctAnswerId: null,
  shuffleAnswers: true,
  revealPolicy: { ...DEFAULT_REVEAL_POLICY },
});
export function TestEditorForm({ testId, onClose, onSaved, existingTests, importedData }: TestEditorFormProps) {
  const { user } = useAuth();

  // Основные поля теста
  const [title, setTitle] = useState('');
  const [rubric, setRubric] = useState<TestRubric>('full-course');
  const [prerequisiteTestId, setPrerequisiteTestId] = useState<string | undefined>(undefined);
  const [requiredPercentage, setRequiredPercentage] = useState<number>(70);
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published' | 'unpublished'>('draft');
  const [appearance, setAppearance] = useState<TestAppearance>(mergeAppearance());
  const [appearanceBullets, setAppearanceBullets] = useState('');
  const [isNextLevel, setIsNextLevel] = useState<boolean>(false);
  const [showBadgeConfig, setShowBadgeConfig] = useState<boolean>(false);
  const [themePresetId, setThemePresetId] = useState<string>(THEME_PRESETS[0].id);
  const [mainColor, setMainColor] = useState<string>(getPresetDefaultMainColor(THEME_PRESETS[0]));
  const [badgeLockedToPrimary, setBadgeLockedToPrimary] = useState<boolean>(true);
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverrides | undefined>(undefined);
  const [themeAdvancedOpen, setThemeAdvancedOpen] = useState<boolean>(false);
  const [questionCountInput, setQuestionCountInput] = useState<string>('10');
  const [questionCountError, setQuestionCountError] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState<string>('70');
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [previousTestIdInput, setPreviousTestIdInput] = useState<string>('');
  const [previousTestQuery, setPreviousTestQuery] = useState<string>('');
  const [debouncedPreviousTestQuery, setDebouncedPreviousTestQuery] = useState<string>('');
  const [previousTestOpen, setPreviousTestOpen] = useState<boolean>(false);
  const [previousTestError, setPreviousTestError] = useState<string | null>(null);
  const selectContainerRef = useRef<HTMLDivElement | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number>(0);

  // UI состояния
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const setAppearanceFromTest = (value?: TestAppearance) => {
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
  };

  useEffect(() => {
    if (!testId) {
      setAppearanceFromTest(undefined);
      setIsNextLevel(false);
      setPrerequisiteTestId(undefined);
      setPreviousTestIdInput('');
      setPreviousTestQuery('');
      setDebouncedPreviousTestQuery('');
      setPreviousTestError(null);
      setRequiredPercentage(70);
      setThresholdInput('70');
      setThresholdError(null);
      setQuestionCountInput(String(questionCount));
      setQuestionCountError(null);
      setHighlightIndex(0);
      setShowBadgeConfig(false);
    }
  }, [testId]);

  const testsForChain = useMemo(() => {
    // Собираем ID тестов, которые уже используются как prerequisite для других тестов
    const usedPrerequisiteIds = new Set(
      existingTests
        .filter((t) => t.prerequisiteTestId && t.id !== testId) // Исключаем текущий тест
        .map((t) => t.prerequisiteTestId)
    );

    // Фильтруем: исключаем текущий тест и те, что уже используются как prerequisite
    return existingTests.filter((t) => t.id !== testId && !usedPrerequisiteIds.has(t.id));
  }, [existingTests, testId]);
  const testOptions = useMemo(
    () =>
      testsForChain.map((test) => ({
        id: test.id,
        title: test.title,
        questionCount: test.questionCount,
      })),
    [testsForChain]
  );
  const selectedTest = useMemo(
    () => testOptions.find((option) => option.id === prerequisiteTestId),
    [testOptions, prerequisiteTestId]
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPreviousTestQuery(previousTestQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [previousTestQuery]);

  const filteredTestOptions = useMemo(() => {
    const query = debouncedPreviousTestQuery.trim().toLowerCase();
    if (!query) {
      return testOptions.slice(0, 50);
    }
    return testOptions.filter((option) => option.title.toLowerCase().includes(query));
  }, [debouncedPreviousTestQuery, testOptions]);

  useEffect(() => {
    if (filteredTestOptions.length === 0) {
      setHighlightIndex(-1);
    } else {
      setHighlightIndex((prev) => {
        if (prev < 0) return 0;
        if (prev >= filteredTestOptions.length) return filteredTestOptions.length - 1;
        return prev;
      });
    }
  }, [filteredTestOptions]);

  useEffect(() => {
    if (!isNextLevel) {
      setPrerequisiteTestId(undefined);
      setPreviousTestIdInput('');
      setPreviousTestQuery('');
      setDebouncedPreviousTestQuery('');
      setPreviousTestError(null);
      setPreviousTestOpen(false);
      setThresholdError(null);
      setRequiredPercentage(70);
      setThresholdInput('70');
      setHighlightIndex(0);
      setShowBadgeConfig(false);
      return;
    }
  }, [isNextLevel]);

  useEffect(() => {
    if (!isNextLevel) return;
    if (prerequisiteTestId) {
      const match = testOptions.find((option) => option.id === prerequisiteTestId);
      if (match) {
        setPreviousTestQuery(match.title);
        setPreviousTestIdInput(prerequisiteTestId);
        setPreviousTestError(null);
        setHighlightIndex(0);
      } else {
        setPreviousTestIdInput(prerequisiteTestId);
        setPreviousTestError('Тест с таким ID не найден');
        setHighlightIndex(-1);
      }
    } else {
      setPreviousTestQuery('');
      setPreviousTestIdInput('');
      setHighlightIndex(0);
    }
  }, [isNextLevel, prerequisiteTestId, testOptions]);

  useEffect(() => {
    if (!previousTestOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (selectContainerRef.current && !selectContainerRef.current.contains(event.target as Node)) {
        setPreviousTestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [previousTestOpen]);

  const currentThemePreset: ThemePreset = useMemo(
    () => findPresetById(themePresetId),
    [themePresetId]
  );

  const baseTheme: DerivedTheme = useMemo(
    () => deriveTheme(currentThemePreset, mainColor, badgeLockedToPrimary, undefined),
    [currentThemePreset, mainColor, badgeLockedToPrimary]
  );

  const derivedTheme: DerivedTheme = useMemo(
    () => deriveTheme(currentThemePreset, mainColor, badgeLockedToPrimary, themeOverrides),
    [currentThemePreset, mainColor, badgeLockedToPrimary, themeOverrides]
  );

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

  const contrastWarning = buttonContrast < 4.5 ? `Контраст кнопки ${buttonContrast.toFixed(2)} ниже рекомендуемого уровня 4.5` : null;

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

  const buildChainFromRoot = (startId: string, tests: Test[]): Test[] => {
    if (!startId) return [];
    const map = new Map(tests.map((t) => [t.id, t]));
    let current = map.get(startId);
    if (!current) return [];

    // поднимаемся к корню
    const visited = new Set<string>();
    while (current?.prerequisiteTestId && map.has(current.prerequisiteTestId) && !visited.has(current.prerequisiteTestId)) {
      visited.add(current.prerequisiteTestId);
      current = map.get(current.prerequisiteTestId)!;
    }

    const chain: Test[] = [];
    visited.clear();
    let node: Test | undefined = current;

    while (node && !visited.has(node.id) && chain.length < 3) {
      chain.push(node);
      visited.add(node.id);

      const successors = tests.filter((t) => t.prerequisiteTestId === node!.id && !visited.has(t.id));
      if (successors.length === 0) {
        break;
      }
      node = successors[0];
    }

    return chain;
  };

  const canAttachPrerequisite = (targetId?: string) => {
    if (!targetId) return true;
    const targetChain = buildChainFromRoot(targetId, testsForChain);
    return targetChain.length < 3;
  };

  const handleAppearanceChange = (key: keyof TestAppearance, value: string) => {
    setAppearance((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const buildAppearancePayload = (): TestAppearance => {
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
  };

  // Загрузка существующего теста
  useEffect(() => {
    if (!testId) return;

    const loadTest = async () => {
      try {
        setLoading(true);
        const test = await getTestById(testId);
        if (test) {
          setTitle(test.title);
          setRubric(test.rubric);
          setPrerequisiteTestId(test.prerequisiteTestId);
          setIsNextLevel(Boolean(test.prerequisiteTestId));
          setShowBadgeConfig(Boolean(test.appearance?.badgeIcon || test.appearance?.badgeLabel));
          setRequiredPercentage(test.requiredPercentage ?? 70);
          setThresholdInput(String(test.requiredPercentage ?? 70));
          setThresholdError(null);
          setQuestionCount(test.questionCount);
          setQuestionCountInput(String(test.questionCount));
          setQuestionCountError(null);
          setPreviousTestIdInput(test.prerequisiteTestId ?? '');
          setPreviousTestQuery('');
          setPreviousTestError(null);
          setQuestions(test.questions);
          setCurrentStatus(test.status);
          setAppearanceFromTest(test.appearance);
        }
      } catch (error) {
        console.error('Ошибка загрузки теста:', error);
        alert('Не удалось загрузить тест');
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  // Загрузка импортированных данных
  useEffect(() => {
    if (!testId && importedData) {
      const { data, questions: importedQuestions } = importedData;

      if (data) {
        // Импортируем все поля теста
        if (data.title) setTitle(data.title);
        if (data.rubric) setRubric(data.rubric);
        if (data.prerequisiteTestId) {
          setPrerequisiteTestId(data.prerequisiteTestId);
          setIsNextLevel(true);
          setPreviousTestIdInput(data.prerequisiteTestId);
        }
        if (typeof data.requiredPercentage === 'number') {
          setRequiredPercentage(data.requiredPercentage);
          setThresholdInput(String(data.requiredPercentage));
        }
        if (data.appearance) {
          setAppearanceFromTest(data.appearance);
          setShowBadgeConfig(Boolean(data.appearance.badgeIcon || data.appearance.badgeLabel));
        }
      }

      if (importedQuestions && importedQuestions.length > 0) {
        // Сначала устанавливаем количество
        setQuestionCount(importedQuestions.length);
        setQuestionCountInput(String(importedQuestions.length));
        // Затем устанавливаем сами вопросы
        setQuestions(importedQuestions);
      }
    }
  }, [importedData, testId, setAppearanceFromTest]);

  // Инициализация пустых вопросов при изменении количества
  // ВАЖНО: не создавать пустые вопросы если есть импортированные данные
  useEffect(() => {
    if (!importedData && questions.length === 0 && questionCount > 0) {
      const emptyQuestions: TestQuestion[] = Array.from({ length: questionCount }, () =>
        createEmptyQuestion()
      );
      setQuestions(emptyQuestions);
    }
  }, [questionCount, questions.length, importedData]);

  const applyQuestionCount = (target: number) => {
    const normalized = Math.max(1, Math.min(20, Math.floor(target)));
    setQuestionCount(normalized);
    setQuestionCountInput(String(normalized));
    setQuestionCountError(null);
    setQuestions((prev) => {
      if (normalized > prev.length) {
        const additionalQuestions: TestQuestion[] = Array.from(
          { length: normalized - prev.length },
          () => createEmptyQuestion()
        );
        return [...prev, ...additionalQuestions];
      }
      if (normalized < prev.length) {
        return prev.slice(0, normalized);
      }
      return prev;
    });
  };

  const handleQuestionCountInputChange = (value: string) => {
    setQuestionCountInput(value);
    if (!value) {
      setQuestionCountError('Введите количество вопросов от 1 до 20');
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setQuestionCountError('Введите целое число от 1 до 20');
      return;
    }
    if (parsed < 1 || parsed > 20) {
      setQuestionCountError('Допустимо от 1 до 20 вопросов');
      return;
    }
    setQuestionCountError(null);
    applyQuestionCount(parsed);
  };

  const handleQuestionChange = (index: number, updatedQuestion: TestQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const handleQuestionDelete = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    setQuestionCount(newQuestions.length);
    setQuestionCountInput(String(newQuestions.length));
    setQuestionCountError(null);
  };

  const handleAddQuestion = () => {
    if (questions.length >= 20) {
      alert('Максимум 20 вопросов');
      return;
    }
    const newQuestion = createEmptyQuestion();
    setQuestions([...questions, newQuestion]);
    setQuestionCount(questions.length + 1);
    setQuestionCountInput(String(questions.length + 1));
    setQuestionCountError(null);
  };

  const handleImportQuestions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const result = importTestFromJson(content);

      if (!result.success) {
        alert(result.error || 'Ошибка импорта вопросов');
        return;
      }

      if (!result.questions || result.questions.length === 0) {
        alert('В файле не найдены вопросы для импорта');
        return;
      }

      // Добавляем импортированные вопросы к существующим
      const totalQuestions = questions.length + result.questions.length;
      if (totalQuestions > 20) {
        const canAdd = 20 - questions.length;
        if (canAdd <= 0) {
          alert('Невозможно добавить вопросы: достигнут лимит в 20 вопросов');
          return;
        }
        const confirmAdd = window.confirm(
          `Импортировано ${result.questions.length} вопросов, но можно добавить только ${canAdd}. Добавить первые ${canAdd} вопросов?`
        );
        if (!confirmAdd) return;

        const questionsToAdd = result.questions.slice(0, canAdd);
        setQuestions([...questions, ...questionsToAdd]);
        setQuestionCount(questions.length + questionsToAdd.length);
        setQuestionCountInput(String(questions.length + questionsToAdd.length));
        alert(`Добавлено ${questionsToAdd.length} вопросов`);
      } else {
        setQuestions([...questions, ...result.questions]);
        setQuestionCount(totalQuestions);
        setQuestionCountInput(String(totalQuestions));
        alert(`Добавлено ${result.questions.length} вопросов`);
      }
    } catch (error) {
      alert('Не удалось прочитать файл');
    } finally {
      // Reset file input
      if (questionsFileInputRef.current) {
        questionsFileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadQuestionsTemplate = () => {
    const template = generateQuestionsTemplate();
    const filename = `questions-template-${new Date().toISOString().split('T')[0]}.json`;
    downloadJson(template, filename);
  };

  const handleThresholdInputChange = (value: string) => {
    setThresholdInput(value);
    if (value.trim() === '') {
      setThresholdError('Укажите порог прохождения от 0 до 100');
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      setThresholdError('Введите число от 0 до 100');
      return;
    }
    if (parsed < 0 || parsed > 100) {
      setThresholdError('Допустимое значение — от 0 до 100');
      return;
    }
    const rounded = Math.round(parsed);
    setThresholdError(null);
    setRequiredPercentage(rounded);
    setThresholdInput(String(rounded));
  };

  const handlePreviousTestQueryChange = (value: string) => {
    setPreviousTestQuery(value);
    setPreviousTestOpen(true);
    setHighlightIndex(0);
    if (!selectedTest || value !== selectedTest.title) {
      setPrerequisiteTestId(undefined);
      setPreviousTestIdInput('');
      setPreviousTestError(null);
    }
    if (value.trim() === '') {
      setPreviousTestError(null);
      setPreviousTestIdInput('');
    }
  };

  const handleSelectPreviousTest = (option: { id: string; title: string }) => {
    if (!canAttachPrerequisite(option.id)) {
      setPreviousTestError('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }
    setPrerequisiteTestId(option.id);
    setPreviousTestQuery(option.title);
    setPreviousTestIdInput(option.id);
    setPreviousTestOpen(false);
    setPreviousTestError(null);
    const index = filteredTestOptions.findIndex((item) => item.id === option.id);
    setHighlightIndex(index >= 0 ? index : 0);
  };

  const handlePreviousTestIdInputChange = (value: string) => {
    setPreviousTestIdInput(value);
    const trimmed = value.trim();
    if (trimmed === '') {
      setPrerequisiteTestId(undefined);
      setPreviousTestError(null);
      setHighlightIndex(0);
      return;
    }
    const match = testOptions.find((option) => option.id === trimmed);
    if (!match) {
      setPrerequisiteTestId(undefined);
      setPreviousTestError('Тест с таким ID не найден');
      setPreviousTestOpen(false);
      setHighlightIndex(-1);
      return;
    }
    if (!canAttachPrerequisite(match.id)) {
      setPreviousTestError('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }
    setPrerequisiteTestId(match.id);
    setPreviousTestQuery(match.title);
    setPreviousTestError(null);
    setPreviousTestOpen(false);
    setHighlightIndex(0);
  };

  const handleToggleBadgeConfig = (checked: boolean) => {
    setShowBadgeConfig(checked);
    if (!checked) {
      setAppearance((prev) => ({
        ...prev,
        badgeIcon: undefined,
        badgeLabel: undefined,
      }));
    }
  };

  const handlePreviousTestKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!previousTestOpen) {
        setPreviousTestOpen(true);
        setHighlightIndex(filteredTestOptions.length > 0 ? 0 : -1);
      } else if (filteredTestOptions.length > 0) {
        setHighlightIndex((prev) => {
          if (prev < 0) return 0;
          const next = prev + 1;
          return next >= filteredTestOptions.length ? filteredTestOptions.length - 1 : next;
        });
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (previousTestOpen && filteredTestOptions.length > 0) {
        setHighlightIndex((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }
    } else if (event.key === 'Enter') {
      if (!previousTestOpen) {
        setPreviousTestOpen(true);
        setHighlightIndex(filteredTestOptions.length > 0 ? 0 : -1);
      } else if (highlightIndex >= 0 && filteredTestOptions[highlightIndex]) {
        event.preventDefault();
        handleSelectPreviousTest(filteredTestOptions[highlightIndex]);
      }
    } else if (event.key === 'Escape') {
      if (previousTestOpen) {
        event.preventDefault();
        setPreviousTestOpen(false);
      }
    }
  };

  const titleHint = `До ${TITLE_MAX} символов. Осталось ${Math.max(0, TITLE_MAX - title.length)}.`;
  const questionHint = `Сейчас добавлено ${questionCount} вопрос(ов).`;
  const idHint = selectedTest
    ? `Найдено: ${selectedTest.title}`
    : 'Можно вставить ID вручную, если знаете его.';
  const prefaceHint = `До ${DESCRIPTION_MAX} символов. Осталось ${Math.max(
    0,
    DESCRIPTION_MAX - (appearance.introDescription?.length ?? 0)
  )}.`;
  const featuresHint =
    'Пункты будут показаны списком перед началом теста. Если оставить поле пустым, появится стандартный набор правил.';
  const activeOptionId =
    highlightIndex >= 0 && highlightIndex < filteredTestOptions.length
      ? `previous-test-option-${filteredTestOptions[highlightIndex].id}`
      : undefined;

  // Валидация для публикации
  const validateForPublish = (): boolean => {
    if (!title.trim()) {
      alert('Введите название теста');
      return false;
    }

    if (questions.length === 0) {
      alert('Добавьте хотя бы один вопрос');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        alert(`Вопрос ${i + 1}: заполните текст вопроса`);
        return false;
      }
      const filledAnswers = q.answers.filter((answer) => answer.text.trim().length > 0);
      if (filledAnswers.length < MIN_QUESTION_ANSWERS) {
        alert(
          `Вопрос ${i + 1}: заполните минимум ${MIN_QUESTION_ANSWERS} варианта ответа`
        );
        return false;
      }
      const correctAnswer = q.answers.find((answer) => answer.id === q.correctAnswerId);
      if (!correctAnswer || correctAnswer.text.trim().length === 0) {
        alert(`Вопрос ${i + 1}: выберите правильный ответ`);
        return false;
      }
    }

    if (questionCountError) {
      alert(questionCountError);
      return false;
    }

    if (isNextLevel) {
      if (!prerequisiteTestId) {
        alert('Выберите тест, после которого открывается этот уровень.');
        return false;
      }
      if (previousTestError) {
        alert(previousTestError);
        return false;
      }
      if (
        thresholdError ||
        Number.isNaN(requiredPercentage) ||
        requiredPercentage < 0 ||
        requiredPercentage > 100
      ) {
        alert('Укажите порог прохождения от 0 до 100%.');
        return false;
      }
    }

    return true;
  };

  // Сохранить как черновик
  const handleSaveDraft = async () => {
    if (!user) {
      alert('Необходима авторизация');
      return;
    }

    if (!title.trim()) {
      alert('Введите название теста');
      return;
    }

    if (questionCountError) {
      alert(questionCountError);
      return;
    }

    // Проверка уникальности названия
    const isUnique = await isTestTitleUnique(title.trim(), testId || undefined);
    if (!isUnique) {
      alert('Тест с таким названием уже существует. Пожалуйста, выберите другое название.');
      return;
    }

    if (isNextLevel) {
      if (!prerequisiteTestId) {
        alert('Выберите тест, после которого открывается этот уровень.');
        return;
      }
      if (previousTestError) {
        alert(previousTestError);
        return;
      }
      if (
        thresholdError ||
        Number.isNaN(requiredPercentage) ||
        requiredPercentage < 0 ||
        requiredPercentage > 100
      ) {
        alert('Укажите порог прохождения от 0 до 100%.');
        return;
      }
    }

    if (isNextLevel && !canAttachPrerequisite(prerequisiteTestId)) {
      alert('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }

    try {
      setSaving(true);
      const appearancePayload = buildAppearancePayload();

      if (testId) {
        // Обновляем существующий тест
        await updateTest(testId, {
          title: title.trim(),
          rubric,
          prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
          questionCount: questions.length,
          requiredPercentage: isNextLevel ? requiredPercentage : undefined,
          appearance: appearancePayload,
        });
        await updateTestQuestions(testId, questions);
      } else {
        // Создаём новый тест
        const newTestId = await createTest(
          {
            title: title.trim(),
            rubric,
            prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
            questionCount: questions.length,
            status: 'draft',
            requiredPercentage: isNextLevel ? requiredPercentage : undefined,
            appearance: appearancePayload,
          },
          user.uid
        );
        await updateTestQuestions(newTestId, questions);
      }

      const message = currentStatus === 'draft' ? 'Тест сохранён как черновик' : 'Изменения сохранены';
      console.log(`✅ ${message}, возвращаемся к списку`);
      alert(message);
      onSaved(); // Вернёт к списку тестов
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Не удалось сохранить тест');
    } finally {
      setSaving(false);
    }
  };

  // Снять с публикации
  const handleUnpublish = async () => {
    if (!testId) {
      alert('Невозможно снять с публикации несохранённый тест');
      return;
    }

    if (!confirm('Снять тест с публикации? Студенты больше не смогут его проходить.')) {
      return;
    }

    try {
      setSaving(true);
      await unpublishTest(testId);
      alert('Тест снят с публикации');
      onSaved();
    } catch (error) {
      console.error('Ошибка снятия с публикации:', error);
      alert('Не удалось снять тест с публикации');
    } finally {
      setSaving(false);
    }
  };

  // Опубликовать
  const handlePublish = async () => {
    if (!validateForPublish()) return;
    if (!user) {
      alert('Необходима авторизация');
      return;
    }

    if (questionCountError) {
      alert(questionCountError);
      return;
    }

    // Проверка уникальности названия
    const isUnique = await isTestTitleUnique(title.trim(), testId || undefined);
    if (!isUnique) {
      alert('Тест с таким названием уже существует. Пожалуйста, выберите другое название.');
      return;
    }

    if (isNextLevel) {
      if (!prerequisiteTestId) {
        alert('Выберите тест, после которого открывается этот уровень.');
        return;
      }
      if (previousTestError) {
        alert(previousTestError);
        return;
      }
      if (
        thresholdError ||
        Number.isNaN(requiredPercentage) ||
        requiredPercentage < 0 ||
        requiredPercentage > 100
      ) {
        alert('Укажите порог прохождения от 0 до 100%.');
        return;
      }
    }

    if (isNextLevel && !canAttachPrerequisite(prerequisiteTestId)) {
      alert('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }

    try {
      setSaving(true);
      const appearancePayload = buildAppearancePayload();

      if (testId) {
        // Обновляем и публикуем
        await updateTest(testId, {
          title: title.trim(),
          rubric,
          prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
          questionCount: questions.length,
          requiredPercentage: isNextLevel ? requiredPercentage : undefined,
          appearance: appearancePayload,
        });
        await updateTestQuestions(testId, questions);
        await publishTest(testId);
      } else {
        // Создаём и сразу публикуем
        const newTestId = await createTest(
          {
            title: title.trim(),
            rubric,
            prerequisiteTestId: isNextLevel ? prerequisiteTestId : undefined,
            questionCount: questions.length,
            status: 'published',
            requiredPercentage: isNextLevel ? requiredPercentage : undefined,
            appearance: appearancePayload,
          },
          user.uid
        );
        await updateTestQuestions(newTestId, questions);
      }

      alert('Тест опубликован!');
      onSaved();
    } catch (error) {
      console.error('Ошибка публикации:', error);
      alert('Не удалось опубликовать тест');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Основные параметры теста */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-lg font-bold text-gray-900">Параметры теста</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field htmlFor="test-title" label="Название теста *" hint={titleHint}>
            <input
              id="test-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Тест по периоду младенчества"
              maxLength={TITLE_MAX}
              className={controlClass(false)}
              disabled={saving}
            />
          </Field>

          <Field htmlFor="test-rubric" label="Рубрика *" hint="Выберите курс или возрастной период.">
            <div className="relative">
              <select
                id="test-rubric"
                value={rubric}
                onChange={(e) => setRubric(e.target.value as TestRubric)}
                className={controlClass(false, 'appearance-none pr-8')}
                disabled={saving}
              >
                <option value="full-course">Курс целиком</option>
                <optgroup label="Возрастные периоды">
                  {Object.entries(AGE_RANGE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </optgroup>
              </select>
              <svg
                className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-zinc-500"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Field>

          <Field
            htmlFor="test-question-count"
            label="Количество вопросов (1–20) *"
            hint={questionHint}
            error={questionCountError}
          >
            <input
              id="test-question-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={questionCountInput}
              onChange={(e) => handleQuestionCountInputChange(e.target.value)}
              className={controlClass(Boolean(questionCountError))}
              aria-invalid={Boolean(questionCountError)}
              disabled={saving}
            />
          </Field>
        </div>

        <div className="mt-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
              checked={isNextLevel}
              onChange={(e) => setIsNextLevel(e.target.checked)}
              disabled={saving}
            />
            <span>Этот тест открыт только после прохождения другого теста</span>
          </label>
        </div>

        {isNextLevel && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3" data-visible={isNextLevel}>
            <Field
              htmlFor="test-threshold"
              label="Порог прохождения (%) *"
              hint="Студент должен набрать не меньше указанного процента на предыдущем тесте."
              error={thresholdError}
            >
              <input
                id="test-threshold"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={thresholdInput}
                onChange={(e) => handleThresholdInputChange(e.target.value)}
                className={controlClass(Boolean(thresholdError))}
                aria-invalid={Boolean(thresholdError)}
                disabled={saving}
              />
            </Field>

            <Field
              htmlFor="test-previous-title"
              label="Предыдущий тест"
              hint="Выберите тест, после которого откроется текущий уровень."
            >
              <div ref={selectContainerRef} className="relative">
                <input
                  id="test-previous-title"
                  type="text"
                  value={previousTestQuery}
                  onChange={(e) => handlePreviousTestQueryChange(e.target.value)}
                  onFocus={() => !saving && setPreviousTestOpen(true)}
                  onKeyDown={handlePreviousTestKeyDown}
                  onBlur={(event) => {
                    const next = event.relatedTarget as HTMLElement | null;
                    if (!next || !selectContainerRef.current?.contains(next)) {
                      window.setTimeout(() => setPreviousTestOpen(false), 80);
                    }
                  }}
                  placeholder="Начните вводить название теста"
                  className={controlClass(false)}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={previousTestOpen}
                  aria-controls="previous-test-options"
                  aria-activedescendant={activeOptionId}
                  disabled={saving}
                />
                {previousTestOpen && (
                  <div
                    id="previous-test-options"
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg"
                  >
                    {filteredTestOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-zinc-500">Ничего не найдено</div>
                    ) : (
                      filteredTestOptions.map((option, index) => {
                        const isSelected = option.id === prerequisiteTestId;
                        const isHighlighted = highlightIndex === index;
                        const optionId = `previous-test-option-${option.id}`;
                        return (
                          <button
                            key={option.id}
                            id={optionId}
                            type="button"
                            role="option"
                            aria-selected={isSelected || isHighlighted}
                            tabIndex={-1}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectPreviousTest(option)}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                              isHighlighted
                                ? 'bg-indigo-50 text-indigo-900'
                                : isSelected
                                ? 'bg-blue-100 text-blue-900'
                                : 'hover:bg-zinc-100'
                            }`}
                          >
                            <span className="mr-2 truncate">{option.title}</span>
                            <span className="flex-shrink-0 text-xs text-zinc-500">
                              • {option.questionCount} вопросов
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </Field>

            <Field
              htmlFor="test-previous-id"
              label="ID предыдущего теста *"
              hint={idHint}
              error={previousTestError}
            >
              <input
                id="test-previous-id"
                type="text"
                value={previousTestIdInput}
                onChange={(e) => handlePreviousTestIdInputChange(e.target.value)}
                placeholder="Например: abc123"
                className={controlClass(Boolean(previousTestError))}
                aria-invalid={Boolean(previousTestError)}
                disabled={saving}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Оформление */}
      <TestAppearanceEditor
        appearance={appearance}
        onAppearanceChange={handleAppearanceChange}
        bulletPoints={appearanceBullets}
        onBulletPointsChange={setAppearanceBullets}
        themePresets={THEME_PRESETS}
        themePresetId={themePresetId}
        onPresetChange={handlePresetChange}
        mainColor={mainColor}
        onMainColorChange={handleMainColorChange}
        badgeLockedToPrimary={badgeLockedToPrimary}
        onBadgeLockedChange={handleBadgeLockedChange}
        themeOverrides={themeOverrides}
        onOverridesChange={handleOverridesChange}
        derivedTheme={derivedTheme}
        baseTheme={baseTheme}
        contrastWarning={contrastWarning}
        onResetTheme={handleResetTheme}
        onRandomizeTheme={handleRandomizeTheme}
        themeAdvancedOpen={themeAdvancedOpen}
        onAdvancedToggle={setThemeAdvancedOpen}
        buttonTextColor={buttonTextColor}
        showBadgeConfig={showBadgeConfig}
        onToggleBadgeConfig={handleToggleBadgeConfig}
        saving={saving}
      />

      {/* Список вопросов */}
      <TestQuestionsManager
        questions={questions}
        onQuestionChange={handleQuestionChange}
        onQuestionDelete={handleQuestionDelete}
        onAddQuestion={handleAddQuestion}
        onImportQuestions={handleImportQuestions}
        onDownloadTemplate={handleDownloadQuestionsTemplate}
        saving={saving}
        testId={testId || undefined}
        onRequestSave={handleSaveDraft}
      />

      {/* Кнопки действий */}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-lg border-t border-gray-200 bg-white p-4 shadow-lg">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-md bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Отмена
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : (currentStatus === 'draft' ? 'Сохранить черновик' : 'Сохранить изменения')}
          </button>

          {currentStatus === 'published' ? (
            <button
              onClick={handleUnpublish}
              disabled={saving}
              className="rounded-md bg-orange-600 px-4 py-2 text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Снятие...' : 'Снять с публикации'}
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Публикация...' : 'Опубликовать'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

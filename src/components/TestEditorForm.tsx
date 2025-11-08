import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import type { ThemeOverrides, DerivedTheme } from '../types/themes';
import { mergeAppearance } from '../utils/testAppearance';
import { THEME_PRESETS } from '../constants/themePresets';
import { TestAppearanceEditor } from './tests/editor/TestAppearanceEditor';
import { TestQuestionsManager } from './tests/editor/TestQuestionsManager';
import { TestBasicMetadata } from './tests/editor/TestBasicMetadata';
import { TestPrerequisiteConfig } from './tests/editor/TestPrerequisiteConfig';
import { TestActionButtons } from './tests/editor/TestActionButtons';
import {
  deriveTheme,
  findPresetById,
  getPresetDefaultMainColor,
  firstAndLastStops,
  getButtonTextColor,
  cloneGradient,
} from '../utils/theme';
import { hexToHsl, hslToHex, getContrastRatio } from '../utils/color';
import { importTestFromJson, readFileAsText, generateQuestionsTemplate, downloadJson } from '../utils/testImportExport';

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
  const [previousTestError, setPreviousTestError] = useState<string | null>(null);

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
    if (!isNextLevel) {
      setPrerequisiteTestId(undefined);
      setPreviousTestIdInput('');
      setPreviousTestQuery('');
      setDebouncedPreviousTestQuery('');
      setPreviousTestError(null);
      setThresholdError(null);
      setRequiredPercentage(70);
      setThresholdInput('70');
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
      } else {
        setPreviousTestIdInput(prerequisiteTestId);
        setPreviousTestError('Тест с таким ID не найден');
      }
    } else {
      setPreviousTestQuery('');
      setPreviousTestIdInput('');
    }
  }, [isNextLevel, prerequisiteTestId, testOptions]);

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
    setPreviousTestError(null);
  };

  const handlePreviousTestIdInputChange = (value: string) => {
    setPreviousTestIdInput(value);
    const trimmed = value.trim();
    if (trimmed === '') {
      setPrerequisiteTestId(undefined);
      setPreviousTestError(null);
      return;
    }
    const match = testOptions.find((option) => option.id === trimmed);
    if (!match) {
      setPrerequisiteTestId(undefined);
      setPreviousTestError('Тест с таким ID не найден');
      return;
    }
    if (!canAttachPrerequisite(match.id)) {
      setPreviousTestError('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }
    setPrerequisiteTestId(match.id);
    setPreviousTestQuery(match.title);
    setPreviousTestError(null);
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

  const titleHint = `До ${TITLE_MAX} символов. Осталось ${Math.max(0, TITLE_MAX - title.length)}.`;
  const questionHint = `Сейчас добавлено ${questionCount} вопрос(ов).`;

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
      <TestBasicMetadata
        title={title}
        onTitleChange={setTitle}
        titleMaxLength={TITLE_MAX}
        titleHint={titleHint}
        rubric={rubric}
        onRubricChange={setRubric}
        questionCountInput={questionCountInput}
        onQuestionCountInputChange={handleQuestionCountInputChange}
        questionCountError={questionCountError}
        questionHint={questionHint}
        saving={saving}
      />

      {/* Prerequisite configuration */}
      <TestPrerequisiteConfig
        isNextLevel={isNextLevel}
        onIsNextLevelChange={setIsNextLevel}
        thresholdInput={thresholdInput}
        onThresholdInputChange={handleThresholdInputChange}
        thresholdError={thresholdError}
        previousTestQuery={previousTestQuery}
        onPreviousTestQueryChange={handlePreviousTestQueryChange}
        previousTestIdInput={previousTestIdInput}
        onPreviousTestIdInputChange={handlePreviousTestIdInputChange}
        previousTestError={previousTestError}
        testOptions={testOptions}
        filteredTestOptions={filteredTestOptions}
        selectedTest={selectedTest}
        prerequisiteTestId={prerequisiteTestId}
        onSelectPreviousTest={handleSelectPreviousTest}
        saving={saving}
      />

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
      <TestActionButtons
        currentStatus={currentStatus}
        saving={saving}
        onClose={onClose}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
      />
    </div>
  );
}

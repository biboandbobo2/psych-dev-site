import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Test } from '../../../../types/tests';

interface UseTestPrerequisiteOptions {
  existingTests: Test[];
  testId: string | null;
}

interface TestOption {
  id: string;
  title: string;
  questionCount: number;
}

export function useTestPrerequisite({ existingTests, testId }: UseTestPrerequisiteOptions) {
  // Next level configuration
  const [isNextLevel, setIsNextLevel] = useState<boolean>(false);
  const [prerequisiteTestId, setPrerequisiteTestId] = useState<string | undefined>(undefined);
  const [requiredPercentage, setRequiredPercentage] = useState<number>(70);

  // Input validation states
  const [thresholdInput, setThresholdInput] = useState<string>('70');
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [previousTestIdInput, setPreviousTestIdInput] = useState<string>('');
  const [previousTestQuery, setPreviousTestQuery] = useState<string>('');
  const [debouncedPreviousTestQuery, setDebouncedPreviousTestQuery] = useState<string>('');
  const [previousTestError, setPreviousTestError] = useState<string | null>(null);

  // Reset when testId changes (new test creation)
  useEffect(() => {
    if (!testId) {
      setIsNextLevel(false);
      setPrerequisiteTestId(undefined);
      setPreviousTestIdInput('');
      setPreviousTestQuery('');
      setDebouncedPreviousTestQuery('');
      setPreviousTestError(null);
      setRequiredPercentage(70);
      setThresholdInput('70');
      setThresholdError(null);
    }
  }, [testId]);

  // Tests available for chain
  const testsForChain = useMemo(() => {
    const usedPrerequisiteIds = new Set(
      existingTests
        .filter((t) => t.prerequisiteTestId && t.id !== testId)
        .map((t) => t.prerequisiteTestId)
    );

    return existingTests.filter((t) => t.id !== testId && !usedPrerequisiteIds.has(t.id));
  }, [existingTests, testId]);

  // Test options for selection
  const testOptions = useMemo<TestOption[]>(
    () =>
      testsForChain.map((test) => ({
        id: test.id,
        title: test.title,
        questionCount: test.questionCount,
      })),
    [testsForChain]
  );

  // Currently selected test
  const selectedTest = useMemo(
    () => testOptions.find((option) => option.id === prerequisiteTestId),
    [testOptions, prerequisiteTestId]
  );

  // Debounce previous test query
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPreviousTestQuery(previousTestQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [previousTestQuery]);

  // Filtered test options based on search
  const filteredTestOptions = useMemo(() => {
    const query = debouncedPreviousTestQuery.trim().toLowerCase();
    if (!query) {
      return testOptions.slice(0, 50);
    }
    return testOptions.filter((option) => option.title.toLowerCase().includes(query));
  }, [debouncedPreviousTestQuery, testOptions]);

  // Reset prerequisite when isNextLevel is disabled
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
      return;
    }
  }, [isNextLevel]);

  // Sync prerequisite ID with query when changed externally
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

  // Build chain from root
  const buildChainFromRoot = useCallback((startId: string, tests: Test[]): Test[] => {
    if (!startId) return [];
    const map = new Map(tests.map((t) => [t.id, t]));
    let current = map.get(startId);
    if (!current) return [];

    // Move up to root
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
  }, []);

  // Check if can attach prerequisite
  const canAttachPrerequisite = useCallback((targetId?: string) => {
    if (!targetId) return true;
    const targetChain = buildChainFromRoot(targetId, testsForChain);
    return targetChain.length < 3;
  }, [buildChainFromRoot, testsForChain]);

  // Handlers
  const handleThresholdInputChange = useCallback((value: string) => {
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
  }, []);

  const handlePreviousTestQueryChange = useCallback((value: string) => {
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
  }, [selectedTest]);

  const handleSelectPreviousTest = useCallback((option: { id: string; title: string }) => {
    if (!canAttachPrerequisite(option.id)) {
      setPreviousTestError('Пока можно связать не больше трёх уровней в цепочке тестов.');
      return;
    }
    setPrerequisiteTestId(option.id);
    setPreviousTestQuery(option.title);
    setPreviousTestIdInput(option.id);
    setPreviousTestError(null);
  }, [canAttachPrerequisite]);

  const handlePreviousTestIdInputChange = useCallback((value: string) => {
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
  }, [testOptions, canAttachPrerequisite]);

  return {
    // State
    isNextLevel,
    prerequisiteTestId,
    requiredPercentage,
    thresholdInput,
    thresholdError,
    previousTestIdInput,
    previousTestQuery,
    previousTestError,
    // Computed
    testOptions,
    filteredTestOptions,
    selectedTest,
    // Setters
    setters: {
      setIsNextLevel,
      setPrerequisiteTestId,
      setRequiredPercentage,
      setThresholdInput,
      setPreviousTestIdInput,
    },
    // Handlers
    handlers: {
      handleThresholdInputChange,
      handlePreviousTestQueryChange,
      handleSelectPreviousTest,
      handlePreviousTestIdInputChange,
    },
    // Utilities
    canAttachPrerequisite,
  };
}

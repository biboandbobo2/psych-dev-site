import { useState, useCallback, useEffect } from 'react';
import { getAllTests, getTestById } from '../../../../lib/tests';
import type { Test } from '../../../../types/tests';

/**
 * Hook for managing tests list data
 */
export function useTestsList() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextLevelCache, setNextLevelCache] = useState<Record<string, string>>({});

  const loadTests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allTests = await getAllTests();
      setTests(allTests);

      // Build cache of test titles by ID
      const cache: Record<string, string> = {};
      allTests.forEach((test) => {
        cache[test.id] = test.title;
      });
      setNextLevelCache(cache);

      // Find missing prerequisite tests
      const missingPrerequisites = Array.from(
        new Set(
          allTests
            .map((test) => test.prerequisiteTestId)
            .filter(
              (id): id is string =>
                Boolean(id) && !cache[id as string]
            )
        )
      );

      // Fetch missing prerequisite tests
      if (missingPrerequisites.length > 0) {
        const fetched = await Promise.all(
          missingPrerequisites.map(async (id) => {
            try {
              const result = await getTestById(id);
              return result ? { id, title: result.title } : { id, title: '' };
            } catch (fetchError) {
              console.error(
                'Ошибка загрузки связанного теста:',
                fetchError
              );
              return { id, title: '' };
            }
          })
        );
        setNextLevelCache((prev) => {
          const next = { ...prev };
          fetched.forEach(({ id, title }) => {
            if (title) {
              next[id] = title;
            }
          });
          return next;
        });
      }
    } catch (err: unknown) {
      console.error('Ошибка загрузки тестов:', err);
      setError('Не удалось загрузить список тестов');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTests = useCallback(() => {
    loadTests();
  }, [loadTests]);

  const removeTest = useCallback((testId: string) => {
    setTests((prev) => prev.filter((test) => test.id !== testId));
  }, []);

  // Load tests on mount
  useEffect(() => {
    loadTests();
  }, [loadTests]);

  return {
    tests,
    loading,
    error,
    nextLevelCache,
    loadTests,
    refreshTests,
    removeTest,
  };
}

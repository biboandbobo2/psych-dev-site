import { useEffect, useState } from 'react';
import type { Test } from '../../../types/tests';
import { getPublishedTests } from '../../../lib/tests';
import { debugError } from '../../../lib/debug';

const testsCache = new Map<string, Test[]>();
let publishedTestsPromise: Promise<Test[]> | null = null;

async function loadPublishedTests(): Promise<Test[]> {
  if (!publishedTestsPromise) {
    publishedTestsPromise = getPublishedTests().catch((error) => {
      publishedTestsPromise = null;
      throw error;
    });
  }
  return publishedTestsPromise;
}

export function usePeriodTests(periodId?: string) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!periodId) {
      setTests([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const cached = testsCache.get(periodId);
    if (cached) {
      setTests(cached);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        setLoading(true);
        const allTests = await loadPublishedTests();
        if (cancelled) return;
        const filtered = allTests.filter((test) => test.rubric === periodId);
        testsCache.set(periodId, filtered);
        setTests(filtered);
      } catch (error) {
        if (!cancelled) {
          debugError('[usePeriodTests] Failed to load tests for period:', periodId, error);
          setTests([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [periodId]);

  return { tests, loading };
}

import { useState, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getPublishedTests } from '../lib/tests';
import { isTestUnlocked } from '../lib/testAccess';
import type { Test as FirestoreTest, TestAppearance } from '../types/tests';
import { AGE_RANGE_LABELS } from '../types/notes';
import { mergeAppearance, createGradient, hexToRgba } from '../utils/testAppearance';
import {
  buildTestChains,
  cleanLevelLabel,
  formatLevelLabel,
  getTestMetadata,
  type TestChain,
} from '../utils/testChainHelpers';
import { TestCard } from '../components/tests/TestCard';





export function AgeTests() {
  const { user } = useAuth();
  const [firestoreTests, setFirestoreTests] = useState<FirestoreTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [testUnlockStatus, setTestUnlockStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadTests = async () => {
      try {
        setLoadingTests(true);
        const tests = await getPublishedTests();
        console.log('🔵 [AgeTests.tsx] Загружено тестов из Firestore:', tests.length);
        console.log('📋 [AgeTests.tsx] Список тестов:', tests);
        setFirestoreTests(tests);

        if (user) {
          const unlockStatus: Record<string, boolean> = {};
          for (const test of tests) {
            unlockStatus[test.id] = await isTestUnlocked(
              user.uid,
              test.prerequisiteTestId,
              test.requiredPercentage ?? 70
            );
          }
          setTestUnlockStatus(unlockStatus);
          console.log('🔓 [AgeTests.tsx] Статусы разблокировки:', unlockStatus);
        }
      } catch (error) {
        console.error('❌ [AgeTests.tsx] Ошибка загрузки тестов:', error);
      } finally {
        setLoadingTests(false);
      }
    };

    loadTests();
  }, [user]);

  // Фильтруем только тесты по возрастным периодам и сортируем по дате (новые выше)
  const ageTests = useMemo(() => {
    return firestoreTests
      .filter((test) => test.rubric !== 'full-course')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [firestoreTests]);

  const testChains = useMemo(() => buildTestChains(ageTests), [ageTests]);

  const renderLevelButton = (level: FirestoreTest, idx: number) => {
    const label = formatLevelLabel(level, idx + 1);
    const rootUnlocked = testUnlockStatus[level.id] ?? false;

    if (rootUnlocked) {
      return (
        <Link
          key={level.id}
          to={`/tests/dynamic/${level.id}`}
          className="flex items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-100"
        >
          <span>{label}</span>
          <span className="text-xs text-blue-500">→</span>
        </Link>
      );
    } else {
      return (
        <div
          key={level.id}
          className="flex items-center justify-between rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-400"
        >
          <span>{label}</span>
          <span className="text-xs text-gray-400">🔒</span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/profile"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <span className="text-xl mr-2">←</span>
          Вернуться в профиль
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">📊</span>
            <h1 className="text-3xl font-bold text-gray-900">Тесты по возрастным периодам</h1>
          </div>
          <p className="text-gray-600 mb-6">
            Здесь собраны тесты, посвящённые конкретным возрастным периодам. Каждый тест проверяет ваши знания по определённому этапу развития человека.
          </p>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800">
              💡 <strong>Совет:</strong> Выбирайте тесты по периодам, которые вы уже изучили. Это поможет закрепить материал и проверить понимание ключевых концепций развития.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loadingTests ? (
            <>
              <div className="relative bg-white border-2 rounded-xl p-6 animate-pulse border-gray-200">
                <div className="w-16 h-16 bg-gray-200 rounded-xl mb-4" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="relative bg-white border-2 rounded-xl p-6 animate-pulse border-gray-200">
                <div className="w-16 h-16 bg-gray-200 rounded-xl mb-4" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </>
          ) : testChains.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Тесты по возрастным периодам скоро появятся
              </p>
              <p className="text-gray-500">
                Мы работаем над созданием тестов для каждого возрастного периода
              </p>
            </div>
          ) : (
            testChains.map((chain) => (
              <TestCard
                key={chain.root.id}
                chain={chain}
                testUnlockStatus={testUnlockStatus}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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



interface LegacyTest {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  questionCount?: number;
  duration?: string;
  active: boolean;
  link?: string;
}

const COURSE_TESTS: LegacyTest[] = [
  {
    id: 'general-knowledge',
    title: 'Общие знания по курсу',
    description: 'Проверьте своё понимание основных концепций психологии развития',
    icon: '📚',
    color: 'from-blue-500 to-blue-600',
    questionCount: 50,
    duration: '45 мин',
    active: false,
  },
  {
    id: 'developmental-stages',
    title: 'Этапы развития',
    description: 'Тест на знание возрастных периодов и их особенностей',
    icon: '🌱',
    color: 'from-green-500 to-green-600',
    questionCount: 40,
    duration: '35 мин',
    active: false,
  },
  {
    id: 'practical-application',
    title: 'Практическое применение',
    description: 'Кейсы и практические задачи по материалам курса',
    icon: '🎯',
    color: 'from-orange-500 to-orange-600',
    questionCount: 25,
    duration: '30 мин',
    active: false,
  },
  {
    id: 'cognitive-development',
    title: 'Когнитивное развитие',
    description: 'Тест по теориям и особенностям когнитивного развития',
    icon: '🧠',
    color: 'from-pink-500 to-pink-600',
    questionCount: 35,
    duration: '30 мин',
    active: false,
  },
  {
    id: 'social-emotional',
    title: 'Социально-эмоциональное развитие',
    description: 'Вопросы по социализации, эмоциям и привязанности',
    icon: '❤️',
    color: 'from-red-500 to-red-600',
    questionCount: 30,
    duration: '25 мин',
    active: false,
  },
];



function getCombinedAppearance(test: FirestoreTest): TestAppearance {
  return mergeAppearance(test.appearance);
}

export default function Tests() {
  const { user } = useAuth();
  const [firestoreTests, setFirestoreTests] = useState<FirestoreTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [testUnlockStatus, setTestUnlockStatus] = useState<Record<string, boolean>>({});

  // Загрузка опубликованных тестов из Firestore
  useEffect(() => {
    const loadTests = async () => {
      try {
        setLoadingTests(true);
        const tests = await getPublishedTests();
        console.log('🔵 [Tests.tsx] Загружено тестов из Firestore:', tests.length);
        console.log('📋 [Tests.tsx] Список тестов:', tests);
        setFirestoreTests(tests);

        // Проверяем доступность тестов для пользователя
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
          console.log('🔓 [Tests.tsx] Статусы разблокировки:', unlockStatus);
        }
      } catch (error) {
        console.error('❌ [Tests.tsx] Ошибка загрузки тестов:', error);
      } finally {
        setLoadingTests(false);
      }
    };

    loadTests();
  }, [user]);

  // Фильтруем только тесты по полному курсу и сортируем по дате (новые выше)
  const courseTests = useMemo(() => {
    return firestoreTests
      .filter((test) => test.rubric === 'full-course')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [firestoreTests]);

  const testChains = useMemo(() => buildTestChains(courseTests), [courseTests]);

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
            <span className="text-4xl">📝</span>
            <h1 className="text-3xl font-bold text-gray-900">Тесты по курсу</h1>
          </div>
          <p className="text-gray-600 mb-6">
            Проверьте свои знания с помощью тематических тестов. Тесты будут постепенно добавляться по мере наполнения курса.
          </p>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Совет:</strong> Рекомендуем проходить тесты после изучения соответствующих разделов курса. Результаты будут сохраняться в вашем профиле.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Тесты из Firestore */}
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
            <div className="relative bg-white border-2 rounded-xl p-6 text-gray-500">
              Нет опубликованных тестов.
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

          {/* Заглушки - примеры будущих тестов */}
          {!loadingTests && COURSE_TESTS.map((test) => {
            // Контент без кнопок level2/level3
            const baseContent = (
              <>
                {!test.active && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                      Скоро
                    </span>
                  </div>
                )}

                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${test.color} text-4xl mb-4 shadow-md`}
                >
                  {test.icon}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{test.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{test.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  {test.questionCount && (
                    <div className="flex items-center gap-1">
                      <span>📋</span>
                      <span>{test.questionCount} вопросов</span>
                    </div>
                  )}
                  {test.duration && (
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      <span>{test.duration}</span>
                    </div>
                  )}
                </div>

                {!test.active && (
                  <div className="absolute inset-0 bg-gray-50/50 rounded-xl backdrop-blur-[1px] cursor-not-allowed" />
                )}
              </>
            );

            // Кнопки дополнительных уровней (вне Link)
            if (test.active && test.link) {
              return (
                <div key={test.id} className="relative bg-white border-2 rounded-xl p-6 transition-all duration-300 border-gray-200 hover:border-blue-400 hover:shadow-lg">
                  <Link to={test.link} className="block">
                    {baseContent}
                  </Link>
                </div>
              );
            }

            return (
              <div
                key={test.id}
                className="relative bg-white border-2 rounded-xl p-6 transition-all duration-300 border-gray-200 opacity-60 min-h-[280px]"
              >
                {baseContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

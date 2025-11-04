import { useState, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getPublishedTests } from '../lib/tests';
import { isTestUnlocked } from '../lib/testAccess';
import type { Test as FirestoreTest, TestAppearance } from '../types/tests';
import { AGE_RANGE_LABELS } from '../types/notes';
import { mergeAppearance, createGradient, hexToRgba } from '../utils/testAppearance';

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

// Вспомогательная функция для получения иконки и цвета по рубрике
function getTestMetadata(rubric: string): { icon: string; color: string; description: string } {
  if (rubric === 'full-course') {
    return {
      icon: '🎓',
      color: 'from-indigo-500 to-indigo-600',
      description: 'Тест по всему курсу психологии развития',
    };
  }

  // Для возрастных периодов
  const label = AGE_RANGE_LABELS[rubric as keyof typeof AGE_RANGE_LABELS];
  return {
    icon: '📖',
    color: 'from-teal-500 to-teal-600',
    description: label ? `Тест по периоду: ${label}` : 'Тематический тест',
  };
}

interface TestChain {
  root: FirestoreTest;
  levels: FirestoreTest[];
}

const MAX_CHAIN_LENGTH = 3;

function buildTestChains(tests: FirestoreTest[]): TestChain[] {
  if (tests.length === 0) return [];

  const byId = new Map(tests.map((test) => [test.id, test]));
  const children = new Map<string, FirestoreTest[]>();

  tests.forEach((test) => {
    if (!test.prerequisiteTestId) return;
    const list = children.get(test.prerequisiteTestId) ?? [];
    list.push(test);
    children.set(test.prerequisiteTestId, list);
  });

  const roots: FirestoreTest[] = [];
  const visited = new Set<string>();

  tests.forEach((test) => {
    if (!test.prerequisiteTestId || !byId.has(test.prerequisiteTestId)) {
      roots.push(test);
    }
  });

  const chains: TestChain[] = [];

  const sortByCreated = (a: FirestoreTest, b: FirestoreTest) =>
    (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0);

  roots.sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0));

  for (const root of roots) {
    const chain: FirestoreTest[] = [];
    const localVisited = new Set<string>();
    let node: FirestoreTest | undefined = root;

    while (node && !localVisited.has(node.id) && chain.length < MAX_CHAIN_LENGTH) {
      chain.push(node);
      visited.add(node.id);
      localVisited.add(node.id);

      const successors = (children.get(node.id) ?? [])
        .slice()
        .sort(sortByCreated)
        .filter((test) => !localVisited.has(test.id));

      if (successors.length === 0) {
        break;
      }

      node = successors[0];
    }

    chains.push({ root, levels: chain });
  }

  // Добавляем одиночные тесты, которые не попали в цепочки
  tests.forEach((test) => {
    if (!visited.has(test.id)) {
      chains.push({ root: test, levels: [test] });
    }
  });

  return chains.sort(
    (a, b) => (b.root.updatedAt?.getTime?.() ?? 0) - (a.root.updatedAt?.getTime?.() ?? 0)
  );
}

function cleanLevelLabel(text: string) {
  return text
    .replace(/^Уровень\s*\d+\s*[-–—:]?\s*/i, '')
    .trim();
}

function formatLevelLabel(test: FirestoreTest, index: number) {
  const levelNumber = index + 1;
  const parts = test.title.split(':');
  if (parts.length > 1) {
    const suffix = cleanLevelLabel(parts.slice(1).join(':').trim());
    if (suffix) {
      return suffix;
    }
  }
  return cleanLevelLabel(test.title) || `Уровень ${levelNumber}`;
}

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

  const testChains = useMemo(() => buildTestChains(firestoreTests), [firestoreTests]);

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
          {COURSE_TESTS.map((test) => {
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
                className="relative bg-white border-2 rounded-xl p-6 transition-all duration-300 border-gray-200 opacity-60"
              >
                {baseContent}
              </div>
            );
          })}

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
            testChains.map((chain) => {
              const root = chain.root;
              const appearance = getCombinedAppearance(root);
              const metadata = getTestMetadata(root.rubric);
              const iconGradientStyle: CSSProperties = {
                backgroundImage: createGradient(
                  appearance.accentGradientFrom,
                  appearance.accentGradientTo,
                  appearance.resolvedTheme?.primary
                ),
              };
              const badgeGradientStyle: CSSProperties = {
                backgroundImage: createGradient(
                  appearance.badgeGradientFrom ?? appearance.accentGradientFrom,
                  appearance.badgeGradientTo ?? appearance.accentGradientTo,
                  appearance.resolvedTheme?.badge
                ),
              };
              const cardStyle: CSSProperties = { height: 260 };

              const levels = chain.levels.slice(1);
              const titleText = root.title.split(':')[0]?.trim() || root.title;
              const description = appearance.introDescription || metadata.description;
              const rootUnlocked = testUnlockStatus[root.id] ?? true;

              const renderLevelButton = (test: FirestoreTest, idx: number) => {
                const levelAppearance = mergeAppearance(test.appearance);
                const levelGradientStyle: CSSProperties = {
                  backgroundImage: createGradient(
                    levelAppearance.accentGradientFrom,
                    levelAppearance.accentGradientTo,
                    levelAppearance.resolvedTheme?.primary
                  ),
                };
                const label = formatLevelLabel(test, idx + 1);
                const icon = levelAppearance.badgeIcon || '🔥'.repeat(Math.min(idx + 2, 3));
                const unlocked = testUnlockStatus[test.id] ?? true;

                if (unlocked) {
                  return (
                    <Link
                      key={test.id}
                      to={`/tests/dynamic/${test.id}`}
                      style={levelGradientStyle}
                      className="h-10 rounded-xl px-4 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </Link>
                  );
                }

                return (
                  <div
                    key={test.id}
                    className="h-10 rounded-xl border border-dashed border-gray-300 px-4 text-sm text-gray-500 bg-gray-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>🔒</span>
                    <span>{label}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      ≥{test.requiredPercentage ?? 70}%
                    </span>
                  </div>
                );
              };

              const badgeLabel = appearance.badgeLabel?.trim();
              const showBadge = Boolean(badgeLabel);

              return (
                <div
                  key={root.id}
                  className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg"
                  style={cardStyle}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl text-white shadow"
                      style={iconGradientStyle}
                    >
                    {appearance.introIcon || metadata.icon}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                      {showBadge && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1" style={badgeGradientStyle}>
                            {appearance.badgeIcon ? <span>{appearance.badgeIcon}</span> : null}
                            <span>{badgeLabel}</span>
                          </span>
                        </div>
                      )}
                      {rootUnlocked ? (
                        <Link
                          to={`/tests/dynamic/${root.id}`}
                          className={`text-left font-semibold text-gray-900 ${levels.length === 0 ? 'text-xl' : 'text-lg'} hover:underline focus:underline transition-colors`}
                        >
                          {titleText}
                        </Link>
                      ) : (
                        <div className={`font-semibold text-gray-900 ${levels.length === 0 ? 'text-xl' : 'text-lg'}`}>
                          {titleText}
                        </div>
                      )}
                      {description && (
                        <p className={`${levels.length === 0 ? 'text-base' : 'text-sm'} text-gray-600 leading-snug line-clamp-3`}>
                          {description}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1">
                          <span>📋</span>
                          <span>{root.questionCount} вопросов</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span>🔥</span>
                          <span>{chain.levels.length} уровня</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {levels.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                      {levels.map((level, idx) => renderLevelButton(level, idx))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

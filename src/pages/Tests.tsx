import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getTestResults } from '../lib/testResults';

interface Test {
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

const COURSE_TESTS: Test[] = [
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
    id: 'key-authors',
    title: 'Ключевые авторы и теории',
    description: 'Проверьте знание авторов и их вклада в психологию развития',
    icon: '👥',
    color: 'from-purple-500 to-purple-600',
    questionCount: 10,
    duration: '10 мин',
    active: true,
    link: '/tests/authors',
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

export default function Tests() {
  const { user } = useAuth();
  const [isLevel2Unlocked, setIsLevel2Unlocked] = useState(false);
  const [isLevel3Unlocked, setIsLevel3Unlocked] = useState(false);

  // Проверка разблокировки уровней 2 и 3 для теста "Авторы и теории"
  useEffect(() => {
    if (!user) return;

    const checkUnlocks = async () => {
      try {
        // Проверка Level 2
        const level1Results = await getTestResults(user.uid, 'authors-test');
        const hasLevel1Perfect = level1Results.some((result) => result.score === 10);
        setIsLevel2Unlocked(hasLevel1Perfect);

        // Проверка Level 3
        const level2Results = await getTestResults(user.uid, 'authors-test-level2');
        const hasLevel2Perfect = level2Results.some((result) => result.score === 10);
        setIsLevel3Unlocked(hasLevel2Perfect);
      } catch (error) {
        console.error('Error checking level unlocks:', error);
      }
    };

    checkUnlocks();
  }, [user]);

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
            const content = (
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

                {/* Индикаторы уровней 2 и 3 */}
                {test.id === 'key-authors' && (
                  <div className="flex flex-col gap-2">
                    {isLevel2Unlocked && (
                      <Link
                        to="/tests/authors/level2"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg text-sm font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>🔥</span>
                        <span>Уровень 2 доступен!</span>
                      </Link>
                    )}
                    {isLevel3Unlocked && (
                      <Link
                        to="/tests/authors/level3"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>🔥🔥</span>
                        <span>Уровень 3 доступен!</span>
                      </Link>
                    )}
                  </div>
                )}

                {!test.active && (
                  <div className="absolute inset-0 bg-gray-50/50 rounded-xl backdrop-blur-[1px] cursor-not-allowed" />
                )}
              </>
            );

            if (test.active && test.link) {
              return (
                <Link
                  key={test.id}
                  to={test.link}
                  className="relative bg-white border-2 rounded-xl p-6 transition-all duration-300 border-gray-200 hover:border-blue-400 hover:shadow-lg cursor-pointer"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={test.id}
                className="relative bg-white border-2 rounded-xl p-6 transition-all duration-300 border-gray-200 opacity-60"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

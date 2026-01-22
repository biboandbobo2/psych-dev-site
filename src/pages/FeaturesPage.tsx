import { Link } from 'react-router-dom';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  details: string[];
  color: string;
  link?: string;
}

function FeatureCard({ icon, title, description, details, color, link }: FeatureCardProps) {
  const content = (
    <div className="relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 transition-all duration-300 hover:shadow-lg h-full">
      <div
        className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${color} text-3xl mb-4 shadow-md`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {details.length > 0 && (
        <ul className="space-y-2">
          {details.map((detail, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface FeatureSectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function FeatureSection({ title, subtitle, children }: FeatureSectionProps) {
  return (
    <section className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <div className="space-y-6">
      {/* Hero секция */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-12 sm:px-8 sm:py-16 text-center text-white">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Возможности платформы</h1>
          <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto">
            Всё, что нужно для изучения психологии — видеолекции, тесты, заметки, научный поиск и
            интерактивные инструменты
          </p>
        </div>
      </div>

      {/* Основной контент */}
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        {/* Курсы */}
        <FeatureSection
          title="📚 Три курса психологии"
          subtitle="Структурированный образовательный контент от профессиональных преподавателей"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              icon="👶"
              title="Психология развития"
              description="14 возрастных периодов от пренатального до 80+"
              color="from-blue-500 to-blue-600"
              details={[]}
            />
            <FeatureCard
              icon="🧠"
              title="Клиническая психология"
              description="12 тематических разделов о патопсихологии"
              color="from-purple-500 to-purple-600"
              details={[]}
            />
            <FeatureCard
              icon="📖"
              title="Общая психология"
              description="12 занятий по основам психологии"
              color="from-green-500 to-green-600"
              details={[]}
            />
          </div>
        </FeatureSection>

        {/* Занятия */}
        <FeatureSection
          title="🎓 Структура занятий"
          subtitle="Каждое занятие содержит всё необходимое для глубокого изучения темы"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">🎥</span>
              <div>
                <h4 className="font-semibold text-gray-900">Видеолекции</h4>
                <p className="text-sm text-gray-600">
                  Профессионально записанные лекции с презентациями
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">📝</span>
              <div>
                <h4 className="font-semibold text-gray-900">Понятия</h4>
                <p className="text-sm text-gray-600">Ключевые термины и определения для запоминания</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">👤</span>
              <div>
                <h4 className="font-semibold text-gray-900">Персоналии</h4>
                <p className="text-sm text-gray-600">Известные психологи и их вклад в науку</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">📚</span>
              <div>
                <h4 className="font-semibold text-gray-900">Литература</h4>
                <p className="text-sm text-gray-600">Основные и дополнительные источники</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">🎬</span>
              <div>
                <h4 className="font-semibold text-gray-900">Доп. видео</h4>
                <p className="text-sm text-gray-600">Фильмы и документальные материалы по теме</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className="font-semibold text-gray-900">Самопроверка</h4>
                <p className="text-sm text-gray-600">Тесты для закрепления материала</p>
              </div>
            </div>
          </div>
        </FeatureSection>

        {/* Тесты */}
        <FeatureSection
          title="📊 Система тестирования"
          subtitle="Проверяйте знания и отслеживайте прогресс"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              icon="📚"
              title="Тесты по курсу"
              description="Комплексные тесты для проверки знаний по всему курсу"
              color="from-green-500 to-green-600"
              link="/tests"
              details={[
                'Вопросы с несколькими вариантами ответов',
                'Мгновенная обратная связь',
                'Сохранение результатов',
                'Система уровней и разблокировки',
              ]}
            />
            <FeatureCard
              icon="📝"
              title="Тесты по занятиям"
              description="Тесты привязанные к конкретным темам и периодам"
              color="from-orange-500 to-orange-600"
              link="/tests-lesson"
              details={[
                'Проверка после каждого занятия',
                'Объяснения к ответам',
                'Ссылки на материалы',
                'Прогресс по каждой теме',
              ]}
            />
          </div>
        </FeatureSection>

        {/* Заметки */}
        <FeatureSection
          title="📝 Личные заметки"
          subtitle="Создавайте конспекты и возвращайтесь к ним в любое время"
        >
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span>✍️</span> Создание и редактирование
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Привязка к возрастным периодам
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Выбор тем для размышления
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Полнотекстовый поиск
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    Сортировка и фильтрация
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span>📈</span> Статистика и экспорт
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">•</span>
                    Количество изученных периодов
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">•</span>
                    Заметки за сегодня и неделю
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">•</span>
                    Экспорт в JSON и PDF
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">•</span>
                    Приватное хранение
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-100">
              <Link
                to="/notes"
                className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700"
              >
                Перейти к заметкам →
              </Link>
            </div>
          </div>
        </FeatureSection>

        {/* Таймлайн */}
        <FeatureSection
          title="🗺️ Таймлайн жизни"
          subtitle="Визуализируйте свой жизненный путь через призму психологии развития"
        >
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">📌</span> Создание событий
                </h4>
                <p className="text-sm text-gray-600">
                  Добавляйте ключевые события своей жизни с датами, описаниями и иконками. Отмечайте
                  важные решения и поворотные моменты.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">🌳</span> Ветвление
                </h4>
                <p className="text-sm text-gray-600">
                  Создавайте альтернативные жизненные пути — «что было бы, если...». Исследуйте
                  возможные развилки судьбы.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">📊</span> Периодизация
                </h4>
                <p className="text-sm text-gray-600">
                  Наложение возрастных периодов психологии развития на вашу личную историю для
                  глубокого анализа.
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <span className="text-2xl">🎨</span>
                <p className="text-xs text-gray-600 mt-1">40+ иконок</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <span className="text-2xl">↩️</span>
                <p className="text-xs text-gray-600 mt-1">Отмена действий</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <span className="text-2xl">📤</span>
                <p className="text-xs text-gray-600 mt-1">Экспорт PNG/PDF</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <span className="text-2xl">💾</span>
                <p className="text-xs text-gray-600 mt-1">Автосохранение</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-orange-100">
              <Link
                to="/timeline"
                className="inline-flex items-center gap-2 text-orange-600 font-medium hover:text-orange-700"
              >
                Открыть таймлайн →
              </Link>
            </div>
          </div>
        </FeatureSection>

        {/* Научный поиск */}
        <FeatureSection
          title="🔬 Научный поиск"
          subtitle="Находите научные статьи и получайте ответы на вопросы по психологии"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📄</span>
                <h4 className="text-lg font-semibold text-gray-900">Поиск статей</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  OpenAlex, Semantic Scholar, OpenAIRE
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Фильтры по языкам и годам
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Open Access статьи
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  История поисков
                </li>
              </ul>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🤖</span>
                <h4 className="text-lg font-semibold text-gray-900">AI-помощник</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Ответы на вопросы по психологии
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Поиск по учебникам (Book RAG)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Цитирование с номерами страниц
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Google Gemini API
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/research"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              🔍 Открыть научный поиск
            </Link>
          </div>
        </FeatureSection>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 sm:p-8 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Готовы начать обучение?</h2>
          <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">
            Войдите в аккаунт, чтобы получить доступ ко всем возможностям платформы
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            👤 Перейти в профиль
          </Link>
        </div>
      </div>
    </div>
  );
}

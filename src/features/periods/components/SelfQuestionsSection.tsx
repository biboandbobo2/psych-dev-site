import { Link } from 'react-router-dom';
import type { TestSummary } from '../../../types/tests';
import { Section } from '../../../components/ui/Section';
import { Button } from '../../../components/ui/Button';
import { ensureUrl } from '../utils/media';
import { mergeAppearance, createGradient } from '../../../utils/testAppearance';

interface SelfQuestionsSectionProps {
  slug: string;
  title: string;
  content: any[];
  periodTests: TestSummary[];
}

export function SelfQuestionsSection({ slug, title, content, periodTests }: SelfQuestionsSectionProps) {
  const firstItem = content.find((item) => typeof item === 'string') ?? '';
  const parsedUrl = ensureUrl(firstItem);

  // Если нет ни рабочей тетради, ни тестов - не показываем секцию
  if (!parsedUrl && periodTests.length === 0) {
    return null;
  }

  return (
    <Section key={slug} title={title}>
      {parsedUrl ? (
        <div className="flex flex-col gap-3">
          <p className="text-lg leading-8 text-muted max-w-measure">
            Скачайте рабочую тетрадь и держите её под рукой во время просмотра лекции.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              as="a"
              href={parsedUrl.toString()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              Скачать рабочую тетрадь
            </Button>
            {periodTests.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {periodTests.map((test) => {
                  const appearance = mergeAppearance(test.appearance);
                  const icon = appearance.introIcon || '📖';
                  const backgroundImage = createGradient(
                    appearance.accentGradientFrom,
                    appearance.accentGradientTo,
                    appearance.resolvedTheme?.primary
                  );
                  return (
                    <Link
                      key={test.id}
                      to={`/tests/dynamic/${test.id}`}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl text-white shadow hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                      title={test.title}
                      style={{ backgroundImage }}
                    >
                      {icon}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Если нет рабочей тетради, но есть тесты - показываем только тесты
        periodTests.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {periodTests.map((test) => {
              const appearance = mergeAppearance(test.appearance);
              const icon = appearance.introIcon || '📖';
              const backgroundImage = createGradient(
                appearance.accentGradientFrom,
                appearance.accentGradientTo,
                appearance.resolvedTheme?.primary
              );
              return (
                <Link
                  key={test.id}
                  to={`/tests/dynamic/${test.id}`}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl text-white shadow hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                  title={test.title}
                  style={{ backgroundImage }}
                >
                  {icon}
                </Link>
              );
            })}
          </div>
        )
      )}
    </Section>
  );
}

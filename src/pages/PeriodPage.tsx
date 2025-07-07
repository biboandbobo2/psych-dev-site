import { useParams } from 'react-router-dom';
import { usePeriods } from '../hooks/usePeriods';

export default function PeriodPage() {
  const { slug } = useParams();
  const period = usePeriods().find(p => p.slug === slug);
  if (!period) return <p>Not found</p>;

  return (
    <article
      className="w-full max-w-3xl space-y-10
                 px-4 sm:px-6 lg:px-0 py-8 mx-auto">
      <h1 className="text-3xl font-bold">{period.title}</h1>

      {period.concepts?.length && (
        <Section title="Основные понятия">
          <ul className="list-disc list-inside space-y-1">
            {period.concepts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Section>
      )}

      {period.authors?.length && (
        <Section title="Авторы">
          <ul className="list-disc list-inside">
            {period.authors.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Section>
      )}

      {period.coreRead && (
        <Section title="Основное чтение">
          <p>{period.coreRead}</p>
        </Section>
      )}

      {period.extraVideo && (
        <Section title="Дополнительное видео">
          <div className="aspect-video">
            <iframe
              src={period.extraVideo}
              className="w-full h-full rounded"
              allowFullScreen
            />
          </div>
        </Section>
      )}

      {period.quiz && (
        <Section title="Вопрос">
          <p className="mb-2 font-medium">{period.quiz.q}</p>
          <ul className="list-disc list-inside">
            {period.quiz.options.map((opt: string, i: number) => (
              <li key={i}>{opt}</li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

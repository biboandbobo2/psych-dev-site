import { Section } from '../../../components/ui/Section';
import { ensureUrl } from '../utils/media';

interface GenericSectionProps {
  slug: string;
  title: string;
  content: any[];
}

export function GenericSection({ slug, title, content }: GenericSectionProps) {
  if (!content.length) return null;

  return (
    <Section key={slug} title={title}>
      <div className="space-y-4">
        {content.map((item, index) => {
          if (typeof item === 'string') {
            const parsedUrl = ensureUrl(item);
            if (parsedUrl) {
              return (
                <p key={`${slug}-string-url-${index}`} className="text-lg leading-8 text-fg">
                  <a className="text-accent no-underline hover:no-underline focus-visible:no-underline" href={parsedUrl.toString()} target="_blank" rel="noreferrer">
                    {item}
                  </a>
                </p>
              );
            }

            return (
              <p key={`${slug}-string-${index}`} className="text-lg leading-8 text-fg max-w-measure">
                {item}
              </p>
            );
          }

          if (item?.type === 'quiz') {
            return (
              <details
                key={`${slug}-quiz-${index}`}
                className="group rounded-2xl bg-card2 border border-border/60 px-5 py-4 text-fg"
              >
                <summary className="cursor-pointer font-semibold leading-7">
                  {item.q}
                </summary>
                <ul className="mt-3 space-y-2 list-disc pl-6 marker:text-accent text-base leading-7">
                  {item.options.map((opt: string) => (
                    <li
                      key={opt}
                      className={opt === item.a ? 'font-semibold text-accent' : ''}
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              </details>
            );
          }

          const rawUrl = typeof item?.url === 'string' ? item.url.trim() : '';
          const parsedUrl = ensureUrl(rawUrl);
          const primaryText =
            (typeof item?.title === 'string' && item.title.trim()) ||
            (typeof item?.label === 'string' && item.label.trim()) ||
            (typeof item?.name === 'string' && item.name.trim()) ||
            '';
          const secondaryText =
            (typeof item?.author === 'string' && item.author.trim()) ||
            (typeof item?.subtitle === 'string' && item.subtitle.trim()) ||
            (typeof item?.type === 'string' && item.type.trim()) ||
            '';
          const yearText =
            (typeof item?.year === 'string' && item.year.trim()) ||
            (typeof item?.year === 'number' ? item.year.toString() : '') ||
            '';

          const contentNode = (
            <span className="text-lg leading-8 text-fg">
              {primaryText ? <strong>{primaryText}</strong> : null}
              {secondaryText ? ` — ${secondaryText}` : ''}
              {yearText ? ` (${yearText})` : ''}
            </span>
          );

          const fallbackNode = rawUrl ? (
            <span className="text-lg leading-8 text-fg">{rawUrl}</span>
          ) : null;

          if (parsedUrl) {
            return (
              <p key={`${slug}-resource-${index}`} className="text-lg leading-8 text-fg max-w-measure">
                <a
                  className="text-accent no-underline hover:no-underline focus-visible:no-underline"
                  href={parsedUrl.toString()}
                  target="_blank"
                  rel="noreferrer"
                >
                  {primaryText ? contentNode : fallbackNode || parsedUrl.toString()}
                </a>
              </p>
            );
          }

          return (
            <p key={`${slug}-fallback-${index}`} className="text-lg leading-8 text-fg max-w-measure">
              {primaryText ? contentNode : fallbackNode}
              {!primaryText && !fallbackNode && typeof item === 'object' ? (
                <code className="text-sm text-muted block whitespace-pre-wrap">
                  {JSON.stringify(item, null, 2)}
                </code>
              ) : null}
            </p>
          );
        })}
      </div>
    </Section>
  );
}

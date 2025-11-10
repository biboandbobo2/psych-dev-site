import { Section } from '../../../components/ui/Section';

interface ListSectionProps {
  slug: string;
  title: string;
  items: string[];
}

export function ListSection({ slug, title, items }: ListSectionProps) {
  if (!items.length) return null;

  return (
    <Section key={slug} title={title}>
      <ul className="list-disc pl-6 marker:text-accent space-y-2 text-lg leading-8 text-fg">
        {items.map((item, index) => (
          <li key={`${slug}-list-${index}`} className="leading-7 text-fg">
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

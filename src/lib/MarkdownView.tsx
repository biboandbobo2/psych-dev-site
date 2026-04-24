import { renderMiniMarkdown } from './miniMarkdown';

interface MarkdownViewProps {
  source: string | null | undefined;
  className?: string;
}

export function MarkdownView({ source, className }: MarkdownViewProps) {
  const html = renderMiniMarkdown(source);
  if (!html) return null;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

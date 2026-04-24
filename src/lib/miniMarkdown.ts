const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITALIC_RE = /(^|[^*])\*([^*]+)\*(?!\*)/g;
const SAFE_URL = /^(https?:\/\/|mailto:|\/)/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!SAFE_URL.test(trimmed)) return null;
  return trimmed;
}

function renderInline(line: string): string {
  let html = escapeHtml(line);

  html = html.replace(LINK_RE, (_full, label: string, url: string) => {
    const safe = safeUrl(url);
    if (!safe) return `[${label}](${url})`;
    const encoded = safe.replace(/"/g, '&quot;');
    const external = /^https?:\/\//i.test(safe);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${encoded}" class="text-[#2F6DB5] underline hover:text-[#1F4F86]"${attrs}>${label}</a>`;
  });

  html = html.replace(BOLD_RE, (_full, inner: string) => `<strong>${inner}</strong>`);
  html = html.replace(ITALIC_RE, (_full, pre: string, inner: string) => `${pre}<em>${inner}</em>`);

  return html;
}

export function renderMiniMarkdown(source: string | null | undefined): string {
  if (!source) return '';
  const paragraphs = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return paragraphs
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      const withBreaks = trimmed.split('\n').map(renderInline).join('<br />');
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

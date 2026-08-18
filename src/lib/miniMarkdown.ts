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

const HEADING_RE = /^(#{2,3})\s+(.+)$/;

function renderParagraph(paragraph: string): string {
  const lines = paragraph
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  const blocks: string[] = [];
  let textLines: string[] = [];
  let listItems: string[] = [];

  const flushText = () => {
    if (textLines.length === 0) return;
    blocks.push(`<p>${textLines.join('<br />')}</p>`);
    textLines = [];
  };
  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(`<ul class="list-disc space-y-1 pl-5">${listItems.join('')}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      flushText();
      flushList();
      const tag = heading[1].length === 2 ? 'h3' : 'h4';
      const size = tag === 'h3' ? 'text-base' : 'text-sm';
      blocks.push(`<${tag} class="${size} font-semibold text-[#2C3E50]">${renderInline(heading[2])}</${tag}>`);
      continue;
    }
    if (line.startsWith('- ')) {
      flushText();
      listItems.push(`<li>${renderInline(line.slice(2))}</li>`);
      continue;
    }
    flushList();
    textLines.push(renderInline(line));
  }
  flushText();
  flushList();
  return blocks.join('\n');
}

export function renderMiniMarkdown(source: string | null | undefined): string {
  if (!source) return '';
  const paragraphs = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return paragraphs.map(renderParagraph).filter(Boolean).join('\n');
}

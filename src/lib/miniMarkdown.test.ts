import { describe, expect, it } from 'vitest';
import { renderMiniMarkdown } from './miniMarkdown';

describe('renderMiniMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(renderMiniMarkdown('')).toBe('');
    expect(renderMiniMarkdown(null)).toBe('');
    expect(renderMiniMarkdown(undefined)).toBe('');
  });

  it('wraps text in paragraphs', () => {
    expect(renderMiniMarkdown('hello')).toBe('<p>hello</p>');
  });

  it('splits paragraphs on double newlines and joins single newlines with <br />', () => {
    const html = renderMiniMarkdown('first\nsecond\n\nthird');
    expect(html).toBe('<p>first<br />second</p>\n<p>third</p>');
  });

  it('escapes HTML by default', () => {
    expect(renderMiniMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
    );
  });

  it('renders safe markdown links with target=_blank for external urls', () => {
    const html = renderMiniMarkdown('see [docs](https://example.com) for details');
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('>docs</a>');
  });

  it('keeps internal links without target attribute', () => {
    const html = renderMiniMarkdown('go to [home](/home)');
    expect(html).toContain('<a href="/home"');
    expect(html).not.toContain('target="_blank"');
  });

  it('allows mailto links', () => {
    const html = renderMiniMarkdown('write to [us](mailto:hi@example.com)');
    expect(html).toContain('<a href="mailto:hi@example.com"');
  });

  it('rejects javascript: URLs and renders literal text', () => {
    const html = renderMiniMarkdown('[evil](javascript:alert(1))');
    expect(html).not.toContain('<a');
    expect(html).toContain('[evil](javascript:alert(1))');
  });

  it('rejects data: URLs', () => {
    const html = renderMiniMarkdown('[x](data:text/html,hi)');
    expect(html).not.toContain('<a');
  });

  it('renders **bold** and *italic*', () => {
    expect(renderMiniMarkdown('**bold** text')).toBe('<p><strong>bold</strong> text</p>');
    expect(renderMiniMarkdown('this is *italic* here')).toBe(
      '<p>this is <em>italic</em> here</p>'
    );
  });

  it('trims empty paragraphs', () => {
    expect(renderMiniMarkdown('\n\n\ntext\n\n\n')).toBe('<p>text</p>');
  });
});

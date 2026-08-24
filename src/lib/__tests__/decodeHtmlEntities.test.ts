import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities } from '../decodeHtmlEntities';

describe('decodeHtmlEntities', () => {
  it('декодирует именованные сущности из YouTube-каптий', () => {
    expect(decodeHtmlEntities('&gt;&gt; Угу. Отлично.')).toBe('>> Угу. Отлично.');
    expect(decodeHtmlEntities('a &lt; b &amp;&amp; c &gt; d')).toBe('a < b && c > d');
    expect(decodeHtmlEntities('&quot;цитата&quot; и &apos;апостроф&apos;')).toBe(
      '"цитата" и \'апостроф\''
    );
    expect(decodeHtmlEntities('тире&nbsp;&mdash;&nbsp;вот')).toBe('тире\u00a0—\u00a0вот');
  });

  it('декодирует числовые сущности (dec и hex)', () => {
    expect(decodeHtmlEntities('&#39;квота&#39;')).toBe("'квота'");
    expect(decodeHtmlEntities('&#x2014; тире')).toBe('— тире');
  });

  it('декодирует только один уровень эскейпа', () => {
    expect(decodeHtmlEntities('&amp;gt;')).toBe('&gt;');
  });

  it('не трогает обычный текст и неизвестные сущности', () => {
    expect(decodeHtmlEntities('обычный текст без сущностей')).toBe(
      'обычный текст без сущностей'
    );
    expect(decodeHtmlEntities('&unknown; остаётся')).toBe('&unknown; остаётся');
    expect(decodeHtmlEntities('R&D — просто амперсанд')).toBe('R&D — просто амперсанд');
  });
});

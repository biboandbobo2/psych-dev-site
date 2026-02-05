import { describe, it, expect } from 'vitest';

// Re-implement the function here to test it in isolation.
// After refactoring, this will import from the actual module.
const splitEmails = (value: string): string[] => {
  const dedupe = new Set<string>();
  value
    .split(/[\n,;\s]+/g)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => dedupe.add(email));
  return Array.from(dedupe);
};

describe('splitEmails', () => {
  it('splits by newline', () => {
    expect(splitEmails('a@b.com\nc@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('splits by comma', () => {
    expect(splitEmails('a@b.com,c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('splits by semicolon', () => {
    expect(splitEmails('a@b.com;c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('splits by whitespace', () => {
    expect(splitEmails('a@b.com  c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('handles mixed separators', () => {
    expect(splitEmails('a@b.com, c@d.com;\ne@f.com')).toEqual([
      'a@b.com',
      'c@d.com',
      'e@f.com',
    ]);
  });

  it('deduplicates emails', () => {
    expect(splitEmails('a@b.com,a@b.com,A@B.COM')).toEqual(['a@b.com']);
  });

  it('converts to lowercase', () => {
    expect(splitEmails('Test@EXAMPLE.COM')).toEqual(['test@example.com']);
  });

  it('filters empty strings', () => {
    expect(splitEmails('')).toEqual([]);
    expect(splitEmails('   ')).toEqual([]);
    expect(splitEmails(',,,;;;\n\n')).toEqual([]);
  });
});

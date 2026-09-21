import { describe, it, expect } from 'vitest';
import { isValidEmail, splitEmails } from './emailList';

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

describe('isValidEmail', () => {
  it('принимает обычный адрес', () => {
    expect(isValidEmail('student@example.com')).toBe(true);
  });

  it('отбивает то, что сервер всё равно отбросит', () => {
    expect(isValidEmail('student')).toBe(false);
    expect(isValidEmail('student@example')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
});

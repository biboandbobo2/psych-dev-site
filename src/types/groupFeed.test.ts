import { describe, it, expect } from 'vitest';
import { normalizeGroupAnnouncement, normalizeGroupEvent } from './groupFeed';

describe('normalizeGroupAnnouncement', () => {
  const GROUP = 'g1';
  const ID = 'a1';

  it('normalizes valid announcement', () => {
    const result = normalizeGroupAnnouncement(GROUP, ID, {
      text: 'Hello world',
      createdBy: 'user1',
      createdAt: null,
    });
    expect(result).toEqual({
      id: ID,
      groupId: GROUP,
      text: 'Hello world',
      createdBy: 'user1',
      createdAt: null,
      createdByName: undefined,
    });
  });

  it('includes createdByName when present', () => {
    const result = normalizeGroupAnnouncement(GROUP, ID, {
      text: 'Hi',
      createdBy: 'user1',
      createdByName: 'Алексей',
    });
    expect(result?.createdByName).toBe('Алексей');
  });

  it('trims text', () => {
    const result = normalizeGroupAnnouncement(GROUP, ID, {
      text: '  trimmed  ',
      createdBy: 'user1',
    });
    expect(result?.text).toBe('trimmed');
  });

  it('returns null for null/undefined/non-object', () => {
    expect(normalizeGroupAnnouncement(GROUP, ID, null)).toBeNull();
    expect(normalizeGroupAnnouncement(GROUP, ID, undefined)).toBeNull();
    expect(normalizeGroupAnnouncement(GROUP, ID, 'string')).toBeNull();
    expect(normalizeGroupAnnouncement(GROUP, ID, 42)).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(normalizeGroupAnnouncement(GROUP, ID, { text: '', createdBy: 'u1' })).toBeNull();
    expect(normalizeGroupAnnouncement(GROUP, ID, { text: '   ', createdBy: 'u1' })).toBeNull();
  });

  it('returns null for missing createdBy', () => {
    expect(normalizeGroupAnnouncement(GROUP, ID, { text: 'Hi' })).toBeNull();
    expect(normalizeGroupAnnouncement(GROUP, ID, { text: 'Hi', createdBy: '' })).toBeNull();
  });

  it('returns null for non-string text', () => {
    expect(normalizeGroupAnnouncement(GROUP, ID, { text: 123, createdBy: 'u1' })).toBeNull();
  });
});

describe('normalizeGroupEvent', () => {
  const GROUP = 'g1';
  const ID = 'e1';

  it('normalizes valid event', () => {
    const result = normalizeGroupEvent(GROUP, ID, {
      text: 'Lecture',
      dateLabel: '2026-04-25',
      createdBy: 'user1',
      createdAt: null,
    });
    expect(result).toEqual({
      id: ID,
      groupId: GROUP,
      text: 'Lecture',
      dateLabel: '2026-04-25',
      createdBy: 'user1',
      createdAt: null,
      zoomLink: undefined,
      createdByName: undefined,
    });
  });

  it('includes zoomLink when valid', () => {
    const result = normalizeGroupEvent(GROUP, ID, {
      text: 'Zoom call',
      dateLabel: '2026-05-01',
      createdBy: 'u1',
      zoomLink: 'https://zoom.us/j/123',
    });
    expect(result?.zoomLink).toBe('https://zoom.us/j/123');
  });

  it('omits zoomLink when empty', () => {
    const result = normalizeGroupEvent(GROUP, ID, {
      text: 'No zoom',
      dateLabel: '2026-05-01',
      createdBy: 'u1',
      zoomLink: '   ',
    });
    expect(result?.zoomLink).toBeUndefined();
  });

  it('trims text and dateLabel', () => {
    const result = normalizeGroupEvent(GROUP, ID, {
      text: '  trimmed  ',
      dateLabel: '  2026-05-01  ',
      createdBy: 'u1',
    });
    expect(result?.text).toBe('trimmed');
    expect(result?.dateLabel).toBe('2026-05-01');
  });

  it('returns null for null/undefined/non-object', () => {
    expect(normalizeGroupEvent(GROUP, ID, null)).toBeNull();
    expect(normalizeGroupEvent(GROUP, ID, undefined)).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(normalizeGroupEvent(GROUP, ID, { text: '', dateLabel: 'x', createdBy: 'u1' })).toBeNull();
  });

  it('returns null for empty dateLabel', () => {
    expect(normalizeGroupEvent(GROUP, ID, { text: 'Hi', dateLabel: '', createdBy: 'u1' })).toBeNull();
  });

  it('returns null for missing createdBy', () => {
    expect(normalizeGroupEvent(GROUP, ID, { text: 'Hi', dateLabel: 'x' })).toBeNull();
  });
});

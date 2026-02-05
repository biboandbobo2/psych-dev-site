import { describe, it, expect } from 'vitest';
import { getCourseCollectionName } from '../courseCollectionRef';

describe('getCourseCollectionName', () => {
  it('returns "clinical-topics" for clinical course', () => {
    expect(getCourseCollectionName('clinical')).toBe('clinical-topics');
  });

  it('returns "general-topics" for general course', () => {
    expect(getCourseCollectionName('general')).toBe('general-topics');
  });

  it('returns "periods" for development (core) course', () => {
    expect(getCourseCollectionName('development')).toBe('periods');
  });

  it('returns null for dynamic (non-core) courses', () => {
    expect(getCourseCollectionName('custom-course')).toBeNull();
    expect(getCourseCollectionName('social-psychology')).toBeNull();
  });
});

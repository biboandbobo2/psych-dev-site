import { describe, it, expect } from 'vitest';
import { hasCourseAccess, type CourseAccessMap, type UserRole } from './user';

describe('hasCourseAccess', () => {
  describe('returns false for unauthenticated users', () => {
    it('returns false when role is null', () => {
      expect(hasCourseAccess(null, null, 'development')).toBe(false);
      expect(hasCourseAccess(null, null, 'clinical')).toBe(false);
      expect(hasCourseAccess(null, null, 'general')).toBe(false);
    });
  });

  describe('returns true for privileged roles', () => {
    const privilegedRoles: UserRole[] = ['student', 'admin', 'super-admin'];

    privilegedRoles.forEach((role) => {
      it(`returns true for ${role} regardless of courseAccess`, () => {
        // With null courseAccess
        expect(hasCourseAccess(role, null, 'development')).toBe(true);
        expect(hasCourseAccess(role, null, 'clinical')).toBe(true);
        expect(hasCourseAccess(role, null, 'general')).toBe(true);

        // With empty courseAccess
        expect(hasCourseAccess(role, {}, 'development')).toBe(true);
        expect(hasCourseAccess(role, {}, 'clinical')).toBe(true);
        expect(hasCourseAccess(role, {}, 'general')).toBe(true);

        // With explicit false
        const deniedAccess: CourseAccessMap = {
          development: false,
          clinical: false,
          general: false,
        };
        expect(hasCourseAccess(role, deniedAccess, 'development')).toBe(true);
        expect(hasCourseAccess(role, deniedAccess, 'clinical')).toBe(true);
        expect(hasCourseAccess(role, deniedAccess, 'general')).toBe(true);
      });
    });
  });

  describe('guest role checks courseAccess', () => {
    it('returns false when courseAccess is null', () => {
      expect(hasCourseAccess('guest', null, 'development')).toBe(false);
      expect(hasCourseAccess('guest', null, 'clinical')).toBe(false);
      expect(hasCourseAccess('guest', null, 'general')).toBe(false);
    });

    it('returns false when courseAccess is empty', () => {
      expect(hasCourseAccess('guest', {}, 'development')).toBe(false);
      expect(hasCourseAccess('guest', {}, 'clinical')).toBe(false);
      expect(hasCourseAccess('guest', {}, 'general')).toBe(false);
    });

    it('returns false when course is explicitly denied', () => {
      const access: CourseAccessMap = {
        development: false,
        clinical: false,
        general: false,
      };
      expect(hasCourseAccess('guest', access, 'development')).toBe(false);
      expect(hasCourseAccess('guest', access, 'clinical')).toBe(false);
      expect(hasCourseAccess('guest', access, 'general')).toBe(false);
    });

    it('returns true when course is granted', () => {
      const access: CourseAccessMap = {
        development: true,
        clinical: true,
        general: true,
      };
      expect(hasCourseAccess('guest', access, 'development')).toBe(true);
      expect(hasCourseAccess('guest', access, 'clinical')).toBe(true);
      expect(hasCourseAccess('guest', access, 'general')).toBe(true);
    });

    it('returns correct value for partial access', () => {
      const partialAccess: CourseAccessMap = {
        development: true,
        clinical: false,
        general: true,
      };
      expect(hasCourseAccess('guest', partialAccess, 'development')).toBe(true);
      expect(hasCourseAccess('guest', partialAccess, 'clinical')).toBe(false);
      expect(hasCourseAccess('guest', partialAccess, 'general')).toBe(true);
    });

    it('handles undefined fields as false', () => {
      const access: CourseAccessMap = {
        development: true,
        // clinical and general are undefined
      };
      expect(hasCourseAccess('guest', access, 'development')).toBe(true);
      expect(hasCourseAccess('guest', access, 'clinical')).toBe(false);
      expect(hasCourseAccess('guest', access, 'general')).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  hasCourseAccess,
  countAccessibleCourses,
  canEditCourse,
  normalizeUserRole,
  type CourseAccessMap,
  type UserRole,
} from './user';

describe('hasCourseAccess', () => {
  it('returns false for unauthenticated users (role=null)', () => {
    expect(hasCourseAccess(null, null, 'development')).toBe(false);
    expect(hasCourseAccess(null, {}, 'clinical')).toBe(false);
  });

  describe('admin roles bypass courseAccess', () => {
    const adminRoles: UserRole[] = ['admin', 'super-admin'];

    adminRoles.forEach((role) => {
      it(`returns true for ${role} regardless of courseAccess`, () => {
        expect(hasCourseAccess(role, null, 'development')).toBe(true);
        expect(hasCourseAccess(role, {}, 'clinical')).toBe(true);
        expect(
          hasCourseAccess(role, { development: false, clinical: false, general: false }, 'development')
        ).toBe(true);
      });
    });
  });

  describe('regular user (role=null) — courseAccess is the source of truth', () => {
    it('returns true only for courses marked true', () => {
      const access: CourseAccessMap = { development: true, clinical: false, general: true };
      expect(hasCourseAccess(null, access, 'development')).toBe(true);
      expect(hasCourseAccess(null, access, 'clinical')).toBe(false);
      expect(hasCourseAccess(null, access, 'general')).toBe(true);
    });

    it('returns false when courseAccess is null/empty/missing', () => {
      expect(hasCourseAccess(null, null, 'development')).toBe(false);
      expect(hasCourseAccess(null, {}, 'development')).toBe(false);
      expect(hasCourseAccess(null, { development: true }, 'clinical')).toBe(false);
    });
  });
});

describe('countAccessibleCourses', () => {
  it('returns 0 for role=null without courseAccess', () => {
    expect(countAccessibleCourses(null, null)).toBe(0);
    expect(countAccessibleCourses(null, {})).toBe(0);
  });

  it('counts explicit true for role=null', () => {
    expect(
      countAccessibleCourses(null, { development: true, clinical: false, general: true })
    ).toBe(2);
  });

  it('returns 3 for admin/super-admin regardless of courseAccess', () => {
    const adminRoles: UserRole[] = ['admin', 'super-admin'];
    adminRoles.forEach((role) => {
      expect(countAccessibleCourses(role, null)).toBe(3);
      expect(countAccessibleCourses(role, {})).toBe(3);
      expect(
        countAccessibleCourses(role, { development: false, clinical: false, general: false })
      ).toBe(3);
    });
  });

  it('supports custom course list', () => {
    expect(
      countAccessibleCourses(
        null,
        { development: true, 'social-psychology': true, 'cognitive-science': false },
        ['development', 'social-psychology', 'cognitive-science']
      )
    ).toBe(2);
  });
});

describe('canEditCourse', () => {
  it('super-admin can edit any course', () => {
    expect(canEditCourse('super-admin', undefined, 'development')).toBe(true);
    expect(canEditCourse('super-admin', [], 'clinical')).toBe(true);
    expect(canEditCourse('super-admin', ['general'], 'development')).toBe(true);
  });

  it('admin needs the course in adminEditableCourses', () => {
    expect(canEditCourse('admin', ['development'], 'development')).toBe(true);
    expect(canEditCourse('admin', ['development'], 'clinical')).toBe(false);
    expect(canEditCourse('admin', [], 'development')).toBe(false);
    expect(canEditCourse('admin', undefined, 'development')).toBe(false);
  });

  it('regular user cannot edit anything', () => {
    expect(canEditCourse(null, ['development'], 'development')).toBe(false);
    expect(canEditCourse(null, undefined, 'development')).toBe(false);
  });
});

describe('normalizeUserRole', () => {
  it('keeps admin and super-admin', () => {
    expect(normalizeUserRole('admin')).toBe('admin');
    expect(normalizeUserRole('super-admin')).toBe('super-admin');
  });

  it('turns legacy values into null', () => {
    expect(normalizeUserRole('student')).toBeNull();
    expect(normalizeUserRole('guest')).toBeNull();
    expect(normalizeUserRole('unknown')).toBeNull();
    expect(normalizeUserRole('co-admin')).toBeNull(); // co-admin — отдельный флаг, не role
    expect(normalizeUserRole(undefined)).toBeNull();
    expect(normalizeUserRole(null)).toBeNull();
    expect(normalizeUserRole(42)).toBeNull();
  });
});

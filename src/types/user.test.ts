import { describe, it, expect } from 'vitest';
import { hasCourseAccess, countAccessibleCourses, type CourseAccessMap, type UserRole } from './user';

describe('hasCourseAccess', () => {
  describe('returns false for unauthenticated users', () => {
    it('returns false when role is null', () => {
      expect(hasCourseAccess(null, null, 'development')).toBe(false);
      expect(hasCourseAccess(null, null, 'clinical')).toBe(false);
      expect(hasCourseAccess(null, null, 'general')).toBe(false);
    });
  });

  describe('returns true for admin roles regardless of courseAccess', () => {
    const adminRoles: UserRole[] = ['admin', 'super-admin'];

    adminRoles.forEach((role) => {
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

  describe('student role checks courseAccess', () => {
    it('returns true when courseAccess is null (backwards compatibility)', () => {
      expect(hasCourseAccess('student', null, 'development')).toBe(true);
      expect(hasCourseAccess('student', null, 'clinical')).toBe(true);
      expect(hasCourseAccess('student', null, 'general')).toBe(true);
    });

    it('returns true when courseAccess is empty', () => {
      expect(hasCourseAccess('student', {}, 'development')).toBe(true);
      expect(hasCourseAccess('student', {}, 'clinical')).toBe(true);
      expect(hasCourseAccess('student', {}, 'general')).toBe(true);
    });

    it('returns false when course is explicitly denied', () => {
      const access: CourseAccessMap = {
        development: false,
        clinical: false,
        general: false,
      };
      expect(hasCourseAccess('student', access, 'development')).toBe(false);
      expect(hasCourseAccess('student', access, 'clinical')).toBe(false);
      expect(hasCourseAccess('student', access, 'general')).toBe(false);
    });

    it('returns true when course is explicitly granted', () => {
      const access: CourseAccessMap = {
        development: true,
        clinical: true,
        general: true,
      };
      expect(hasCourseAccess('student', access, 'development')).toBe(true);
      expect(hasCourseAccess('student', access, 'clinical')).toBe(true);
      expect(hasCourseAccess('student', access, 'general')).toBe(true);
    });

    it('returns correct value for partial access', () => {
      const partialAccess: CourseAccessMap = {
        development: true,
        clinical: false,
        general: true,
      };
      expect(hasCourseAccess('student', partialAccess, 'development')).toBe(true);
      expect(hasCourseAccess('student', partialAccess, 'clinical')).toBe(false);
      expect(hasCourseAccess('student', partialAccess, 'general')).toBe(true);
    });

    it('returns false when field is undefined in non-empty map', () => {
      const access: CourseAccessMap = {
        development: true,
        // clinical and general are undefined
      };
      expect(hasCourseAccess('student', access, 'development')).toBe(true);
      expect(hasCourseAccess('student', access, 'clinical')).toBe(false);
      expect(hasCourseAccess('student', access, 'general')).toBe(false);
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

describe('countAccessibleCourses', () => {
  it('returns 0 for unauthenticated users', () => {
    expect(countAccessibleCourses(null, null)).toBe(0);
    expect(countAccessibleCourses(null, { development: true })).toBe(0);
  });

  it('returns 3 for admin roles regardless of courseAccess', () => {
    const adminRoles: UserRole[] = ['admin', 'super-admin'];
    const deniedAccess: CourseAccessMap = {
      development: false,
      clinical: false,
      general: false,
    };

    adminRoles.forEach((role) => {
      expect(countAccessibleCourses(role, null)).toBe(3);
      expect(countAccessibleCourses(role, {})).toBe(3);
      expect(countAccessibleCourses(role, deniedAccess)).toBe(3);
    });
  });

  it('returns 3 for student without courseAccess (backwards compatibility)', () => {
    expect(countAccessibleCourses('student', null)).toBe(3);
    expect(countAccessibleCourses('student', {})).toBe(3);
  });

  it('counts correctly for student with partial access', () => {
    expect(countAccessibleCourses('student', {
      development: false,
      clinical: true,
      general: false,
    })).toBe(1);

    expect(countAccessibleCourses('student', {
      development: true,
      clinical: false,
      // general undefined = denied when map is non-empty
    })).toBe(1);
  });

  it('returns 0 for guest without access', () => {
    expect(countAccessibleCourses('guest', null)).toBe(0);
    expect(countAccessibleCourses('guest', {})).toBe(0);
    expect(countAccessibleCourses('guest', {
      development: false,
      clinical: false,
      general: false,
    })).toBe(0);
  });

  it('counts correctly for guest with partial access', () => {
    expect(countAccessibleCourses('guest', {
      development: true,
      clinical: false,
      general: true,
    })).toBe(2);

    expect(countAccessibleCourses('guest', {
      development: true,
    })).toBe(1);
  });

  it('returns 3 for guest with full access', () => {
    expect(countAccessibleCourses('guest', {
      development: true,
      clinical: true,
      general: true,
    })).toBe(3);
  });

  it('supports dynamic course list for custom courses', () => {
    expect(
      countAccessibleCourses(
        'guest',
        {
          development: true,
          'social-psychology': true,
          'cognitive-science': false,
        },
        ['development', 'social-psychology', 'cognitive-science']
      )
    ).toBe(2);
  });
});

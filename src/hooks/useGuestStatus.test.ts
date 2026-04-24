import { describe, expect, it } from 'vitest';
import { computeGuestStatus } from './useGuestStatus';

describe('computeGuestStatus', () => {
  it('returns unauthorized when user is not authenticated', () => {
    expect(
      computeGuestStatus({
        isAuthenticated: false,
        userRole: null,
        courseAccess: null,
        courseIds: ['development', 'clinical'],
      })
    ).toEqual({ status: 'unauthorized', accessibleCount: 0 });
  });

  it('returns registered-guest for authenticated user without any course access', () => {
    expect(
      computeGuestStatus({
        isAuthenticated: true,
        userRole: null,
        courseAccess: {},
        courseIds: ['development', 'clinical'],
      })
    ).toEqual({ status: 'registered-guest', accessibleCount: 0 });
  });

  it('returns registered-guest when courseAccess explicitly denies all courses', () => {
    expect(
      computeGuestStatus({
        isAuthenticated: true,
        userRole: null,
        courseAccess: { development: false, clinical: false },
        courseIds: ['development', 'clinical'],
      })
    ).toEqual({ status: 'registered-guest', accessibleCount: 0 });
  });

  it('returns student when guest has at least one explicit course access', () => {
    expect(
      computeGuestStatus({
        isAuthenticated: true,
        userRole: null,
        courseAccess: { development: true },
        courseIds: ['development', 'clinical'],
      })
    ).toEqual({ status: 'student', accessibleCount: 1 });
  });

  it('returns registered-guest for a regular user with null courseAccess (no longer legacy full access)', () => {
    expect(
      computeGuestStatus({
        isAuthenticated: true,
        userRole: null,
        courseAccess: null,
        courseIds: ['development', 'clinical', 'general'],
      })
    ).toEqual({ status: 'registered-guest', accessibleCount: 0 });
  });

  it('returns student for admin and super-admin regardless of courseAccess', () => {
    expect(
      computeGuestStatus({
        isAuthenticated: true,
        userRole: 'admin',
        courseAccess: null,
        courseIds: ['development', 'clinical'],
      })
    ).toEqual({ status: 'student', accessibleCount: 2 });

    expect(
      computeGuestStatus({
        isAuthenticated: true,
        userRole: 'super-admin',
        courseAccess: {},
        courseIds: ['development'],
      })
    ).toEqual({ status: 'student', accessibleCount: 1 });
  });

  it('counts only courses listed in courseIds (including dynamic ones)', () => {
    expect(
      computeGuestStatus({
        isAuthenticated: true,
        userRole: null,
        courseAccess: { development: true, 'group-therapy': true },
        courseIds: ['development', 'group-therapy', 'clinical'],
      })
    ).toEqual({ status: 'student', accessibleCount: 2 });
  });
});

import { describe, it, expect } from 'vitest';
import { computeDisplayRole, getRoleLabel, getRoleBadgeClasses } from './roleHelpers';

describe('computeDisplayRole', () => {
  it('returns "admin" for admin role regardless of courseAccess', () => {
    expect(computeDisplayRole('admin', null)).toBe('admin');
    expect(computeDisplayRole('admin', { development: true })).toBe('admin');
    expect(computeDisplayRole('admin', {})).toBe('admin');
  });

  it('returns "super-admin" for super-admin role regardless of courseAccess', () => {
    expect(computeDisplayRole('super-admin', null)).toBe('super-admin');
    expect(computeDisplayRole('super-admin', { development: true })).toBe('super-admin');
  });

  it('returns "student" when no admin role but has course access', () => {
    expect(computeDisplayRole(null, { development: true })).toBe('student');
    expect(computeDisplayRole(null, { development: false, clinical: true })).toBe('student');
  });

  it('returns "guest" when no admin role and no course access', () => {
    expect(computeDisplayRole(null, null)).toBe('guest');
    expect(computeDisplayRole(null, undefined)).toBe('guest');
    expect(computeDisplayRole(null, {})).toBe('guest');
    expect(computeDisplayRole(null, { development: false, clinical: false })).toBe('guest');
  });

  it('treats undefined courseAccess values as no access', () => {
    expect(computeDisplayRole(null, { development: undefined })).toBe('guest');
  });
});

describe('getRoleLabel', () => {
  it('returns Russian labels for all roles', () => {
    expect(getRoleLabel('super-admin')).toBe('Супер-админ');
    expect(getRoleLabel('admin')).toBe('Админ');
    expect(getRoleLabel('student')).toBe('Студент');
    expect(getRoleLabel('guest')).toBe('Гость');
  });
});

describe('getRoleBadgeClasses', () => {
  it('returns distinct classes for each role', () => {
    const classes = new Set([
      getRoleBadgeClasses('super-admin'),
      getRoleBadgeClasses('admin'),
      getRoleBadgeClasses('student'),
      getRoleBadgeClasses('guest'),
    ]);
    expect(classes.size).toBe(4);
  });

  it('returns Tailwind bg+text classes', () => {
    expect(getRoleBadgeClasses('admin')).toMatch(/bg-.*text-/);
  });
});

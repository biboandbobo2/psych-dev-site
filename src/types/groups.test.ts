import { describe, expect, it } from 'vitest';
import {
  canWriteAnnouncementsForGroup,
  combineGroupGrantedCourses,
  hasAnyAnnouncementRight,
  type Group,
} from './groups';

function makeGroup(partial: Partial<Group> & { id: string }): Group {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    memberIds: partial.memberIds ?? [],
    grantedCourses: partial.grantedCourses ?? [],
    announcementAdminIds: partial.announcementAdminIds ?? [],
    description: partial.description,
  };
}

describe('combineGroupGrantedCourses', () => {
  it('unions grantedCourses from multiple groups', () => {
    const groups = [
      makeGroup({ id: 'g1', grantedCourses: ['development', 'clinical'] }),
      makeGroup({ id: 'g2', grantedCourses: ['clinical', 'general'] }),
    ];
    expect(combineGroupGrantedCourses(groups)).toEqual({
      development: true,
      clinical: true,
      general: true,
    });
  });

  it('returns empty for empty list', () => {
    expect(combineGroupGrantedCourses([])).toEqual({});
  });
});

describe('canWriteAnnouncementsForGroup', () => {
  const group = makeGroup({ id: 'g1', announcementAdminIds: ['u1'] });

  it('super-admin always allowed', () => {
    expect(canWriteAnnouncementsForGroup('super-admin', null, group)).toBe(true);
    expect(canWriteAnnouncementsForGroup('super-admin', 'u2', group)).toBe(true);
  });

  it('admin only if listed in announcementAdminIds', () => {
    expect(canWriteAnnouncementsForGroup('admin', 'u1', group)).toBe(true);
    expect(canWriteAnnouncementsForGroup('admin', 'u2', group)).toBe(false);
    expect(canWriteAnnouncementsForGroup('admin', null, group)).toBe(false);
  });

  it('non-admin never allowed', () => {
    expect(canWriteAnnouncementsForGroup(null, 'u1', group)).toBe(false);
  });
});

describe('hasAnyAnnouncementRight', () => {
  const groups = [
    makeGroup({ id: 'g1', announcementAdminIds: ['u1'] }),
    makeGroup({ id: 'g2', announcementAdminIds: ['u2'] }),
  ];

  it('super-admin has the right even without groups', () => {
    expect(hasAnyAnnouncementRight('super-admin', null, [])).toBe(true);
  });

  it('admin has it only if listed in at least one group', () => {
    expect(hasAnyAnnouncementRight('admin', 'u1', groups)).toBe(true);
    expect(hasAnyAnnouncementRight('admin', 'u2', groups)).toBe(true);
    expect(hasAnyAnnouncementRight('admin', 'u3', groups)).toBe(false);
    expect(hasAnyAnnouncementRight('admin', null, groups)).toBe(false);
  });

  it('regular user never has the right', () => {
    expect(hasAnyAnnouncementRight(null, 'u1', groups)).toBe(false);
  });
});

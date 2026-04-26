import { describe, it, expect, vi } from 'vitest';
import {
  publishToGroups,
  formatPublishStatus,
  type GroupRef,
} from './announcementsMultiPublish';

const groups: GroupRef[] = [
  { id: 'g1', name: 'Группа 1' },
  { id: 'g2', name: 'Группа 2' },
  { id: 'g3', name: 'Группа 3' },
];

describe('publishToGroups', () => {
  it('calls publish for every group with correct id', async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const result = await publishToGroups(groups, publish);

    expect(publish).toHaveBeenCalledTimes(3);
    expect(publish).toHaveBeenNthCalledWith(1, 'g1');
    expect(publish).toHaveBeenNthCalledWith(2, 'g2');
    expect(publish).toHaveBeenNthCalledWith(3, 'g3');
    expect(result).toEqual({ ok: 3, total: 3, failures: [] });
  });

  it('reports partial failure when one group fails', async () => {
    const publish = vi.fn(async (id: string) => {
      if (id === 'g2') throw new Error('boom');
    });
    const result = await publishToGroups(groups, publish);

    expect(result.ok).toBe(2);
    expect(result.total).toBe(3);
    expect(result.failures).toEqual([
      { groupId: 'g2', groupName: 'Группа 2', message: 'boom' },
    ]);
  });

  it('reports total failure when every group fails', async () => {
    const publish = vi.fn(async () => {
      throw new Error('nope');
    });
    const result = await publishToGroups(groups, publish);

    expect(result.ok).toBe(0);
    expect(result.failures).toHaveLength(3);
    expect(result.failures.every((f) => f.message === 'nope')).toBe(true);
  });

  it('does not throw on non-Error rejection reason', async () => {
    const publish = vi.fn(async () => {
      throw 'string-reason';
    });
    const result = await publishToGroups([groups[0]], publish);

    expect(result.failures[0].message).toBe('Не удалось сохранить');
  });

  it('handles empty group list', async () => {
    const publish = vi.fn();
    const result = await publishToGroups([], publish);

    expect(publish).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: 0, total: 0, failures: [] });
  });
});

describe('formatPublishStatus', () => {
  it('full success in one group', () => {
    const status = formatPublishStatus({ ok: 1, total: 1, failures: [] });
    expect(status).toEqual({ kind: 'success', message: 'Создано в группе.' });
  });

  it('full success in many groups', () => {
    const status = formatPublishStatus({ ok: 3, total: 3, failures: [] });
    expect(status).toEqual({ kind: 'success', message: 'Создано в 3 группах.' });
  });

  it('partial failure lists failed groups', () => {
    const status = formatPublishStatus({
      ok: 2,
      total: 3,
      failures: [{ groupId: 'g2', groupName: 'Группа 2', message: 'boom' }],
    });
    expect(status.kind).toBe('partial');
    expect(status.message).toContain('Создано в 2 из 3');
    expect(status.message).toContain('Группа 2: boom');
  });

  it('total failure with single group returns the original error message', () => {
    const status = formatPublishStatus({
      ok: 0,
      total: 1,
      failures: [{ groupId: 'g1', groupName: 'Группа 1', message: 'denied' }],
    });
    expect(status.kind).toBe('error');
    expect(status.message).toBe('denied');
  });

  it('total failure with many groups aggregates errors', () => {
    const status = formatPublishStatus({
      ok: 0,
      total: 2,
      failures: [
        { groupId: 'g1', groupName: 'Группа 1', message: 'a' },
        { groupId: 'g2', groupName: 'Группа 2', message: 'b' },
      ],
    });
    expect(status.kind).toBe('error');
    expect(status.message).toContain('Не удалось сохранить ни в одной из 2');
    expect(status.message).toContain('Группа 1: a');
    expect(status.message).toContain('Группа 2: b');
  });
});

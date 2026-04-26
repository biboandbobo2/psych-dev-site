/**
 * Helpers for publishing one announcement/event/assignment into several groups
 * from a single admin form. Server API is unchanged — we just call the existing
 * per-group `createGroupX` for each selected groupId in parallel and aggregate
 * the result so the UI can show a partial-success message.
 */

export interface MultiPublishFailure {
  groupId: string;
  groupName: string;
  message: string;
}

export interface MultiPublishResult {
  ok: number;
  total: number;
  failures: MultiPublishFailure[];
}

export interface GroupRef {
  id: string;
  name: string;
}

/**
 * Run `publish(groupId)` for each group in `groups` and aggregate results.
 * Never throws — partial failures are returned in `failures`.
 */
export async function publishToGroups(
  groups: GroupRef[],
  publish: (groupId: string) => Promise<void>
): Promise<MultiPublishResult> {
  const settled = await Promise.allSettled(groups.map((g) => publish(g.id)));
  const failures: MultiPublishFailure[] = [];
  let ok = 0;
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      ok += 1;
      return;
    }
    const reason = r.reason;
    const message =
      reason instanceof Error ? reason.message : 'Не удалось сохранить';
    failures.push({ groupId: groups[i].id, groupName: groups[i].name, message });
  });
  return { ok, total: groups.length, failures };
}

/**
 * Format a human-readable Russian status message from a `MultiPublishResult`.
 * Returns null on full failure with a single group (caller can show error inline).
 */
export function formatPublishStatus(result: MultiPublishResult): {
  kind: 'success' | 'partial' | 'error';
  message: string;
} {
  const { ok, total, failures } = result;
  if (ok === total) {
    return {
      kind: 'success',
      message:
        total === 1 ? 'Создано в группе.' : `Создано в ${total} группах.`,
    };
  }
  if (ok === 0) {
    const detail = failures.map((f) => `${f.groupName}: ${f.message}`).join('; ');
    return {
      kind: 'error',
      message:
        total === 1
          ? failures[0]?.message ?? 'Не удалось сохранить'
          : `Не удалось сохранить ни в одной из ${total} групп. ${detail}`,
    };
  }
  const detail = failures.map((f) => `${f.groupName}: ${f.message}`).join('; ');
  return {
    kind: 'partial',
    message: `Создано в ${ok} из ${total} групп. Ошибки: ${detail}`,
  };
}

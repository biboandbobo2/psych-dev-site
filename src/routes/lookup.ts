import type { RouteConfig } from './types';

export function byPeriodLookup(config: readonly RouteConfig[]): Record<string, RouteConfig> {
  const acc: Record<string, RouteConfig> = {};
  for (const entry of config) {
    if (entry.periodId) {
      acc[entry.periodId] = entry;
    }
  }
  return acc;
}

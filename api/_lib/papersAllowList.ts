// Allow-list проверка: статья проходит, если URL хоста разрешён в
// research_sources.json (CyberLeninka, etc).

import { createRequire } from 'node:module';
import type { AllowedSource, ResearchWork } from './papersTypes.js';

const require = createRequire(import.meta.url);
// require для JSON без import assertions (совместимо с Node ESM + Vite dev)
const allowListConfig = require('../../src/features/researchSearch/config/research_sources.json') as {
  sources: AllowedSource[];
};

const ALLOW_SOURCES: AllowedSource[] = allowListConfig?.sources ?? [];

export function cleanHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function isAllowedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const path = parsed.pathname || '/';

  return ALLOW_SOURCES.some((source) => {
    if (!source.enabled) return false;
    const matchHost = source.hosts.some((allowedHost) => allowedHost.toLowerCase() === host);
    if (!matchHost) return false;
    const prefixes = source.pathPrefixes ?? [];
    if (prefixes.length === 0) return true;
    return prefixes.some((prefix) => path.startsWith(prefix));
  });
}

export function filterByAllowList(items: ResearchWork[]): ResearchWork[] {
  return items.filter((item) => isAllowedUrl(item.oaPdfUrl) || isAllowedUrl(item.primaryUrl));
}

/**
 * Filter by open access: article passes if:
 * 1. OpenAlex marks it as OA (isOa=true), OR
 * 2. URL is from a trusted source in allow-list (e.g., CyberLeninka)
 *
 * Нужно потому что OpenAlex incorrectly marks many trusted open sources as non-OA.
 */
export function filterByOpenAccess(items: ResearchWork[]): ResearchWork[] {
  return items.filter((item) => {
    if (item.isOa) return true;
    if (isAllowedUrl(item.oaPdfUrl) || isAllowedUrl(item.primaryUrl)) return true;
    return false;
  });
}

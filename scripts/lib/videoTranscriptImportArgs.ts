import type { ImportOptions } from './videoTranscriptImportTypes';

export function parseTranscriptImportArgs(argv: string[]): ImportOptions {
  const args = new Map<string, string>();
  const flags = new Set<string>();

  argv.forEach((arg) => {
    if (!arg.startsWith('--')) {
      return;
    }

    const normalized = arg.slice(2);
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) {
      flags.add(normalized);
      return;
    }

    args.set(normalized.slice(0, separatorIndex), normalized.slice(separatorIndex + 1));
  });

  const rawLimit = args.get('limit');
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : null;

  return {
    dryRun: flags.has('dry-run'),
    force: flags.has('force'),
    langs: (args.get('langs') ?? 'ru,en')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
    video: args.get('video')?.trim() || null,
  };
}

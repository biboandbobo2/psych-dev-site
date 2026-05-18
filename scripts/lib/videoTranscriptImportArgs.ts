import type { ImportOptions } from './videoTranscriptImportTypes';

const VALUE_KEYS = new Set(['video', 'langs', 'limit']);

export function parseTranscriptImportArgs(argv: string[]): ImportOptions {
  const args = new Map<string, string>();
  const flags = new Set<string>();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }

    const normalized = arg.slice(2);
    const separatorIndex = normalized.indexOf('=');

    if (separatorIndex !== -1) {
      args.set(normalized.slice(0, separatorIndex), normalized.slice(separatorIndex + 1));
      continue;
    }

    // Поддерживаем `--key value` (с пробелом) для ключей, которые ожидают
    // значение. Без этого `--video lzz0HntrAws` молча игнорировалось:
    // флаг попадал во flags, а сам id — нигде. Чтобы случайно не съесть
    // следующий флаг, проверяем что следующий токен не начинается с `--`.
    const next = argv[i + 1];
    if (VALUE_KEYS.has(normalized) && next !== undefined && !next.startsWith('--')) {
      args.set(normalized, next);
      i += 1;
      continue;
    }

    flags.add(normalized);
  }

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

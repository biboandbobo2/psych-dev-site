#!/usr/bin/env node
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_SRC = '/Users/aleksejzykov/Downloads/generated_image 1.png';
const DEFAULT_PERIOD = 'infancy';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [rawKey, rawValue] = arg.split('=');
    const key = rawKey.slice(2);
    if (rawValue !== undefined) {
      result[key] = rawValue;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = 'true';
    }
  }
  return result;
}

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p === '~') {
    return os.homedir();
  }
  return p;
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const period = args.period || DEFAULT_PERIOD;
  const srcRaw = args.src || DEFAULT_SRC;
  const srcPath = path.resolve(expandHome(srcRaw));
  const name = args.name || `${period}.png`;
  const destDir = path.resolve(process.cwd(), 'public', 'backgrounds');
  const destPath = path.join(destDir, name);

  if (!(await fileExists(srcPath))) {
    console.error(`✖ Source file not found: ${srcPath}`);
    process.exitCode = 1;
    return;
  }

  await mkdir(destDir, { recursive: true });
  await copyFile(srcPath, destPath);

  console.log(`✔ Background for period "${period}" copied to ${destPath}`);
}

main().catch((error) => {
  console.error('✖ Unexpected error while copying background:', error);
  process.exitCode = 1;
});

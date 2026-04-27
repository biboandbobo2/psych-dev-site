#!/usr/bin/env node

const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CAPTURE_REGEX = /console\.(log|info|warn|error|debug)\b/;

// Все runtime-папки, в которых console.* запрещён.
// Используется одинаково для staged-режима (pre-commit) и --all (validate).
const TARGET_DIRS = ["src/", "functions/src/", "api/"];

const ALLOWED = new Set([
  "src/lib/debug.ts",
  "functions/src/lib/debug.ts",
  "src/lib/errorHandler.ts", // Central app-error reporter → DevTools
  "src/pages/timeline/utils/exporters/common.ts", // Dev-only export debugging
  "api/assistant.ts" // Production error reporting → Vercel logs (catch Gemini)
]);

// CLI/admin-скрипты: console здесь — UX, не runtime-лог.
const ALLOWED_PREFIXES = ["src/scripts/"];

const FILE_EXTS = /\.(ts|tsx|js|jsx)$/;

const checkAll = process.argv.includes("--all");

function getStagedFiles() {
  const raw = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (FILE_EXTS.test(entry.name)) {
      acc.push(full.replace(/\\/g, "/"));
    }
  }
  return acc;
}

function getAllFiles(dirs) {
  const acc = [];
  for (const dir of dirs) {
    walk(dir, acc);
  }
  return acc;
}

function isAllowed(file) {
  if (ALLOWED.has(file)) return true;
  return ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function isTarget(file, dirs) {
  return dirs.some((dir) => file.startsWith(dir));
}

function readStaged(file) {
  try {
    return execFileSync("git", ["show", `:${file}`], { encoding: "utf8" });
  } catch (error) {
    return null;
  }
}

function readFromDisk(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    return null;
  }
}

function report(offenders, mode) {
  const header = mode === "all"
    ? `🚫 Обнаружены необёрнутые console.* в runtime-коде (${offenders.length}):`
    : "🚫 Обнаружены необёрнутые console.* в staged-файлах:";
  console.error(header);
  offenders.forEach(({ file, line, text }) => {
    console.error(`  ${file}:${line}: ${text}`);
  });
  console.error(
    "Используйте debugLog/debugError/debugWarn или поправьте console.* в debug-утилитах."
  );
}

let files;
let readContent;

if (checkAll) {
  files = getAllFiles(TARGET_DIRS);
  readContent = readFromDisk;
} else {
  files = getStagedFiles();
  if (!files.length) {
    process.exit(0);
  }
  readContent = readStaged;
}

const offenders = [];

for (const file of files) {
  if (!isTarget(file, TARGET_DIRS)) continue;
  if (isAllowed(file)) continue;

  const content = readContent(file);
  if (!content) continue;

  content.split(/\r?\n/).forEach((line, index) => {
    if (CAPTURE_REGEX.test(line)) {
      offenders.push({
        file,
        line: index + 1,
        text: line.trim(),
      });
    }
  });
}

if (offenders.length) {
  report(offenders, checkAll ? "all" : "staged");
  process.exit(1);
}

process.exit(0);

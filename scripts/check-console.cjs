#!/usr/bin/env node

const { execSync, execFileSync } = require("child_process");

const CAPTURE_REGEX = /console\.(log|info|warn|error|debug)\b/;
const TARGET_DIRS = ["src/", "functions/src/"];
const ALLOWED = new Set([
  "src/lib/debug.ts",
  "functions/src/lib/debug.ts",
  "src/pages/timeline/utils/exporters/common.ts" // Dev-only export debugging
]);

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

function isTarget(file) {
  return TARGET_DIRS.some((dir) => file.startsWith(dir));
}

function readStaged(file) {
  try {
    return execFileSync("git", ["show", `:${file}`], { encoding: "utf8" });
  } catch (error) {
    return null;
  }
}

function report(offenders) {
  console.error("🚫 Обнаружены необёрнутые console.* в staged-файлах:");
  offenders.forEach(({ file, line, text }) => {
    console.error(`  ${file}:${line}: ${text}`);
  });
  console.error(
    "Используйте debugLog/debugError/debugWarn или поправьте console.* в debug-утилитах."
  );
}

const stagedFiles = getStagedFiles();
if (!stagedFiles.length) {
  process.exit(0);
}

const offenders = [];

for (const file of stagedFiles) {
  if (!isTarget(file)) continue;
  if (ALLOWED.has(file)) continue;

  const content = readStaged(file);
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
  report(offenders);
  process.exit(1);
}

process.exit(0);

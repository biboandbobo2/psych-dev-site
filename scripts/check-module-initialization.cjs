#!/usr/bin/env node
/**
 * Module Initialization Order Checker
 *
 * This script analyzes the codebase for potential initialization order issues
 * that could cause "Cannot access uninitialized variable" errors in production.
 *
 * Run with: node scripts/check-module-initialization.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

// Patterns that indicate potential initialization issues
const PROBLEMATIC_PATTERNS = [
  {
    name: 'Top-level array operations',
    pattern: /^export const \w+ = \w+\.(map|reduce|filter|forEach)\(/m,
    severity: 'error',
    message: 'Top-level array operations may access uninitialized imports',
  },
  {
    name: 'Top-level object spread with imports',
    pattern: /^export const \w+ = \{\s*\.\.\.\w+/m,
    severity: 'warning',
    message: 'Top-level object spread may access uninitialized imports',
  },
  {
    name: 'Top-level function calls on imports',
    pattern: /^export const \w+ = \w+\(/m,
    severity: 'warning',
    message: 'Top-level function calls may execute before imports are ready',
    // Exclude React.lazy() and React.memo() as they are safe
    exclude: /^export const \w+ = (lazy|memo)\(/m,
  },
  {
    name: 'Top-level new Set/Map with imports',
    pattern: /^export const \w+ = new (Set|Map)\(\w+\)/m,
    severity: 'error',
    message: 'Top-level Set/Map construction may access uninitialized imports',
  },
];

// Shared modules that should be in main chunk
const SHARED_MODULES = [
  'src/types/notes.ts',
  'src/utils/periodConfig.ts',
  'src/utils/testAppearance.ts',
  'src/constants/themePresets.ts',
  'src/utils/sortNotes.ts',
];

// Files that are allowed to have top-level initialization
const ALLOWED_TOP_LEVEL_FILES = [
  'src/lib/firebase.ts', // Firebase requires top-level initialization
];

function findFiles(dir, ext) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        results = results.concat(findFiles(filePath, ext));
      }
    } else if (file.endsWith(ext)) {
      results.push(filePath);
    }
  }

  return results;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  for (const pattern of PROBLEMATIC_PATTERNS) {
    if (pattern.pattern.test(content)) {
      // Check if this match should be excluded
      if (pattern.exclude && pattern.exclude.test(content)) {
        continue;
      }
      issues.push({
        file: filePath,
        pattern: pattern.name,
        severity: pattern.severity,
        message: pattern.message,
      });
    }
  }

  return issues;
}

function checkViteConfig() {
  const viteConfigPath = path.join(process.cwd(), 'vite.config.js');

  if (!fs.existsSync(viteConfigPath)) {
    log(COLORS.red, '❌ vite.config.js not found');
    return false;
  }

  const content = fs.readFileSync(viteConfigPath, 'utf-8');

  // Check if shared modules are excluded from manual chunks
  const hasSharedModuleCheck = SHARED_MODULES.every(module => {
    const checkPattern = new RegExp(module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return content.includes(module) || content.includes('types/notes') || content.includes('utils/periodConfig');
  });

  if (!hasSharedModuleCheck) {
    log(COLORS.yellow, '⚠️  Warning: Shared modules may not be properly configured in vite.config.js');
    log(COLORS.yellow, '   Expected to find checks for:', SHARED_MODULES.join(', '));
    return false;
  }

  log(COLORS.green, '✅ vite.config.js appears to handle shared modules correctly');
  return true;
}

function checkImportOrder(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let hasImports = false;
  let hasTopLevelInit = false;
  let importEndLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('import ')) {
      hasImports = true;
      importEndLine = i;
    } else if (line.startsWith('export const') && line.includes('=')) {
      // Check if this is after imports and does computation
      if (hasImports && i > importEndLine + 1) {
        const hasComputation = line.match(/\.(map|reduce|filter|forEach)\(/) ||
                              line.includes('new Set(') ||
                              line.includes('new Map(');

        if (hasComputation) {
          hasTopLevelInit = true;
          return {
            file: filePath,
            line: i + 1,
            content: line,
          };
        }
      }
    }
  }

  return null;
}

function main() {
  log(COLORS.blue, '🔍 Checking for module initialization issues...\n');

  // Check vite config
  const viteConfigOk = checkViteConfig();
  console.log();

  // Find all TypeScript/JavaScript files in src
  const files = [
    ...findFiles(path.join(process.cwd(), 'src'), '.ts'),
    ...findFiles(path.join(process.cwd(), 'src'), '.tsx'),
  ];

  let errorCount = 0;
  let warningCount = 0;

  // Check each file for problematic patterns
  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);

    // Skip files that are allowed to have top-level initialization
    if (ALLOWED_TOP_LEVEL_FILES.some(allowed => file.endsWith(allowed))) {
      continue;
    }

    const issues = checkFile(file);
    const importIssue = checkImportOrder(file);

    if (issues.length > 0 || importIssue) {
      if (issues.length > 0) {
        for (const issue of issues) {
          if (issue.severity === 'error') {
            log(COLORS.red, `❌ ${relativePath}`);
            errorCount++;
          } else {
            log(COLORS.yellow, `⚠️  ${relativePath}`);
            warningCount++;
          }
          console.log(`   ${issue.pattern}`);
          console.log(`   ${issue.message}\n`);
        }
      }

      if (importIssue) {
        log(COLORS.yellow, `⚠️  ${relativePath}:${importIssue.line}`);
        console.log(`   Top-level initialization after imports:`);
        console.log(`   ${importIssue.content}\n`);
        warningCount++;
      }
    }
  }

  // Check if shared modules are properly configured
  console.log();
  log(COLORS.blue, '📋 Checking shared module configuration...\n');

  for (const module of SHARED_MODULES) {
    const filePath = path.join(process.cwd(), module);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check if module has lazy initialization
      const hasLazyInit = content.includes('let _') && content.includes('function get');

      if (!hasLazyInit && checkFile(filePath).length > 0) {
        log(COLORS.yellow, `⚠️  ${module}`);
        console.log('   Shared module has top-level initialization but no lazy getter\n');
        warningCount++;
      } else {
        log(COLORS.green, `✅ ${module}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (errorCount > 0) {
    log(COLORS.red, `\n❌ Found ${errorCount} error(s) that must be fixed`);
  }
  if (warningCount > 0) {
    log(COLORS.yellow, `⚠️  Found ${warningCount} warning(s) to review`);
  }
  if (errorCount === 0 && warningCount === 0) {
    log(COLORS.green, '\n✅ No initialization issues found!');
  }

  if (!viteConfigOk) {
    log(COLORS.yellow, '\n⚠️  vite.config.js needs review');
  }

  console.log();
  process.exit(errorCount > 0 ? 1 : 0);
}

main();

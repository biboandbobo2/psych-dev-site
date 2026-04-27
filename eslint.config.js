import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'functions/lib', 'docs/']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
      }],
      'no-console': 'error',
      'no-useless-escape': 'warn',
      'no-empty': 'warn',
      'no-control-regex': 'warn',
      'react-refresh/only-export-components': 'warn',
      'no-undef': 'off',
      'no-redeclare': 'off',
    },
  },
  {
    // Зоны, где console.* допустим: сами debug-обёртки, CLI-скрипты, тесты,
    // dev-only export-debugging.
    files: [
      '**/lib/debug.ts',
      '**/scripts/**/*.{ts,tsx,js,jsx}',
      'scripts/**/*.{ts,tsx,js,jsx}',
      'tests/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      'src/pages/timeline/utils/exporters/common.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
])

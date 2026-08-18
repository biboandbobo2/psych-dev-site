import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Integration-тесты (tests/integration/*) требуют эмуляторов Firestore/Auth/Storage
// и запускаются только через npm run test:integration (там ставится VITEST_INTEGRATION=1).
// Дефолтный прогон их не собирает — иначе на машине без эмуляторов (в т.ч. в CI)
// они падают с ECONNREFUSED (именно это держало CI красным с 2026-04-28).
const isIntegrationRun = process.env.VITEST_INTEGRATION === '1';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: isIntegrationRun
      ? ['tests/integration/**/*.test.{ts,tsx}']
      : [
          'src/**/*.test.{ts,tsx,js,jsx}',
          'tests/**/*.test.{ts,tsx,js,jsx}',
          'scripts/**/*.test.{ts,tsx,js,jsx}',
          'shared/**/*.test.{ts,tsx}',
        ],
    exclude: isIntegrationRun
      ? configDefaults.exclude
      : [...configDefaults.exclude, 'tests/integration/**'],
    setupFiles: './src/tests/setup.ts',
  },
});

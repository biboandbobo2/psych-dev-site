import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/*.test.{ts,tsx,js,jsx}',
      'tests/**/*.test.{ts,tsx,js,jsx}',
      'scripts/**/*.test.{ts,tsx,js,jsx}',
      'shared/**/*.test.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',
    ],
    setupFiles: './src/tests/setup.ts',
  },
});

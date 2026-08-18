import { defineConfig } from 'vitest/config';

// Собственный конфиг обязателен: без него vitest поднимается вверх и подхватывает
// корневой vitest.config.ts, который в CI (npm ci только внутри functions/)
// падает с ERR_MODULE_NOT_FOUND — корневые node_modules не установлены.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import string from 'vite-plugin-string';
import FullReload from 'vite-plugin-full-reload';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    string({ include: '**/*.csv' }),
    FullReload(['content/**/*.csv']),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))  // "@/..." → <root>/src/...
    }
  }
});

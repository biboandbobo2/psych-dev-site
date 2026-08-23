/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// LS-5: страничные правила удалены намеренно. Они засасывали общие модули
// (hooks/lib/stores) в page-чанки — entry статически импортировал admin/tests/
// timeline/profile/research, и весь их код качался на старте (~515 КБ gzip).
// Страницы режутся самим Rollup'ом по dynamic imports из src/pages/lazy.ts.
// Не добавляй сюда новые правила для /src/-модулей без замера стартового графа
// (grep 'from"./' dist/assets/index-*.js после npm run build).
const chunkMapper = (id) => {
  if (!id) return null;

  // node_modules should go to vendor chunk
  if (id.includes('node_modules')) {
    return 'vendor';
  }

  // Shared constants and types MUST be in a separate chunk that loads FIRST
  // This prevents "Cannot access uninitialized variable" errors
  if (id.includes('/src/types/notes') ||
      id.includes('/src/utils/periodConfig') ||
      id.includes('/src/utils/testAppearance') ||
      id.includes('/src/utils/sortNotes') ||
      id.includes('/src/constants/themePresets')) {
    return 'shared-constants';
  }

  if (id.includes('/src/data/eventIconDataUrls')) {
    return 'event-icons';
  }
  return undefined;
};

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const wrapApiMiddleware = (apiPath, filePath) => ({
    name: `dev-api-${apiPath.replace(/\//g, '-')}`,
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(apiPath, async (req, res, next) => {
        try {
          // ssrLoadModule (а не голый import): резолвит NodeNext-импорты вида './x.js' → './x.ts'
          const handler = (await server.ssrLoadModule(`/${filePath}`)).default;
          const parsedUrl = new URL(req.url || '', 'http://localhost');
          req.query = Object.fromEntries(parsedUrl.searchParams.entries());
          // Parse JSON body for POST requests
          if (req.method === 'POST' && !req.body) {
            req.body = await new Promise((resolve) => {
              let data = '';
              req.on('data', (chunk) => { data += chunk; });
              req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
            });
          }
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (payload) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
          };
          return handler(req, res);
        } catch (error) {
          next(error);
        }
      });
    },
  });
  const devApiPlugin = wrapApiMiddleware('/api/papers', 'api/papers.ts');
  const devBookingPlugin = wrapApiMiddleware('/api/booking', 'api/booking.ts');
  const devAssistantPlugin = wrapApiMiddleware('/api/assistant', 'api/assistant.ts');
  const plugins = [react()];
  if (!isProd) {
    plugins.push(devApiPlugin, devBookingPlugin, devAssistantPlugin);
  }

  return {
    base: '/',
    envPrefix: ['VITE_', 'DEVLOG'],
    plugins,
    build: {
      chunkSizeWarningLimit: 6000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            return chunkMapper(id);
          },
        },
      },
      esbuild: isProd ? { drop: ['console', 'debugger'] } : {},
    },
  };
});

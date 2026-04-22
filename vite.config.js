/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Timeline chunks - order matters! More specific rules first
  // Separate exporters into their own chunk (loaded only on download)
  if (id.includes('/src/pages/timeline/utils/exporters/')) {
    return 'timeline-export';
  }
  // Separate hooks into their own chunk (heavy state management)
  if (id.includes('/src/pages/timeline/hooks/')) {
    return 'timeline-hooks';
  }
  // Timeline data and periodizations
  if (id.includes('/src/pages/timeline/data/')) {
    return 'timeline-data';
  }
  // Main Timeline component
  if (id.includes('/src/pages/Timeline.tsx')) {
    return 'timeline';
  }
  if (id.includes('/src/pages/timeline/components/TimelineCanvas')) {
    return 'timeline-canvas';
  }
  if (id.includes('/src/pages/timeline/components/TimelineLeftPanel')) {
    return 'timeline-left-panel';
  }
  if (id.includes('/src/pages/timeline/components/TimelineRightPanel')) {
    return 'timeline-right-panel';
  }
  if (id.includes('/src/pages/timeline/components/BulkEventCreator')) {
    return 'timeline-bulk';
  }
  if (id.includes('/src/pages/timeline/components/TimelineHelpModal')) {
    return 'timeline-help';
  }
  if (
    id.includes('/src/pages/TestsPage') ||
    id.includes('/src/pages/DynamicTest') ||
    id.includes('/src/components/tests')
  ) {
    return 'tests';
  }
  if (id.includes('/src/features/researchSearch') || id.includes('/src/pages/ResearchPage')) {
    return 'research';
  }
  if (id.includes('/src/data/eventIconDataUrls')) {
    return 'event-icons';
  }
  if (id.includes('/src/pages/Admin') || id.includes('/src/pages/admin/')) {
    return 'admin';
  }
  if (id.includes('/src/pages/Notes') || id.includes('/src/pages/notes/')) {
    return 'notes';
  }
  if (id.includes('/src/pages/Profile')) {
    return 'profile';
  }
  if (id.includes('/src/pages/BookingPage') || id.includes('/src/pages/booking/')) {
    return 'booking';
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
          const handler = (await import(path.resolve(__dirname, filePath))).default;
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
  const plugins = [react()];
  if (!isProd) {
    plugins.push(devApiPlugin, devBookingPlugin);
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

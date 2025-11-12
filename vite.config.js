/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const chunkMapper = (id) => {
  if (!id) return null;
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
  if (id.includes('/src/pages/Admin') || id.includes('/src/pages/admin/')) {
    return 'admin';
  }
  if (id.includes('/src/pages/Notes') || id.includes('/src/pages/notes/')) {
    return 'notes';
  }
  if (id.includes('/src/pages/Profile')) {
    return 'profile';
  }
  return null;
};

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    base: '/',
    envPrefix: ['VITE_', 'DEVLOG'],
    plugins: [react()],
    build: {
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

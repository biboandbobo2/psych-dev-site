/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  if (id.includes('/src/pages/Admin') || id.includes('/src/pages/admin/')) {
    return 'admin';
  }
  if (id.includes('/src/pages/Notes') || id.includes('/src/pages/notes/')) {
    return 'notes';
  }
  if (id.includes('/src/pages/Profile')) {
    return 'profile';
  }
  return undefined;
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

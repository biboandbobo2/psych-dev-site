import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
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
        },
      },
    },
  },
});

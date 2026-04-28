import { lazy } from 'react';
import { lazyWithReload } from '../../lib/lazyWithReload';

/**
 * Все route-level lazy imports таймлайна в одном месте, чтобы Timeline.tsx
 * не разбухал имплементационным шумом lazyWithReload.
 */

export const TimelineLeftPanel = lazy(() =>
  lazyWithReload(
    () =>
      import('./components/TimelineLeftPanel').then((m) => ({
        default: m.TimelineLeftPanel,
      })),
    'TimelineLeftPanel',
  ),
);

export const TimelineRightPanel = lazy(() =>
  lazyWithReload(
    () =>
      import('./components/TimelineRightPanel').then((m) => ({
        default: m.TimelineRightPanel,
      })),
    'TimelineRightPanel',
  ),
);

export const TimelineCanvas = lazy(() =>
  lazyWithReload(
    () =>
      import('./components/TimelineCanvas').then((m) => ({
        default: m.TimelineCanvas,
      })),
    'TimelineCanvas',
  ),
);

export const BulkEventCreator = lazy(() =>
  lazyWithReload(
    () =>
      import('./components/BulkEventCreator').then((m) => ({
        default: m.BulkEventCreator,
      })),
    'BulkEventCreator',
  ),
);

export const TimelineHelpModal = lazy(() =>
  lazyWithReload(
    () =>
      import('./components/TimelineHelpModal').then((m) => ({
        default: m.TimelineHelpModal,
      })),
    'TimelineHelpModal',
  ),
);

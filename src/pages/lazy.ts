import { lazy } from 'react';
import { lazyWithReload } from '../lib/lazyWithReload';

// React.lazy() is safe for top-level calls as it doesn't execute imports immediately
// It creates a lazy component wrapper that loads on first render
export const HomePage = lazy(() =>
  lazyWithReload(
    () => import('./HomePage').then((module) => ({ default: module.HomePage })),
    'HomePage'
  )
);
export const Admin = lazy(() => lazyWithReload(() => import('./Admin'), 'Admin'));
export const AdminArchive = lazy(() => lazyWithReload(() => import('./AdminArchive'), 'AdminArchive'));
export const AdminUsers = lazy(() => lazyWithReload(() => import('./AdminUsers'), 'AdminUsers'));
export const AdminContent = lazy(() => lazyWithReload(() => import('./AdminContent'), 'AdminContent'));
export const AdminContentEdit = lazy(() => lazyWithReload(() => import('./AdminContentEdit'), 'AdminContentEdit'));
export const AdminHomePage = lazy(() => lazyWithReload(() => import('./AdminHomePage'), 'AdminHomePage'));
export const AdminTopics = lazy(() => lazyWithReload(() => import('./AdminTopics'), 'AdminTopics'));
export const AdminBooks = lazy(() => lazyWithReload(() => import('./AdminBooks'), 'AdminBooks'));
export const MigrateTopics = lazy(() => lazyWithReload(() => import('./MigrateTopics'), 'MigrateTopics'));
export const Profile = lazy(() => lazyWithReload(() => import('./Profile'), 'Profile'));
export const Notes = lazy(() => lazyWithReload(() => import('./Notes'), 'Notes'));
export const Timeline = lazy(() => lazyWithReload(() => import('./Timeline'), 'Timeline'));
export const DisorderTable = lazy(() => lazyWithReload(() => import('./DisorderTable'), 'DisorderTable'));
export const DynamicTest = lazy(() => lazyWithReload(() => import('./DynamicTest'), 'DynamicTest'));
export const TestsPage = lazy(() =>
  lazyWithReload(
    () => import('./TestsPage').then((module) => ({ default: module.TestsPage })),
    'TestsPage'
  )
);
export const ResearchPage = lazy(() => lazyWithReload(() => import('./ResearchPage'), 'ResearchPage'));
export const DynamicPeriodPage = lazy(() =>
  lazyWithReload(
    () => import('./DynamicPeriodPage').then((module) => ({ default: module.DynamicPeriodPage })),
    'DynamicPeriodPage'
  )
);
export const FeaturesPage = lazy(() => lazyWithReload(() => import('./FeaturesPage'), 'FeaturesPage'));
export const WarmSprings2Page = lazy(() => lazyWithReload(() => import('./WarmSprings2Page'), 'WarmSprings2Page'));
export const BookingPage = lazy(() =>
  lazyWithReload(
    () => import('./BookingPage').then((module) => ({ default: module.BookingPage })),
    'BookingPage'
  )
);
export const BookingAccountPage = lazy(() =>
  lazyWithReload(
    () => import('./booking/AccountPage').then((module) => ({ default: module.AccountPage })),
    'BookingAccountPage'
  )
);

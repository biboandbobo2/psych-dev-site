import { lazy } from 'react';

// React.lazy() is safe for top-level calls as it doesn't execute imports immediately
// It creates a lazy component wrapper that loads on first render
export const HomePage = lazy(() =>
  import('./HomePage').then((module) => ({ default: module.HomePage }))
);
export const Admin = lazy(() => import('./Admin'));
export const AdminUsers = lazy(() => import('./AdminUsers'));
export const AdminContent = lazy(() => import('./AdminContent'));
export const AdminContentEdit = lazy(() => import('./AdminContentEdit'));
export const AdminHomePage = lazy(() => import('./AdminHomePage'));
export const AdminTopics = lazy(() => import('./AdminTopics'));
export const AdminBooks = lazy(() => import('./AdminBooks'));
export const MigrateTopics = lazy(() => import('./MigrateTopics'));
export const Profile = lazy(() => import('./Profile'));
export const Notes = lazy(() => import('./Notes'));
export const Timeline = lazy(() => import('./Timeline'));
export const DynamicTest = lazy(() => import('./DynamicTest'));
export const TestsPage = lazy(() =>
  import('./TestsPage').then((module) => ({ default: module.TestsPage }))
);
export const ResearchPage = lazy(() => import('./ResearchPage'));

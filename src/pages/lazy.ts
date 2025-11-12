import { lazy } from 'react';

export const Admin = lazy(() => import('./Admin'));
export const AdminUsers = lazy(() => import('./AdminUsers'));
export const AdminContent = lazy(() => import('./AdminContent'));
export const AdminContentEdit = lazy(() => import('./AdminContentEdit'));
export const AdminTopics = lazy(() => import('./AdminTopics'));
export const MigrateTopics = lazy(() => import('./MigrateTopics'));
export const Profile = lazy(() => import('./Profile'));
export const Notes = lazy(() => import('./Notes'));
export const Timeline = lazy(() => import('./Timeline'));
export const DynamicTest = lazy(() => import('./DynamicTest'));
export const TestsPage = lazy(() =>
  import('./TestsPage').then((module) => ({ default: module.TestsPage }))
);

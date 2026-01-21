import { Suspense } from 'react';
import { Routes, Route, Navigate, Location } from 'react-router-dom';
import RequireAuth from '../auth/RequireAuth';
import RequireAdmin from '../auth/RequireAdmin';
import Login from '../pages/Login';
import {
  HomePage,
  Admin,
  AdminUsers,
  AdminContent,
  AdminContentEdit,
  AdminHomePage,
  AdminTopics,
  AdminBooks,
  MigrateTopics,
  Profile,
  Notes,
  Timeline,
  DynamicTest,
  TestsPage,
  ResearchPage,
  DynamicPeriodPage,
  FeaturesPage,
} from '../pages/lazy';
import { PageLoader } from '../components/ui';
import { ROUTE_CONFIG, CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, NOT_FOUND_REDIRECT } from '../routes';
import { PeriodPage } from '../pages/PeriodPage';
import NotFound from './NotFound';
import type { Period, ClinicalTopic, GeneralTopic } from '../types/content';

interface AppRoutesProps {
  location: Location;
  periodMap: Map<string, Period>;
  clinicalTopicsMap: Map<string, ClinicalTopic>;
  generalTopicsMap: Map<string, GeneralTopic>;
  isSuperAdmin: boolean;
}

export function AppRoutes({ location, periodMap, clinicalTopicsMap, generalTopicsMap, isSuperAdmin }: AppRoutesProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Profile />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin/content"
          element={
            <RequireAdmin>
              <AdminContent />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/topics"
          element={
            <RequireAdmin>
              <AdminTopics />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/content/edit/:periodId"
          element={
            <RequireAdmin>
              <AdminContentEdit />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/homepage"
          element={
            <RequireAdmin>
              <AdminHomePage />
            </RequireAdmin>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/notes"
          element={
            <RequireAuth>
              <Notes />
            </RequireAuth>
          }
        />
        <Route
          path="/timeline"
          element={
            <RequireAuth>
              <Timeline />
            </RequireAuth>
          }
        />
        <Route
          path="/tests"
          element={
            <RequireAuth>
              <TestsPage rubricFilter="full-course" />
            </RequireAuth>
          }
        />
        <Route
          path="/tests-lesson"
          element={
            <RequireAuth>
              <TestsPage rubricFilter="age-periods" />
            </RequireAuth>
          }
        />
        <Route
          path="/research"
          element={
            <RequireAuth>
              <ResearchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/tests/dynamic/:testId"
          element={
            <RequireAuth>
              <DynamicTest />
            </RequireAuth>
          }
        />
        {isSuperAdmin && (
          <>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <AdminUsers />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/books"
              element={
                <RequireAdmin>
                  <AdminBooks />
                </RequireAdmin>
              }
            />
            <Route
              path="/migrate-topics"
              element={
                <RequireAuth>
                  <MigrateTopics />
                </RequireAuth>
              }
            />
          </>
        )}
        {ROUTE_CONFIG.map((config) => (
          <Route
            key={config.path}
            path={config.path}
            element={
              <PeriodPage
                config={config}
                period={config.periodId ? periodMap.get(config.periodId) : null}
              />
            }
          />
        ))}
        {CLINICAL_ROUTE_CONFIG.map((config) => (
          <Route
            key={config.path}
            path={config.path}
            element={
              <PeriodPage
                config={config}
                period={config.periodId ? clinicalTopicsMap.get(config.periodId) : null}
              />
            }
          />
        ))}
        {GENERAL_ROUTE_CONFIG.map((config) => (
          <Route
            key={config.path}
            path={config.path}
            element={
              <PeriodPage
                config={config}
                period={config.periodId ? generalTopicsMap.get(config.periodId) : null}
              />
            }
          />
        ))}
        {/* Динамические роуты для занятий, созданных через админку */}
        <Route
          path="/clinical/:periodId"
          element={<DynamicPeriodPage course="clinical" topicsMap={clinicalTopicsMap} />}
        />
        <Route
          path="/general/:periodId"
          element={<DynamicPeriodPage course="general" topicsMap={generalTopicsMap} />}
        />
        <Route
          path="/:periodId"
          element={<DynamicPeriodPage course="development" topicsMap={periodMap} />}
        />
        <Route
          path="*"
          element={
            NOT_FOUND_REDIRECT ? (
              <Navigate to="/prenatal" replace />
            ) : (
              <NotFound />
            )
          }
        />
      </Routes>
    </Suspense>
  );
}

import { Suspense } from 'react';
import { Routes, Route, Navigate, Location, useParams } from 'react-router-dom';
import RequireAuth from '../auth/RequireAuth';
import RequireAdmin from '../auth/RequireAdmin';
import Login from '../pages/Login';
import { useAuthStore } from '../stores/useAuthStore';
import {
  HomePage,
  Admin,
  AdminArchive,
  AdminUsers,
  AdminContent,
  AdminContentEdit,
  AdminTopics,
  AdminBooks,
  MigrateTopics,
  Profile,
  Notes,
  Timeline,
  DisorderTable,
  DynamicTest,
  TestsPage,
  ResearchPage,
  DynamicPeriodPage,
  FeaturesPage,
  AboutPage,
  CourseIntroPage,
  AdminCourseIntro,
  AdminAnnouncements,
  AdminGroups,
  AdminPagesList,
  AdminAboutPageEditor,
  AdminProjectPageEditor,
  PaletteDebug,
  HomeV2Debug,
  WarmSprings2Page,
  DynamicProjectPage,
  BookingSectionLayout,
  BookingPage,
  BookingAccountPage,
  BookingPhotosPage,
  BookingPricingPage,
  BookingDirectionsPage,
} from '../pages/lazy';
import { PageLoader } from '../components/ui';
import { ROUTE_CONFIG, CLINICAL_ROUTE_CONFIG, GENERAL_ROUTE_CONFIG, NOT_FOUND_REDIRECT } from '../routes';
import { PeriodPage } from '../pages/PeriodPage';
import NotFound from './NotFound';
import DynamicCoursePeriodPage from '../pages/DynamicCoursePeriodPage';
import type { Period, ClinicalTopic, GeneralTopic } from '../types/content';

interface AppRoutesProps {
  location: Location;
  periodMap: Map<string, Period>;
  clinicalTopicsMap: Map<string, ClinicalTopic>;
  generalTopicsMap: Map<string, GeneralTopic>;
  isSuperAdmin: boolean;
}

function AdminLanding() {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  return <Navigate to={isSuperAdmin ? "/superadmin" : "/admin/content"} replace />;
}

function DynamicCourseIntroRoute() {
  const { courseId } = useParams<{ courseId: string }>();
  if (!courseId) return <Navigate to="/home" replace />;
  return <CourseIntroPage courseId={courseId} />;
}

export function AppRoutes({ location, periodMap, clinicalTopicsMap, generalTopicsMap, isSuperAdmin }: AppRoutesProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/homepage" element={<Navigate to="/home" replace />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/warm_springs2" element={<WarmSprings2Page />} />
        <Route path="/projects/:slug" element={<DynamicProjectPage />} />
        <Route path="/booking" element={<BookingSectionLayout />}>
          <Route index element={<BookingPage />} />
          <Route path="account" element={<BookingAccountPage embedded />} />
          <Route path="photos" element={<BookingPhotosPage embedded />} />
          <Route path="pricing" element={<BookingPricingPage embedded />} />
          <Route path="directions" element={<BookingDirectionsPage embedded />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLanding />
            </RequireAdmin>
          }
        />
        <Route
          path="/superadmin"
          element={
            <RequireAdmin>
              {isSuperAdmin ? <Admin /> : <Navigate to="/admin/content" replace />}
            </RequireAdmin>
          }
        />
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
          path="/admin/content/course-intro/:courseId"
          element={
            <RequireAdmin>
              <AdminCourseIntro />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <RequireAdmin>
              <AdminAnnouncements />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/groups"
          element={
            <RequireAdmin>
              <AdminGroups />
            </RequireAdmin>
          }
        />
        <Route
          path="/superadmin/pages"
          element={
            <RequireAdmin>
              {isSuperAdmin ? <AdminPagesList /> : <Navigate to="/admin/content" replace />}
            </RequireAdmin>
          }
        />
        <Route
          path="/superadmin/pages/about"
          element={
            <RequireAdmin>
              {isSuperAdmin ? <AdminAboutPageEditor /> : <Navigate to="/admin/content" replace />}
            </RequireAdmin>
          }
        />
        <Route
          path="/superadmin/pages/projects/:slug"
          element={
            <RequireAdmin>
              {isSuperAdmin ? <AdminProjectPageEditor /> : <Navigate to="/admin/content" replace />}
            </RequireAdmin>
          }
        />
        {import.meta.env.DEV && <Route path="/_debug/palette" element={<PaletteDebug />} />}
        {import.meta.env.DEV && <Route path="/_debug/home-v2" element={<HomeV2Debug />} />}
        <Route
          path="/admin/books"
          element={
            <RequireAdmin>
              <AdminBooks />
            </RequireAdmin>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/development/intro" element={<CourseIntroPage courseId="development" />} />
        <Route path="/clinical/intro" element={<CourseIntroPage courseId="clinical" />} />
        <Route path="/general/intro" element={<CourseIntroPage courseId="general" />} />
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
          path="/disorder-table"
          element={
            <RequireAuth>
              <DisorderTable />
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
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>
              <AdminUsers />
            </RequireAdmin>
          }
        />
        {isSuperAdmin && (
          <>
            <Route
              path="/admin/archive"
              element={
                <RequireAdmin>
                  <AdminArchive />
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
        {CLINICAL_ROUTE_CONFIG.filter((config) => config.path !== '/clinical/intro').map((config) => (
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
        {GENERAL_ROUTE_CONFIG.filter((config) => config.path !== '/general/intro').map((config) => (
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
        <Route path="/course/:courseId/intro" element={<DynamicCourseIntroRoute />} />
        <Route
          path="/course/:courseId/:periodId"
          element={<DynamicCoursePeriodPage />}
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

import { lazy } from 'react';
import { lazyWithReload } from '../lib/lazyWithReload';

// PURE lets the standalone iconography build omit unused page factories.
// React.lazy() is safe for top-level calls as it doesn't execute imports immediately
// It creates a lazy component wrapper that loads on first render
export const HomePage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => import('./HomePage').then((module) => ({ default: module.HomePage })),
    'HomePage'
  )
);
export const Admin = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./Admin'), 'Admin'));
export const CoAdmin = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./CoAdmin'), 'CoAdmin'));
export const AdminArchive = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./AdminArchive'), 'AdminArchive'));
export const AdminUsers = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./AdminUsers'), 'AdminUsers'));
export const AdminContent = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./AdminContent'), 'AdminContent'));
export const AdminContentEdit = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./AdminContentEdit'), 'AdminContentEdit'));
export const AdminHomePage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./AdminHomePage'), 'AdminHomePage'));
export const AdminTopics = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./AdminTopics'), 'AdminTopics'));
export const AdminBooks = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./AdminBooks'), 'AdminBooks'));
export const MigrateTopics = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./MigrateTopics'), 'MigrateTopics'));
export const Profile = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./Profile'), 'Profile'));
export const Notes = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./Notes'), 'Notes'));
export const Timeline = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./Timeline'), 'Timeline'));
export const DisorderTable = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./DisorderTable'), 'DisorderTable'));
export const TimelineAutomation = /* @__PURE__ */ lazy(() =>
  lazyWithReload(() => import('./TimelineAutomation'), 'TimelineAutomation')
);
export const DynamicTest = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./DynamicTest'), 'DynamicTest'));
export const TestsPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => import('./TestsPage').then((module) => ({ default: module.TestsPage })),
    'TestsPage'
  )
);
export const ResearchPage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./ResearchPage'), 'ResearchPage'));
export const DynamicPeriodPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => import('./DynamicPeriodPage').then((module) => ({ default: module.DynamicPeriodPage })),
    'DynamicPeriodPage'
  )
);
export const FeaturesPage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./FeaturesPage'), 'FeaturesPage'));
export const CourseIntroPage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./course/CourseIntroPage'), 'CourseIntroPage'));
export const AdminCourseIntro = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/courseIntro/CourseIntroEditor'), 'AdminCourseIntro'));
export const AdminAnnouncements = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/AdminAnnouncements'), 'AdminAnnouncements'));
export const AdminExams = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/exams/AdminExams'), 'AdminExams'));
export const AdminTelemetry = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/telemetry/AdminTelemetry'), 'AdminTelemetry'));
export const AuthorCabinet = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/cabinet/AuthorCabinet'), 'AuthorCabinet'));
export const AdminLectureQuestions = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/questions/AdminLectureQuestions'), 'AdminLectureQuestions'));
export const AdminCourseStudents = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/students/CourseStudents'), 'AdminCourseStudents'));
export const AdminPagesList = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/pages/AdminPagesList'), 'AdminPagesList'));
export const AdminAboutPageEditor = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/pages/about/AboutPageEditor'), 'AdminAboutPageEditor'));
export const AdminProjectPageEditor = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./admin/pages/project/ProjectPageEditor'), 'AdminProjectPageEditor'));
export const PaletteDebug = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./debug/PaletteDebug'), 'PaletteDebug'));
export const HomeV2Debug = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./debug/HomeV2Debug'), 'HomeV2Debug'));
export const WarmSprings2Page = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./WarmSprings2Page'), 'WarmSprings2Page'));
export const VozrastLandingPage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./VozrastLandingPage'), 'VozrastLandingPage'));
export const RetrainingLandingPage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./RetrainingLandingPage'), 'RetrainingLandingPage'));
export const AboutPage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./about/AboutPage'), 'AboutPage'));
export const DynamicProjectPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(() => import('./projects/DynamicProjectPage'), 'DynamicProjectPage')
);

const importBookingPages = () => import('./booking');
export const BookingSectionLayout = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => importBookingPages().then((module) => ({ default: module.BookingSectionLayout })),
    'BookingSectionLayout'
  )
);
export const BookingPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => importBookingPages().then((module) => ({ default: module.BookingPageRoute })),
    'BookingPage'
  )
);
export const BookingAccountPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => importBookingPages().then((module) => ({ default: module.AccountPage })),
    'BookingAccountPage'
  )
);
export const BookingPhotosPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => importBookingPages().then((module) => ({ default: module.PhotosPage })),
    'BookingPhotosPage'
  )
);
export const BookingPricingPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => importBookingPages().then((module) => ({ default: module.PricingPage })),
    'BookingPricingPage'
  )
);
export const BookingDirectionsPage = /* @__PURE__ */ lazy(() =>
  lazyWithReload(
    () => importBookingPages().then((module) => ({ default: module.DirectionsPage })),
    'BookingDirectionsPage'
  )
);

export const IconographyPage = /* @__PURE__ */ lazy(() => lazyWithReload(() => import('./IconographyPage'), 'IconographyPage'));

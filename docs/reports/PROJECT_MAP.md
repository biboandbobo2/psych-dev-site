# 🗺️ Project Structure Map

Generated: 2026-04-28T13:00:59.358Z

## 📊 Summary

- **Data files**: 94
- **Components**: 301
- **Config/Utils**: 267
- **Total analyzed**: 861

---

## 📁 Data Files (CSV, JSON)

- `.claude/settings.local.json` (147 lines, 8.2KB) - Data storage
- `.vercel/project.json` (1 lines, 0.1KB) - Data storage
- `clinical_psych_site_content.json` (1038 lines, 43.1KB) - Data storage
- `course-template.json` (437 lines, 11.3KB) - Data storage
- `docs/plan-overview.json` (43 lines, 2.2KB) - Data storage
- `docs/research_sources.json` (164 lines, 3.1KB) - Data storage
- `firebase.json` (14 lines, 0.2KB) - Data storage
- `firestore.indexes.json` (103 lines, 2.8KB) - Data storage
- `functions/package-lock.json` (5219 lines, 181.6KB) - Data storage
- `functions/package.json` (28 lines, 0.6KB) - Data storage
- `functions/tsconfig.json` (14 lines, 0.3KB) - Data storage
- `general-psychology.json` (617 lines, 20.3KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_eu_after_orphan_delete.json` (32 lines, 1.5KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_eu_postcheck.json` (32 lines, 1.5KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_eu_status.json` (32 lines, 1.5KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_eu_step0.json` (60 lines, 3.0KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_europe-west1.json` (346 lines, 19.2KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_europe-west1_after_step3_attempt.json` (60 lines, 3.0KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_europe-west1_step3.json` (346 lines, 19.2KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_us-central1.json` (95 lines, 4.2KB) - Data storage
- `logs/artifact-registry-cleanup/ar_images_us-central1_step1.json` (95 lines, 4.2KB) - Data storage
- `logs/artifact-registry-cleanup/artifact_repos.json` (37 lines, 1.2KB) - Data storage
- `logs/artifact-registry-cleanup/artifact_repos_after_step1.json` (20 lines, 0.6KB) - Data storage
- `logs/artifact-registry-cleanup/artifact_repos_after_step3_attempt.json` (20 lines, 0.6KB) - Data storage
- `logs/artifact-registry-cleanup/artifact_repos_before_step3.json` (20 lines, 0.6KB) - Data storage
- `logs/artifact-registry-cleanup/artifact_repos_postcheck.json` (37 lines, 1.2KB) - Data storage
- `logs/artifact-registry-cleanup/artifact_repos_status.json` (37 lines, 1.2KB) - Data storage
- `logs/artifact-registry-cleanup/cleanup_policy_conservative.json` (23 lines, 0.4KB) - Data storage
- `logs/artifact-registry-cleanup/cleanup_policy_untagged_14d.json` (13 lines, 0.2KB) - Data storage
- `logs/artifact-registry-cleanup/functions_v2_list.json` (564 lines, 23.7KB) - Data storage
- `logs/artifact-registry-cleanup/functions_v2_list_step3.json` (564 lines, 23.7KB) - Data storage
- `logs/artifact-registry-cleanup/report_metrics.json` (42 lines, 2.4KB) - Data storage
- `logs/artifact-registry-cleanup/run_revisions_ingestbook.json` (3658 lines, 146.4KB) - Data storage
- `logs/artifact-registry-cleanup/run_revisions_ingestbook_after_step2.json` (459 lines, 18.4KB) - Data storage
- `logs/artifact-registry-cleanup/run_revisions_ingestbook_after_step2b.json` (306 lines, 12.3KB) - Data storage
- `logs/artifact-registry-cleanup/run_revisions_ingestbook_step0.json` (306 lines, 12.3KB) - Data storage
- `logs/artifact-registry-cleanup/run_revisions_ingestbook_step2.json` (3658 lines, 146.4KB) - Data storage
- `logs/artifact-registry-cleanup/run_revisions_ingestbook_step2b.json` (2660 lines, 106.5KB) - Data storage
- `logs/artifact-registry-cleanup/run_revisions_ingestbook_step3.json` (306 lines, 12.3KB) - Data storage
- `logs/artifact-registry-cleanup/run_service_ingestbook.json` (165 lines, 6.5KB) - Data storage
- `logs/artifact-registry-cleanup/run_service_ingestbook_postcheck.json` (165 lines, 6.5KB) - Data storage
- `logs/artifact-registry-cleanup/run_service_ingestbook_step0.json` (165 lines, 6.5KB) - Data storage
- `logs/artifact-registry-cleanup/run_service_ingestbook_step2.json` (165 lines, 6.5KB) - Data storage
- `logs/artifact-registry-cleanup/run_service_ingestbook_step2b.json` (165 lines, 6.5KB) - Data storage
- `logs/artifact-registry-cleanup/run_service_ingestbook_step3.json` (165 lines, 6.5KB) - Data storage
- `logs/artifact-registry-cleanup/run_services.json` (167 lines, 6.8KB) - Data storage
- `logs/artifact-registry-cleanup/run_services_postcheck.json` (167 lines, 6.8KB) - Data storage
- `logs/artifact-registry-cleanup/run_services_step0.json` (167 lines, 6.8KB) - Data storage
- `logs/artifact-registry-cleanup/step0_state.json` (97 lines, 3.7KB) - Data storage
- `logs/artifact-registry-cleanup/step1_orphan_delete_metrics.json` (15 lines, 0.5KB) - Data storage
- `logs/artifact-registry-cleanup/summary.json` (986 lines, 43.8KB) - Data storage
- `logs/artifact-registry-cleanup/summary_step3.json` (7 lines, 0.1KB) - Data storage
- `logs/artifact-registry-cleanup/untagged_older_than_14d.json` (1 lines, 0.0KB) - Data storage
- `logs/artifact-registry-investigation/ar_images_europe-west1.json` (346 lines, 19.2KB) - Data storage
- `logs/artifact-registry-investigation/ar_images_us-central1.json` (95 lines, 4.2KB) - Data storage
- `logs/artifact-registry-investigation/artifact_repos.json` (37 lines, 1.2KB) - Data storage
- `logs/artifact-registry-investigation/functions_ingestBook.json` (68 lines, 2.5KB) - Data storage
- `logs/artifact-registry-investigation/functions_v2_list.json` (564 lines, 23.7KB) - Data storage
- `logs/artifact-registry-investigation/run_revisions_ingestbook.json` (3658 lines, 146.4KB) - Data storage
- `logs/artifact-registry-investigation/run_service_ingestbook.json` (165 lines, 6.5KB) - Data storage
- `logs/artifact-registry-investigation/run_services.json` (167 lines, 6.8KB) - Data storage
- `logs/artifact-registry-investigation/summary.json` (1314 lines, 59.6KB) - Data storage
- `logs/lighthouse-timeline.json` (26181 lines, 1044.8KB) - Data storage
- `logs/pre-github-audit/ar_images_eu.json` (32 lines, 1.5KB) - Data storage
- `logs/pre-github-audit/ar_repo_eu_cleanup_policies.json` (27 lines, 0.4KB) - Data storage
- `logs/pre-github-audit/ar_repo_eu_describe.json` (40 lines, 1.1KB) - Data storage
- `logs/pre-github-audit/ar_repos.json` (37 lines, 1.2KB) - Data storage
- `logs/pre-github-audit/billing_accounts.json` (19 lines, 0.4KB) - Data storage
- `logs/pre-github-audit/budgets_010C05-CE6FD2-DF4CA1.json` (2 lines, 0.0KB) - Data storage
- `logs/pre-github-audit/enabled_services.json` (3654 lines, 143.4KB) - Data storage
- `logs/pre-github-audit/functions_gen2.json` (1 lines, 0.0KB) - Data storage
- `logs/pre-github-audit/functions_v2.json` (613 lines, 25.9KB) - Data storage
- `logs/pre-github-audit/run_revisions_ingestbook.json` (306 lines, 12.3KB) - Data storage
- `logs/pre-github-audit/run_service_ingestbook.json` (165 lines, 6.5KB) - Data storage
- `logs/pre-github-audit/run_services.json` (167 lines, 6.8KB) - Data storage
- `logs/pre-github-audit/summary.json` (43 lines, 1.4KB) - Data storage
- `package-lock.json` (17387 lines, 608.1KB) - Data storage
- `package.json` (110 lines, 5.4KB) - Data storage
- `public/icons/icons.json` (207 lines, 4.1KB) - Data storage
- `scripts/tsconfig.json` (11 lines, 0.2KB) - Data storage
- `src/data/clinical-topics.json` (847 lines, 35.1KB) - Data storage [Contains period colors]
- `src/data/tests/development-19-22-test.json` (300 lines, 16.1KB) - Data storage
- `src/data/tests/development-22-27-test.json` (300 lines, 16.3KB) - Data storage
- `src/data/tests/development-28-40-test.json` (300 lines, 16.1KB) - Data storage
- `src/data/tests/general-3-test.json` (300 lines, 16.3KB) - Data storage
- `src/data/tests/general-4-test.json` (300 lines, 16.6KB) - Data storage
- `src/features/researchSearch/config/research_sources.json` (383 lines, 9.1KB) - Data storage
- `tests/integration/firebase.test.json` (21 lines, 0.3KB) - Data storage
- `tsconfig.api.json` (9 lines, 0.2KB) - Data storage
- `tsconfig.base.json` (24 lines, 0.5KB) - Data storage
- `tsconfig.json` (10 lines, 0.2KB) - Data storage
- `tsconfig.tests.json` (16 lines, 0.3KB) - Data storage
- `vercel.json` (25 lines, 0.5KB) - Data storage
- `verification-diff.json` (72 lines, 1.3KB) - Data storage

---

## 🎨 Files mentioning colors/periods

- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]
- `shared/verifyCore.ts` - Utilities/Config [Contains period colors]
- `src/components/AdminCourseSidebar.tsx` - Component: AdminCourseSidebar [Contains period colors]
- `src/components/CombinedSearchDrawer.tsx` - [Contains period colors]
- `src/components/NotesFilter.tsx` - [Contains period colors]
- `src/components/StudentCourseSidebar.tsx` - Component: StudentCourseSidebar [Contains period colors]
- `src/components/UserMenu.tsx` - Component: UserMenu [Contains period colors]
- `src/components/profile/FeaturedCoursesSection.tsx` - [Contains period colors]
- `src/components/tests/TestCard.tsx` - [Contains period colors]
- `src/components/tests/TestIntroScreen.tsx` - [Contains period colors]
- `src/components/tests/TestQuestionScreen.tsx` - [Contains period colors]
- `src/components/tests/TestResultsScreen.tsx` - [Contains period colors]
- `src/components/tests/__tests__/TestQuestionScreen.test.tsx` - [Contains period colors]
- `src/components/tests/__tests__/TestResultsScreen.test.tsx` - [Contains period colors]
- `src/components/tests/editor/hooks/useTestTheme.ts` - Utilities/Config [Contains period colors]
- `src/components/ui/BackToTop.jsx` - [Contains period colors]
- `src/components/ui/Button.jsx` - [Contains period colors]
- `src/components/ui/PageLoader.tsx` - [Contains period colors]
- `src/constants/periods.ts` - Utilities/Config [Contains period colors]
- `src/data/clinical-topics.json` - Data storage [Contains period colors]
- `src/features/bookSearch/components/BookAnswer.tsx` - [Contains period colors]
- `src/features/bookSearch/components/BookSearchBlock.tsx` - [Contains period colors]
- `src/features/bookSearch/components/BookSelector.tsx` - [Contains period colors]
- `src/features/contentSearch/components/ContentSearchDrawer.tsx` - [Contains period colors]
- `src/features/contentSearch/components/ContentSearchResults.tsx` - [Contains period colors]
- `src/features/contentSearch/hooks/useContentSearch.test.tsx` - [Contains period colors]
- `src/features/lectureSearch/components/LectureAnswer.tsx` - [Contains period colors]
- `src/features/lectureSearch/components/LectureSearchBlock.tsx` - [Contains period colors]
- `src/features/periods/components/BadgeSection.tsx` - [Contains period colors]
- `src/features/periods/components/GenericSection.tsx` - [Contains period colors]
- `src/features/periods/components/ListSection.tsx` - [Contains period colors]
- `src/features/periods/components/SelfQuestionsSection.tsx` - [Contains period colors]
- `src/features/periods/components/VideoSection.tsx` - [Contains period colors]
- `src/features/periods/components/VideoStudyNotesPanel.tsx` - [Contains period colors]
- `src/features/periods/components/VideoTranscriptPanel.test.tsx` - [Contains period colors]
- `src/features/periods/components/VideoTranscriptPanel.tsx` - [Contains period colors]
- `src/features/periods/hooks/usePeriodTheme.ts` - Utilities/Config [Contains period colors]
- `src/features/researchSearch/components/AiAssistantBlock.tsx` - [Contains period colors]
- `src/features/researchSearch/components/ResearchResultsList.tsx` - [Contains period colors]
- `src/features/researchSearch/components/ResearchSearchDrawer.tsx` - [Contains period colors]
- `src/hooks/useCourseNavItems.test.ts` - [Contains period colors]
- `src/hooks/useCreateCourse.ts` - Utilities/Config [Contains period colors]
- `src/hooks/useCreateLesson.ts` - Utilities/Config [Contains period colors]
- `src/layouts/AppLayout.tsx` - [Contains period colors]
- `src/lib/courseOpenness.test.ts` - [Contains period colors]
- `src/pages/AdminArchive.tsx` - Component: AdminArchive [Contains period colors]
- `src/pages/AdminBooks.tsx` - Component: AdminBooks [Contains period colors]
- `src/pages/AdminContentEdit.tsx` - Component: AdminContentEdit [Contains period colors]
- `src/pages/DynamicTest.tsx` - Component: DynamicTest [Contains period colors]
- `src/pages/FeaturesPage.tsx` - Component: FeaturesPage [Contains period colors]
- `src/pages/Notes.tsx` - Component: Notes [Contains period colors]
- `src/pages/Profile.tsx` - Component: Profile [Contains period colors]
- `src/pages/ResearchPage.tsx` - Component: ResearchPage [Contains period colors]
- `src/pages/about/AboutPage.tsx` - Component: AboutPage [Contains period colors]
- `src/pages/admin/announcements/AdminFeedList.tsx` - [Contains period colors]
- `src/pages/admin/books/BookCreateForm.tsx` - [Contains period colors]
- `src/pages/admin/books/BookEditModal.tsx` - [Contains period colors]
- `src/pages/admin/books/BulkUploadModal.tsx` - [Contains period colors]
- `src/pages/admin/content/SortableItem.tsx` - [Contains period colors]
- `src/pages/admin/content/mergeCoreCoursePlaceholders.test.ts` - [Contains period colors]
- `src/pages/admin/content/mergeCoreCoursePlaceholders.ts` - Utilities/Config [Contains period colors]
- `src/pages/admin/content/types.ts` - [Contains period colors]
- `src/pages/admin/content-editor/components/ContentThemeEditor.tsx` - [Contains period colors]
- `src/pages/admin/content-editor/hooks/useContentForm.ts` - Utilities/Config [Contains period colors]
- `src/pages/admin/content-editor/hooks/useContentLoader.ts` - Utilities/Config [Contains period colors]
- `src/pages/admin/content-editor/hooks/useContentSaver.ts` - Utilities/Config [Contains period colors]
- `src/pages/admin/content-editor/types.ts` - [Contains period colors]
- `src/pages/booking/StartStep.tsx` - [Contains period colors]
- `src/pages/course/CourseIntroPage.tsx` - Component: CourseIntroPage [Contains period colors]
- `src/pages/debug/HomeV2Debug.tsx` - Component: HomeV2Debug [Contains period colors]
- `src/pages/debug/PaletteDebug.tsx` - Component: PaletteDebug [Contains period colors]
- `src/pages/home/GuestLanding.tsx` - [Contains period colors]
- `src/pages/home/HomeDashboard.tsx` - [Contains period colors]
- `src/pages/home/PlatformNewsSection.tsx` - [Contains period colors]
- `src/pages/home/RegisteredGuestHome.tsx` - [Contains period colors]
- `src/pages/home/components/CatalogCourseCard.tsx` - [Contains period colors]
- `src/pages/home/components/ContinueCourseCard.tsx` - [Contains period colors]
- `src/pages/home/components/FeedItemModal.tsx` - [Contains period colors]
- `src/pages/home/components/MiniWeekCalendar.tsx` - [Contains period colors]
- `src/pages/home/components/MyAssignmentsSection.tsx` - [Contains period colors]
- `src/pages/home/components/MyGroupsFeedSection.tsx` - [Contains period colors]
- `src/pages/notes/components/NotesEmpty.tsx` - [Contains period colors]
- `src/pages/notes/components/NotesHeader.tsx` - [Contains period colors]
- `src/pages/notes/components/NotesList.tsx` - [Contains period colors]
- `src/pages/projects/ProjectPage.tsx` - Component: ProjectPage [Contains period colors]
- `src/pages/timeline/components/TimelineLeftPanel.tsx` - [Contains period colors]
- `src/pages/warmSprings2/data.ts` - Utilities/Config [Contains period colors]
- `src/pages/warmSprings2/sections/PriceSection.tsx` - [Contains period colors]
- `src/theme/periods.ts` - Utilities/Config [Contains period colors]
- `src/types/content.ts` - [Contains period colors]
- `src/types/tests.ts` - Utilities/Config [Contains period colors]
- `src/utils/testAppearance.test.ts` - [Contains period colors]
- `src/utils/testAppearance.ts` - Utilities/Config [Contains period colors]
- `tests/integration/firestoreHelpers.test.ts` - [Contains period colors]

---

## 📄 Files referencing CSV

- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]

---

## 🧩 Key Components

- `src/auth/RequireAdmin.tsx` - Component: RequireAdmin
- `src/components/AddAdminModal.tsx` - Component
- `src/components/AdminCourseSidebar.tsx` - Component: AdminCourseSidebar [Contains period colors]
- `src/components/EditAdminPermissionsModal.tsx` - Component
- `src/components/SuperAdminBadge.tsx` - Component
- `src/components/SuperAdminTaskPanel.tsx` - Component: SuperAdminTaskPanel
- `src/components/superAdminTasks/ArchiveSection.tsx` - Component
- `src/components/superAdminTasks/NewRoleForm.tsx` - Component
- `src/components/superAdminTasks/SortableRole.tsx` - Component
- `src/components/tests/TestIntroScreen.tsx` - [Contains period colors]
- `src/features/periods/components/PeriodSections.tsx` - Component
- `src/pages/Admin.tsx` - Component: Admin
- `src/pages/AdminArchive.tsx` - Component: AdminArchive [Contains period colors]
- `src/pages/AdminBooks.tsx` - Component: AdminBooks [Contains period colors]
- `src/pages/AdminContent.tsx` - Component: AdminContent
- `src/pages/AdminContentEdit.tsx` - Component: AdminContentEdit [Contains period colors]
- `src/pages/AdminHomePage.tsx` - Component: AdminHomePage
- `src/pages/AdminTopics.tsx` - Component: AdminTopics
- `src/pages/AdminUsers.tsx` - Component: AdminUsers
- `src/pages/BookingPage.test.tsx` - Component

---

## ⚙️ Config & Utils

- `api/_lib/altegClient.ts` - Utilities/Config
- `api/_lib/assistantGemini.ts` - Utilities/Config
- `api/_lib/assistantQuota.ts` - Utilities/Config
- `api/_lib/assistantValidation.ts` - Utilities/Config
- `api/_lib/booksHelpers.ts` - Utilities/Config
- `api/_lib/lectureAnswer.ts` - Utilities/Config
- `api/_lib/lectureApiRuntime.ts` - Utilities/Config
- `api/_lib/lectureFallback.ts` - Utilities/Config
- `api/_lib/lectureRetrieval.ts` - Utilities/Config
- `api/_lib/papersAllowList.ts` - Utilities/Config
- `api/_lib/papersNormalization.ts` - Utilities/Config
- `api/_lib/papersScoring.ts` - Utilities/Config
- `api/_lib/papersTranslation.ts` - Utilities/Config
- `api/_lib/papersWikidata.ts` - Utilities/Config
- `functions/src/billingBudgetAlert.ts` - Utilities/Config

---

## 🔍 Next Steps

1. Check files marked with [Contains period colors] for color definitions
2. Check files marked with [References CSV files] for data loading logic
3. Review components in `src/pages/` to understand routing
4. Check `src/constants/` for any hardcoded data


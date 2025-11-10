# 🗺️ Project Structure Map

Generated: 2025-11-10T07:37:38.227Z

## 📊 Summary

- **Data files**: 14
- **Components**: 98
- **Config/Utils**: 76
- **Total analyzed**: 221

---

## 📁 Data Files (CSV, JSON)

- `.claude/settings.local.json` (34 lines, 1.0KB) - Data storage
- `firebase.json` (14 lines, 0.2KB) - Data storage
- `firestore.indexes.json` (31 lines, 0.8KB) - Data storage
- `functions/package-lock.json` (4542 lines, 157.5KB) - Data storage
- `functions/package.json` (21 lines, 0.4KB) - Data storage
- `functions/tsconfig.json` (12 lines, 0.2KB) - Data storage
- `logs/lighthouse-timeline.json` (26181 lines, 1044.8KB) - Data storage
- `package-lock.json` (15608 lines, 546.3KB) - Data storage
- `package.json` (76 lines, 2.9KB) - Data storage
- `public/icons/icons.json` (202 lines, 4.0KB) - Data storage
- `scripts/tsconfig.json` (10 lines, 0.2KB) - Data storage
- `tsconfig.json` (19 lines, 0.4KB) - Data storage
- `vercel.json` (13 lines, 0.2KB) - Data storage
- `verification-diff.json` (72 lines, 1.3KB) - Data storage

---

## 🎨 Files mentioning colors/periods

- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]
- `scripts/migrateAuthorsTests.ts` - [Contains period colors]
- `shared/verifyCore.ts` - Utilities/Config [Contains period colors]
- `src/App.jsx` - Component: App [Contains period colors] [References CSV files]
- `src/components/NotesFilter.tsx` - [Contains period colors]
- `src/components/UserMenu.tsx` - Component: UserMenu [Contains period colors]
- `src/components/tests/TestCard.tsx` - [Contains period colors]
- `src/components/tests/TestIntroScreen.tsx` - [Contains period colors]
- `src/components/tests/TestQuestionScreen.tsx` - [Contains period colors]
- `src/components/tests/TestResultsScreen.tsx` - [Contains period colors]
- `src/components/tests/editor/hooks/useTestTheme.ts` - Utilities/Config [Contains period colors]
- `src/components/ui/BackToTop.jsx` - [Contains period colors]
- `src/components/ui/Button.jsx` - [Contains period colors]
- `src/constants/periods.ts` - Utilities/Config [Contains period colors]
- `src/pages/Admin.tsx` - Component: Admin [Contains period colors]
- `src/pages/AdminContent.tsx` - Component: AdminContent [Contains period colors]
- `src/pages/AdminContentEdit.tsx` - Component: AdminContentEdit [Contains period colors]
- `src/pages/DynamicTest.tsx` - Component: DynamicTest [Contains period colors]
- `src/pages/Notes.tsx` - Component: Notes [Contains period colors]
- `src/pages/admin/content-editor/components/ContentThemeEditor.tsx` - [Contains period colors]
- `src/pages/admin/content-editor/hooks/useContentForm.ts` - Utilities/Config [Contains period colors]
- `src/pages/admin/content-editor/hooks/useContentLoader.ts` - Utilities/Config [Contains period colors]
- `src/pages/admin/content-editor/hooks/useContentSaver.ts` - Utilities/Config [Contains period colors]
- `src/pages/admin/content-editor/types.ts` - [Contains period colors]
- `src/pages/notes/components/NotesEmpty.tsx` - [Contains period colors]
- `src/pages/notes/components/NotesHeader.tsx` - [Contains period colors]
- `src/pages/notes/components/NotesList.tsx` - [Contains period colors]
- `src/pages/timeline/components/TimelineLeftPanel.tsx` - [Contains period colors]
- `src/theme/periods.ts` - Utilities/Config [Contains period colors]
- `src/types/content.ts` - [Contains period colors]
- `src/types/tests.ts` - Utilities/Config [Contains period colors]
- `src/utils/testAppearance.test.ts` - [Contains period colors]
- `src/utils/testAppearance.ts` - Utilities/Config [Contains period colors]

---

## 📄 Files referencing CSV

- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]
- `src/App.jsx` - Component: App [Contains period colors] [References CSV files]

---

## 🧩 Key Components

- `src/auth/RequireAdmin.tsx` - Component: RequireAdmin
- `src/components/AddAdminModal.tsx` - Component
- `src/components/SuperAdminBadge.tsx` - Component
- `src/components/tests/TestIntroScreen.tsx` - [Contains period colors]
- `src/pages/Admin.tsx` - Component: Admin [Contains period colors]
- `src/pages/AdminContent.tsx` - Component: AdminContent [Contains period colors]
- `src/pages/AdminContentEdit.tsx` - Component: AdminContentEdit [Contains period colors]
- `src/pages/AdminTopics.tsx` - Component: AdminTopics
- `src/pages/AdminUsers.tsx` - Component: AdminUsers
- `src/pages/ContentEditor.tsx` - Component: ContentEditor
- `src/pages/DynamicTest.tsx` - Component: DynamicTest [Contains period colors]
- `src/pages/Login.tsx` - Component: Login
- `src/pages/MigrateTopics.tsx` - Component: MigrateTopics
- `src/pages/Notes.tsx` - Component: Notes [Contains period colors]
- `src/pages/Profile.tsx` - Component: Profile
- `src/pages/TestsPage.tsx` - Component
- `src/pages/Timeline.tsx` - Component: Timeline
- `src/pages/UploadAsset.tsx` - Component: UploadAsset
- `src/pages/admin/content-editor/components/ContentActionsBar.tsx` - Component
- `src/pages/admin/content-editor/components/ContentAuthorsSection.tsx` - Component

---

## ⚙️ Config & Utils

- `functions/src/index.ts` - Utilities/Config
- `functions/src/makeAdmin.ts` - Utilities/Config
- `functions/src/migrateAdmins.ts` - Utilities/Config
- `functions/src/onUserCreate.ts` - Utilities/Config
- `scripts/_adminInit.ts` - Utilities/Config
- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]
- `shared/verifyCore.ts` - Utilities/Config [Contains period colors]
- `src/components/tests/editor/hooks/useTestEditorForm.ts` - Utilities/Config
- `src/components/tests/editor/hooks/useTestPrerequisite.ts` - Utilities/Config
- `src/components/tests/editor/hooks/useTestSave.ts` - Utilities/Config
- `src/components/tests/editor/hooks/useTestTheme.ts` - Utilities/Config [Contains period colors]
- `src/components/tests/modal/hooks/useTestDelete.ts` - Utilities/Config
- `src/components/tests/modal/hooks/useTestImportExport.ts` - Utilities/Config
- `src/components/tests/modal/hooks/useTestsFilters.ts` - Utilities/Config
- `src/components/tests/modal/hooks/useTestsList.ts` - Utilities/Config

---

## 🔍 Next Steps

1. Check files marked with [Contains period colors] for color definitions
2. Check files marked with [References CSV files] for data loading logic
3. Review components in `src/pages/` to understand routing
4. Check `src/constants/` for any hardcoded data


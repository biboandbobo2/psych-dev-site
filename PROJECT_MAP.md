# 🗺️ Project Structure Map

Generated: 2025-10-21T10:25:51.238Z

## 📊 Summary

- **Data files**: 12
- **Components**: 16
- **Config/Utils**: 9
- **Total analyzed**: 40

---

## 📁 Data Files (CSV, JSON)

- `firebase.json` (14 lines, 0.2KB) - Data storage
- `firestore.indexes.json` (5 lines, 0.0KB) - Data storage
- `functions/package-lock.json` (2764 lines, 100.4KB) - Data storage
- `functions/package.json` (18 lines, 0.3KB) - Data storage
- `functions/tsconfig.json` (12 lines, 0.2KB) - Data storage
- `package-lock.json` (13539 lines, 470.5KB) - Data storage
- `package.json` (65 lines, 2.4KB) - Data storage
- `public/content/intro.csv` (3 lines, 2.6KB) - Data storage
- `public/content/periods.csv` (223 lines, 59.1KB) - Data storage
- `public/scripts/transformed-periods.json` (222 lines, 6.4KB) - Data storage [Contains period colors]
- `scripts/tsconfig.json` (10 lines, 0.2KB) - Data storage
- `tsconfig.json` (19 lines, 0.4KB) - Data storage

---

## 🎨 Files mentioning colors/periods

- `public/scripts/transformed-periods.json` - Data storage [Contains period colors]
- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]
- `scripts/transformCSV.ts` - [Contains period colors] [References CSV files]
- `src/App.jsx` - Component: App [Contains period colors] [References CSV files]
- `src/components/ui/BackToTop.jsx` - [Contains period colors]
- `src/components/ui/Button.jsx` - [Contains period colors]
- `src/constants/periods.ts` - Utilities/Config [Contains period colors]
- `src/lib/csvParser.ts` - [Contains period colors]
- `src/pages/Admin.tsx` - Component: Admin [Contains period colors]
- `src/pages/AdminImport.tsx` - Component: AdminImport [Contains period colors] [References CSV files]
- `src/theme/periods.ts` - Utilities/Config [Contains period colors]
- `src/types/content.ts` - [Contains period colors]

---

## 📄 Files referencing CSV

- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]
- `scripts/transformCSV.ts` - [Contains period colors] [References CSV files]
- `src/App.jsx` - Component: App [Contains period colors] [References CSV files]
- `src/pages/AdminImport.tsx` - Component: AdminImport [Contains period colors] [References CSV files]

---

## 🧩 Key Components

- `src/auth/RequireAdmin.tsx` - Component: RequireAdmin
- `src/pages/Admin.tsx` - Component: Admin [Contains period colors]
- `src/pages/AdminImport.tsx` - Component: AdminImport [Contains period colors] [References CSV files]
- `src/pages/AdminUsers.tsx` - Component: AdminUsers
- `src/pages/Login.tsx` - Component: Login
- `src/pages/UploadAsset.tsx` - Component: UploadAsset

---

## ⚙️ Config & Utils

- `functions/src/index.ts` - Utilities/Config
- `scripts/analyze-project.ts` - Utilities/Config [Contains period colors] [References CSV files]
- `src/constants/periods.ts` - Utilities/Config [Contains period colors]
- `src/hooks/usePeriods.ts` - Utilities/Config
- `src/lib/cloudFunctions.ts` - Utilities/Config
- `src/lib/firebase.ts` - Utilities/Config
- `src/lib/firestoreHelpers.ts` - Utilities/Config
- `src/theme/backgrounds.ts` - Utilities/Config
- `src/theme/periods.ts` - Utilities/Config [Contains period colors]

---

## 🔍 Next Steps

1. Check files marked with [Contains period colors] for color definitions
2. Check files marked with [References CSV files] for data loading logic
3. Review components in `src/pages/` to understand routing
4. Check `src/constants/` for any hardcoded data


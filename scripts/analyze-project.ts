import fs from 'fs';
import path from 'path';

interface FileInfo {
  path: string;
  size: number;
  lines?: number;
  type: 'data' | 'component' | 'config' | 'style' | 'other';
  purpose?: string;
}

function analyzeFile(filePath: string): FileInfo | null {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').length;

    let type: FileInfo['type'] = 'other';
    let purpose: string | undefined;

    if (ext === '.csv' || ext === '.json') {
      type = 'data';
      purpose = 'Data storage';
    } else if (ext === '.tsx' || ext === '.jsx') {
      type = 'component';
      if (content.includes('export default')) {
        const match = content.match(/export default function (\w+)/);
        purpose = match ? `Component: ${match[1]}` : 'React component';
      }
    } else if (ext === '.ts' && !filePath.endsWith('.d.ts')) {
      if (content.includes('export const') || content.includes('export function')) {
        type = 'config';
        purpose = 'Utilities/Config';
      }
    } else if (ext === '.css' || ext === '.scss') {
      type = 'style';
      purpose = 'Styles';
    }

    if (content.includes('accent') || content.includes('period_color') || content.includes('PERIOD_COLORS')) {
      purpose = `${purpose ?? ''} [Contains period colors]`.trim();
    }

    if (content.includes('.csv') || content.includes('periods.csv') || content.includes('intro.csv')) {
      purpose = `${purpose ?? ''} [References CSV files]`.trim();
    }

    return {
      path: filePath.replace(`${process.cwd()}/`, ''),
      size: stats.size,
      lines,
      type,
      purpose,
    };
  } catch (error) {
    return null;
  }
}

function scanDirectory(dir: string, filter: (file: string) => boolean): FileInfo[] {
  const results: FileInfo[] = [];

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          scan(fullPath);
        }
      } else if (filter(fullPath)) {
        const info = analyzeFile(fullPath);
        if (info) {
          results.push(info);
        }
      }
    }
  }

  scan(dir);
  return results;
}

console.log('🔍 Analyzing project structure...\n');

const projectRoot = process.cwd();

const importantFiles = scanDirectory(projectRoot, (file) =>
  file.endsWith('.csv') ||
  file.endsWith('.json') ||
  (file.endsWith('.ts') && !file.endsWith('.d.ts')) ||
  file.endsWith('.tsx') ||
  file.endsWith('.jsx')
);

const byType: Record<string, FileInfo[]> = {
  data: [],
  component: [],
  config: [],
  style: [],
  other: [],
};

for (const file of importantFiles) {
  byType[file.type].push(file);
}

const report = `# 🗺️ Project Structure Map

Generated: ${new Date().toISOString()}

## 📊 Summary

- **Data files**: ${byType.data.length}
- **Components**: ${byType.component.length}
- **Config/Utils**: ${byType.config.length}
- **Total analyzed**: ${importantFiles.length}

---

## 📁 Data Files (CSV, JSON)

${byType.data
  .map((f) => `- \`${f.path}\` (${f.lines} lines, ${(f.size / 1024).toFixed(1)}KB)${f.purpose ? ` - ${f.purpose}` : ''}`)
  .join('\n')}

---

## 🎨 Files mentioning colors/periods

${
  importantFiles
    .filter((f) => f.purpose?.includes('color'))
    .map((f) => `- \`${f.path}\` - ${f.purpose}`)
    .join('\n') || 'None found'
}

---

## 📄 Files referencing CSV

${
  importantFiles
    .filter((f) => f.purpose?.includes('CSV'))
    .map((f) => `- \`${f.path}\` - ${f.purpose}`)
    .join('\n') || 'None found'
}

---

## 🧩 Key Components

${byType.component
  .filter((f) => f.path.includes('src/pages/') || f.path.includes('Period') || f.path.includes('Admin') || f.path.includes('Intro'))
  .slice(0, 20)
  .map((f) => `- \`${f.path}\` - ${f.purpose ?? 'Component'}`)
  .join('\n')}

---

## ⚙️ Config & Utils

${byType.config
  .slice(0, 15)
  .map((f) => `- \`${f.path}\` - ${f.purpose ?? 'Utilities'}`)
  .join('\n')}

---

## 🔍 Next Steps

1. Check files marked with [Contains period colors] for color definitions
2. Check files marked with [References CSV files] for data loading logic
3. Review components in \`src/pages/\` to understand routing
4. Check \`src/constants/\` for any hardcoded data

`;

fs.writeFileSync('PROJECT_MAP.md', report, 'utf-8');

console.log('✅ Project map created: PROJECT_MAP.md\n');

console.log('🎨 Files with period colors:');
importantFiles
  .filter((f) => f.purpose?.includes('color'))
  .forEach((f) => console.log(`  - ${f.path}`));

console.log('\n📄 Files referencing CSV:');
importantFiles
  .filter((f) => f.purpose?.includes('CSV'))
  .forEach((f) => console.log(`  - ${f.path}`));

console.log('\n📦 Data files:');
byType.data.forEach((f) => console.log(`  - ${f.path}`));

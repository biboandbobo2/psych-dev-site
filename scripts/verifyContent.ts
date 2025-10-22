import fs from 'fs';
import path from 'path';
import { initAdmin } from './_adminInit';
import {
  buildVerifyResult,
  expectedFromTransformedJson,
  loadActualBundle,
  type PeriodDoc,
} from '../shared/verifyCore';

async function main() {
  const { db, projectId } = initAdmin();
  console.log(`📡 Connected to Firestore project: ${projectId ?? '(ADC/SA)'}`);

  const expectedPath = path.resolve(process.cwd(), 'public/transformed-data.json');
  if (!fs.existsSync(expectedPath)) {
    throw new Error('public/transformed-data.json not found. Run npm run transform first.');
  }

  const expectedRaw = JSON.parse(fs.readFileSync(expectedPath, 'utf8')) as PeriodDoc[];
  const expectedBundle = expectedFromTransformedJson(expectedRaw);
  const actualBundle = await loadActualBundle(db);

  const verify = buildVerifyResult(expectedBundle, actualBundle);

  fs.writeFileSync('verification-report.md', verify.reportMd, 'utf8');
  fs.writeFileSync('verification-diff.json', JSON.stringify(verify.diffJson, null, 2), 'utf8');

  const summaries = verify.summaryPerPeriod;
  const periodsWithDiff = Object.values(summaries).filter((summary) => {
    if (summary.missingDocument) return true;
    const hasScalars = summary.scalarsMismatched.length > 0;
    const missing = Object.values(summary.missingInFirestore).some((count) => count > 0);
    const extra = Object.values(summary.extraInFirestore).some((count) => count > 0);
    return hasScalars || missing || extra;
  }).length;

  console.log('');
  console.log('📝 verification-report.md written');
  console.log('🗂  verification-diff.json written');
  console.log('');
  console.log(`Summary: ${Object.keys(summaries).length} periods checked`);
  console.log(`- Periods with differences: ${periodsWithDiff}`);
  console.log(`- Extra Firestore documents: ${verify.diffJson.extraDocuments.length}`);

  if (!periodsWithDiff && verify.diffJson.extraDocuments.length === 0) {
    console.log('✅ Firestore matches transformed-data.json');
  } else {
    Object.entries(summaries).forEach(([period, summary]) => {
      const issues: string[] = [];
      if (summary.missingDocument) issues.push('missing document');
      if (summary.scalarsMismatched.length) issues.push(`scalars: ${summary.scalarsMismatched.join(', ')}`);
      const missing = Object.entries(summary.missingInFirestore)
        .map(([field, count]) => `${field} +${count}`);
      const extra = Object.entries(summary.extraInFirestore)
        .map(([field, count]) => `${field} (${count} extra)`);
      if (missing.length) issues.push(`missing arrays: ${missing.join(', ')}`);
      if (extra.length) issues.push(`extra arrays: ${extra.join(', ')}`);
      if (issues.length) {
        console.log(`- ${period}: ${issues.join(' | ')}`);
      }
    });
    if (verify.diffJson.extraDocuments.length) {
      console.log('Extra documents:');
      verify.diffJson.extraDocuments.forEach((docId) => console.log(`  - periods/${docId}`));
    }
  }
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

import { useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { parsePeriodsCSV, parseIntroCSV } from '../../../../lib/csvParser';
import { db } from '../../../../lib/firebase';
import type { Period, IntroContent } from '../types';

/**
 * Hook for CSV file parsing and importing to Firestore
 */
export function useCSVImport() {
  const [periodsFile, setPeriodsFile] = useState<File | null>(null);
  const [introFile, setIntroFile] = useState<File | null>(null);
  const [periodsPreview, setPeriodsPreview] = useState<Period[]>([]);
  const [introPreview, setIntroPreview] = useState<IntroContent | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!periodsFile && !introFile) {
      setError('Please select at least one file');
      return;
    }

    try {
      setParsing(true);
      setError(null);
      setResult(null);

      if (periodsFile) {
        console.log('📄 Parsing periods.csv...');
        const periods = await parsePeriodsCSV(periodsFile);
        setPeriodsPreview(periods);
        console.log(`✅ Parsed ${periods.length} periods`);
      }

      if (introFile) {
        console.log('📄 Parsing intro.csv...');
        const intro = await parseIntroCSV(introFile);
        setIntroPreview(intro);
        console.log('✅ Parsed intro');
      }

      setResult(
        '✅ Files parsed successfully. Review the data below and click Import to save to Firestore.'
      );
    } catch (err: any) {
      console.error('❌ Parse error:', err);
      setError(`Parse error: ${err.message ?? err}`);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!periodsPreview.length && !introPreview) {
      setError('No data to import. Parse files first.');
      return;
    }

    if (
      !confirm(
        `Import ${periodsPreview.length} periods and ${introPreview ? 1 : 0} intro to Firestore?`
      )
    ) {
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setResult(null);

      const batch = writeBatch(db);
      let count = 0;

      for (const period of periodsPreview) {
        const docRef = doc(db, 'periods', period.period);
        batch.set(docRef, period, { merge: true });
        count += 1;
      }

      if (introPreview) {
        const docRef = doc(db, 'intro', 'singleton');
        batch.set(docRef, introPreview, { merge: true });
        count += 1;
      }

      await batch.commit();

      console.log(`✅ Imported ${count} documents`);
      setResult(`✅ Successfully imported ${count} documents to Firestore!`);

      // Reset state
      setPeriodsPreview([]);
      setIntroPreview(null);
      setPeriodsFile(null);
      setIntroFile(null);
    } catch (err: any) {
      console.error('❌ Import error:', err);
      setError(`Import error: ${err.message ?? err}`);
    } finally {
      setImporting(false);
    }
  };

  return {
    periodsFile,
    setPeriodsFile,
    introFile,
    setIntroFile,
    periodsPreview,
    introPreview,
    parsing,
    importing,
    result,
    error,
    setError,
    setResult,
    handleParse,
    handleImport,
  };
}

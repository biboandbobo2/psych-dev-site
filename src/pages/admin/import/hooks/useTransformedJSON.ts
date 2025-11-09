import { useState } from 'react';
import type { Period } from '../types';

/**
 * Hook for loading and processing transformed JSON data
 */
export function useTransformedJSON() {
  const [expectedBundle, setExpectedBundle] = useState<any | null>(null);

  const handleLoadTransformed = async (
    setPeriodsPreview: (periods: Period[]) => void,
    setIntroPreview: (intro: any) => void,
    setPeriodsFile: (file: File | null) => void,
    setIntroFile: (file: File | null) => void,
    setResult: (result: string) => void,
    setError: (error: string) => void
  ) => {
    try {
      setError('');
      setResult('');

      const response = await fetch('/transformed-data.json?_ts=' + Date.now());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      console.log('📄 Raw response length:', text.length);

      const periods = JSON.parse(text);
      console.log('📊 Parsed periods:', Array.isArray(periods) ? periods.length : 'not array');
      if (Array.isArray(periods) && periods.length) {
        console.log('📊 First period keys:', Object.keys(periods[0]));
      }

      if (!Array.isArray(periods)) {
        throw new Error('Response is not an array');
      }

      console.log('🔍 First 3 periods loaded:');
      periods.slice(0, 3).forEach((p: any) => {
        console.log(`  ${p.period}: accent=${p.accent}, accent100=${p.accent100}`);
      });

      setPeriodsPreview(periods);
      setIntroPreview(null);
      setPeriodsFile(null);
      setIntroFile(null);
      setResult(`✅ Loaded ${periods.length} periods from transformed JSON`);

      const intro = periods.find((p: any) => p.period === 'intro');
      const bundle = {
        periods: periods.filter((p: any) => p.period !== 'intro'),
        ...(intro ? { intro } : {}),
      };
      setExpectedBundle(bundle);
    } catch (err: any) {
      console.error('❌ JSON load error:', err);
      setError(`Failed to load JSON: ${err?.message ?? err}`);
    }
  };

  return {
    expectedBundle,
    handleLoadTransformed,
  };
}

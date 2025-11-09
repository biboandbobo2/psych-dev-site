import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../../lib/firebase';
import { downloadFile } from '../utils/fileHelpers';

/**
 * Hook for verify and reconcile operations
 */
export function useVerifyReconcile(expected: any) {
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<any | null>(null);

  const uploadExpected = async () => {
    try {
      setBusy(true);
      await setDoc(doc(db, 'admin', 'expectedData'), { updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'admin', 'expectedData', 'snapshots', 'latest'), {
        ...expected,
        uploadedAt: serverTimestamp(),
      });
      alert('Expected snapshot uploaded to admin/expectedData/snapshots/latest');
    } catch (error: any) {
      console.error('Upload expected failed', error);
      alert(`Upload failed: ${error?.message ?? error}`);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    try {
      const fn = httpsCallable(functions, 'runVerify');
      const res: any = await fn({ expected });
      const data = res.data ?? {};
      setLastSummary(data.summaryPerPeriod ?? null);
      if (data.reportMd) {
        downloadFile(data.reportMd, 'verification-report.md', 'text/markdown');
      }
      if (data.diffJson) {
        downloadFile(JSON.stringify(data.diffJson, null, 2), 'verification-diff.json', 'application/json');
      }
      alert('Verify completed');
    } catch (error: any) {
      console.error('runVerify failed', error);
      alert(`Verify error: ${error?.message ?? error}`);
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async (apply: boolean) => {
    setBusy(true);
    try {
      const fn = httpsCallable(functions, 'runReconcile');
      const res: any = await fn({ expected, apply });
      alert(`${apply ? 'Reconcile APPLY' : 'Reconcile DRY'} finished`);
      if (res.data?.plan) {
        console.log('Reconcile plan:', res.data.plan);
      }
    } catch (error: any) {
      console.error('runReconcile failed', error);
      alert(`Reconcile error: ${error?.message ?? error}`);
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    lastSummary,
    uploadExpected,
    handleVerify,
    handleReconcile,
  };
}

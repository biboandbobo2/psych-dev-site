import { useVerifyReconcile } from '../hooks/useVerifyReconcile';

interface VerifyReconcilePanelProps {
  expected: any;
}

/**
 * Panel for verify and reconcile operations
 */
export function VerifyReconcilePanel({ expected }: VerifyReconcilePanelProps) {
  const { busy, lastSummary, uploadExpected, handleVerify, handleReconcile } =
    useVerifyReconcile(expected);

  return (
    <div className="bg-white rounded-2xl shadow-brand border border-border/60 p-6 space-y-4">
      <h2 className="text-xl font-semibold">3. Verify & Reconcile</h2>
      <p className="text-sm text-muted">
        Upload the expected snapshot, then run verify to compare with Firestore or reconcile to apply
        fixes.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={uploadExpected}
          disabled={busy}
          className="px-3 py-2 rounded bg-blue-200 disabled:opacity-50"
        >
          ⬆️ Upload Expected
        </button>
        <button
          onClick={handleVerify}
          disabled={busy}
          className="px-3 py-2 rounded bg-gray-200 disabled:opacity-50"
        >
          ▶️ Run Verify
        </button>
        <button
          onClick={() => handleReconcile(false)}
          disabled={busy}
          className="px-3 py-2 rounded bg-yellow-200 disabled:opacity-50"
        >
          🧪 Reconcile (dry-run)
        </button>
        <button
          onClick={() => handleReconcile(true)}
          disabled={busy}
          className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
        >
          ✅ Reconcile (apply)
        </button>
      </div>

      {lastSummary && (
        <div className="bg-gray-50 border border-border/60 rounded-xl p-3 max-h-64 overflow-auto text-xs">
          <pre>{JSON.stringify(lastSummary, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

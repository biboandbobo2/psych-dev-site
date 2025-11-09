import { useCSVImport } from './admin/import/hooks/useCSVImport';
import { useTransformedJSON } from './admin/import/hooks/useTransformedJSON';
import { CSVImportForm, ImportPreview, VerifyReconcilePanel } from './admin/import/components';

/**
 * Admin page for importing CSV/JSON data to Firestore
 */
export default function AdminImport() {
  const csvImport = useCSVImport();
  const { expectedBundle, handleLoadTransformed } = useTransformedJSON();

  const onLoadTransformed = () => {
    handleLoadTransformed(
      csvImport.setPeriodsPreview,
      csvImport.setIntroPreview,
      csvImport.setPeriodsFile,
      csvImport.setIntroFile,
      csvImport.setResult,
      csvImport.setError
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📥 Import CSV to Firestore</h1>
        <p className="text-muted mt-2">
          Upload existing CSV snapshots, preview what will change, then write everything in one batch.
        </p>
      </div>

      <CSVImportForm
        periodsFile={csvImport.periodsFile}
        introFile={csvImport.introFile}
        parsing={csvImport.parsing}
        setPeriodsFile={csvImport.setPeriodsFile}
        setIntroFile={csvImport.setIntroFile}
        onParse={csvImport.handleParse}
        onLoadTransformed={onLoadTransformed}
      />

      {expectedBundle && <VerifyReconcilePanel expected={expectedBundle} />}

      {csvImport.error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {csvImport.error}
        </div>
      )}

      {csvImport.result && (
        <div className="rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-green-700">
          {csvImport.result}
        </div>
      )}

      <ImportPreview
        periodsPreview={csvImport.periodsPreview}
        introPreview={csvImport.introPreview}
        importing={csvImport.importing}
        onImport={csvImport.handleImport}
      />

      <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 space-y-2 text-sm text-yellow-800">
        <h3 className="font-semibold">📝 Instructions</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Select CSV files from <code>public/content/</code>.
          </li>
          <li>Click "Parse files" to preview the data.</li>
          <li>Verify the preview before importing.</li>
          <li>Click "Import to Firestore" to batch write all documents.</li>
          <li>The operation is idempotent – re-importing updates existing entries.</li>
        </ol>
      </div>
    </div>
  );
}

interface CSVImportFormProps {
  periodsFile: File | null;
  introFile: File | null;
  parsing: boolean;
  setPeriodsFile: (file: File | null) => void;
  setIntroFile: (file: File | null) => void;
  onParse: () => void;
  onLoadTransformed: () => void;
}

/**
 * CSV file upload form section
 */
export function CSVImportForm({
  periodsFile,
  introFile,
  parsing,
  setPeriodsFile,
  setIntroFile,
  onParse,
  onLoadTransformed,
}: CSVImportFormProps) {
  return (
    <div className="bg-white rounded-2xl shadow-brand border border-border/60 p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">1. Select CSV files</h2>
        <p className="text-sm text-muted">
          Use the latest exports from <code>public/content/periods.csv</code> and{' '}
          <code>public/content/intro.csv</code>.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">Periods CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setPeriodsFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-100 file:text-accent hover:file:bg-accent-100/80"
          />
          {periodsFile ? (
            <p className="text-sm text-accent mt-1">✓ {periodsFile.name}</p>
          ) : (
            <p className="text-xs text-muted mt-1">Optional if you only need Intro.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-2">Intro CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setIntroFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-100 file:text-accent hover:file:bg-accent-100/80"
          />
          {introFile ? (
            <p className="text-sm text-accent mt-1">✓ {introFile.name}</p>
          ) : (
            <p className="text-xs text-muted mt-1">Optional if you only need Periods.</p>
          )}
        </div>
      </div>

      <button
        onClick={onParse}
        disabled={parsing || (!periodsFile && !introFile)}
        className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
      >
        {parsing ? 'Parsing…' : 'Parse files'}
      </button>

      <div className="mt-4">
        <button
          onClick={onLoadTransformed}
          className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
        >
          📥 Load Transformed JSON
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { parsePeriodsCSV, parseIntroCSV } from "../lib/csvParser";
import { db, functions } from "../lib/firebase";
import type { Period, IntroContent } from "../types/content";

export default function AdminImport() {
  const [periodsFile, setPeriodsFile] = useState<File | null>(null);
  const [introFile, setIntroFile] = useState<File | null>(null);

  const [periodsPreview, setPeriodsPreview] = useState<Period[]>([]);
  const [introPreview, setIntroPreview] = useState<IntroContent | null>(null);
  const [expectedBundle, setExpectedBundle] = useState<any | null>(null);

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoadTransformed = async () => {
    try {
      setError(null);
      setResult(null);

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

  useEffect(() => {
    console.log('🔄 periodsPreview updated:', periodsPreview.length, 'periods');
    if (periodsPreview.length > 0) {
      console.log('   First period object:', periodsPreview[0]);
    }
  }, [periodsPreview]);

  const handleParse = async () => {
    if (!periodsFile && !introFile) {
      setError("Please select at least one file");
      return;
    }

    try {
      setParsing(true);
      setError(null);
      setResult(null);

      if (periodsFile) {
        console.log("📄 Parsing periods.csv...");
        const periods = await parsePeriodsCSV(periodsFile);
        setPeriodsPreview(periods);
        console.log(`✅ Parsed ${periods.length} periods`);
      }

      if (introFile) {
        console.log("📄 Parsing intro.csv...");
        const intro = await parseIntroCSV(introFile);
        setIntroPreview(intro);
        console.log("✅ Parsed intro");
      }

      setResult(
        "✅ Files parsed successfully. Review the data below and click Import to save to Firestore."
      );
    } catch (err: any) {
      console.error("❌ Parse error:", err);
      setError(`Parse error: ${err.message ?? err}`);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!periodsPreview.length && !introPreview) {
      setError("No data to import. Parse files first.");
      return;
    }

    if (!confirm(`Import ${periodsPreview.length} periods and ${introPreview ? 1 : 0} intro to Firestore?`)) {
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setResult(null);

      const batch = writeBatch(db);
      let count = 0;

      for (const period of periodsPreview) {
        const docRef = doc(db, "periods", period.period);
        batch.set(docRef, period, { merge: true });
        count += 1;
      }

      if (introPreview) {
        const docRef = doc(db, "intro", "singleton");
        batch.set(docRef, introPreview, { merge: true });
        count += 1;
      }

      await batch.commit();

      console.log(`✅ Imported ${count} documents`);
      setResult(`✅ Successfully imported ${count} documents to Firestore!`);

      setPeriodsPreview([]);
      setIntroPreview(null);
      setPeriodsFile(null);
      setIntroFile(null);
    } catch (err: any) {
      console.error("❌ Import error:", err);
      setError(`Import error: ${err.message ?? err}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📥 Import CSV to Firestore</h1>
        <p className="text-muted mt-2">
          Upload existing CSV snapshots, preview what will change, then write everything in one batch.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-brand border border-border/60 p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">1. Select CSV files</h2>
          <p className="text-sm text-muted">
            Use the latest exports from <code>public/content/periods.csv</code> and <code>public/content/intro.csv</code>.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Periods CSV
            </label>
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
            <label className="block text-sm font-medium text-muted mb-2">
              Intro CSV
            </label>
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
          onClick={handleParse}
          disabled={parsing || (!periodsFile && !introFile)}
          className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
        >
          {parsing ? "Parsing…" : "Parse files"}
        </button>

        <div className="mt-4">
          <button
            onClick={handleLoadTransformed}
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            📥 Load Transformed JSON
          </button>
        </div>
      </div>

      {expectedBundle && (
        <VerifyReconcilePanel expected={expectedBundle} />
      )}

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-green-700">
          {result}
        </div>
      )}

      {(periodsPreview.length || introPreview) && (
        <div className="bg-white rounded-2xl shadow-brand border border-border/60 p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">2. Preview data</h2>
              <p className="text-sm text-muted">Review parsed rows before writing to Firestore.</p>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
            >
              {importing ? "Importing…" : "Import to Firestore"}
            </button>
          </div>

          {periodsPreview.length ? (
            <div className="space-y-3">
              <h3 className="font-semibold">Periods ({periodsPreview.length})</h3>
              <div className="mb-4 p-3 bg-blue-50 rounded text-xs font-mono">
                <strong>Debug:</strong> periodsPreview[0] = {JSON.stringify(periodsPreview[0], null, 2)}
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-card2 text-muted uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Title</th>
                      <th className="px-3 py-2 text-left">Published</th>
                      <th className="px-3 py-2 text-left">Accent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodsPreview.map((period, index) => {
                      console.log(`Row ${index}:`, {
                        period: period.period,
                        title: period.title,
                        accent: period.accent,
                      });

                      return (
                        <tr key={period.period || index} className="border-t border-border/40">
                          <td className="px-4 py-3 text-sm">{period.period}</td>
                          <td className="px-4 py-3 text-sm">{period.title}</td>
                          <td className="px-4 py-3 text-sm">{period.published ? '✓' : '✗'}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full border-2 border-gray-300"
                                style={{ backgroundColor: period.accent }}
                                title={`${period.accent} / ${period.accent100}`}
                              ></div>
                              <span className="font-mono text-xs">{period.accent}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {introPreview ? (
            <div className="space-y-2">
              <h3 className="font-semibold">Intro</h3>
              <div className="rounded-xl border border-border/60 bg-card p-4 text-sm space-y-1">
                <p>
                  <strong>Title:</strong> {introPreview.title}
                </p>
                <p>
                  <strong>Published:</strong> {introPreview.published ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Accent:</strong> {introPreview.accent}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 space-y-2 text-sm text-yellow-800">
        <h3 className="font-semibold">📝 Instructions</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select CSV files from <code>public/content/</code>.</li>
          <li>Click "Parse files" to preview the data.</li>
          <li>Verify the preview before importing.</li>
          <li>Click "Import to Firestore" to batch write all documents.</li>
          <li>The operation is idempotent – re-importing updates existing entries.</li>
        </ol>
      </div>
    </div>
  );
}

function VerifyReconcilePanel({ expected }: { expected: any }) {
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<any | null>(null);

  const uploadExpected = async () => {
    try {
      setBusy(true);
      await setDoc(doc(db, 'admin', 'expectedData'), { updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(doc(db, 'admin', 'expectedData', 'snapshots', 'latest'), { ...expected, uploadedAt: serverTimestamp() });
      alert('Expected snapshot uploaded to admin/expectedData/snapshots/latest');
    } catch (error: any) {
      console.error('Upload expected failed', error);
      alert(`Upload failed: ${error?.message ?? error}`);
    } finally {
      setBusy(false);
    }
  };

  const download = (data: BlobPart, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleVerify = async () => {
    setBusy(true);
    try {
      const fn = httpsCallable(functions, 'runVerify');
      const res: any = await fn({ expected });
      const data = res.data ?? {};
      setLastSummary(data.summaryPerPeriod ?? null);
      if (data.reportMd) {
        download(data.reportMd, 'verification-report.md', 'text/markdown');
      }
      if (data.diffJson) {
        download(JSON.stringify(data.diffJson, null, 2), 'verification-diff.json', 'application/json');
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

  return (
    <div className="bg-white rounded-2xl shadow-brand border border-border/60 p-6 space-y-4">
      <h2 className="text-xl font-semibold">3. Verify & Reconcile</h2>
      <p className="text-sm text-muted">
        Upload the expected snapshot, then run verify to compare with Firestore or reconcile to apply fixes.
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

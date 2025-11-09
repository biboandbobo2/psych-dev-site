import { useEffect } from 'react';
import type { Period, IntroContent } from '../types';

interface ImportPreviewProps {
  periodsPreview: Period[];
  introPreview: IntroContent | null;
  importing: boolean;
  onImport: () => void;
}

/**
 * Preview of parsed data before import
 */
export function ImportPreview({
  periodsPreview,
  introPreview,
  importing,
  onImport,
}: ImportPreviewProps) {
  useEffect(() => {
    console.log('🔄 periodsPreview updated:', periodsPreview.length, 'periods');
    if (periodsPreview.length > 0) {
      console.log('   First period object:', periodsPreview[0]);
    }
  }, [periodsPreview]);

  if (!periodsPreview.length && !introPreview) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-brand border border-border/60 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">2. Preview data</h2>
          <p className="text-sm text-muted">Review parsed rows before writing to Firestore.</p>
        </div>
        <button
          onClick={onImport}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-border disabled:text-muted disabled:cursor-not-allowed"
        >
          {importing ? 'Importing…' : 'Import to Firestore'}
        </button>
      </div>

      {periodsPreview.length > 0 && (
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
      )}

      {introPreview && (
        <div className="space-y-2">
          <h3 className="font-semibold">Intro</h3>
          <div className="rounded-xl border border-border/60 bg-card p-4 text-sm space-y-1">
            <p>
              <strong>Title:</strong> {introPreview.title}
            </p>
            <p>
              <strong>Published:</strong> {introPreview.published ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Accent:</strong> {introPreview.accent}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

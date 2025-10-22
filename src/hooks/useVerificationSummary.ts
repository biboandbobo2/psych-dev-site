import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export type VerificationSummary = Record<string, {
  scalarsMismatched?: string[];
  missingInFirestore?: Record<string, number>;
  extraInFirestore?: Record<string, number>;
  missingDocument?: boolean;
}>;

export function useVerificationSummary(): VerificationSummary | null {
  const [summary, setSummary] = useState<VerificationSummary | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "admin", "verification"), (snap) => {
      const latest = snap.data()?.latest;
      setSummary((latest?.summaryPerPeriod ?? null) as VerificationSummary | null);
    });
    return () => unsub();
  }, []);

  return summary;
}

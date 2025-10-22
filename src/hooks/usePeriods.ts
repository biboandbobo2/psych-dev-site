import { useState, useEffect } from "react";
import type { Period } from "../types/content";
import { getAllPeriods, getPublishedPeriods, getPeriod } from "../lib/firestoreHelpers";

export function usePeriods(publishedOnly: boolean = false) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = publishedOnly ? await getPublishedPeriods() : await getAllPeriods();
        setPeriods(data);
      } catch (err: any) {
        console.error("Error loading periods:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPeriods();
  }, [publishedOnly]);

  return { periods, loading, error, refresh: () => {} };
}

export function usePeriod(periodId: string | undefined) {
  const [period, setPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!periodId) {
      setLoading(false);
      return;
    }

    const loadPeriod = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getPeriod(periodId);
        setPeriod(data);
      } catch (err: any) {
        console.error("Error loading period:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPeriod();
  }, [periodId]);

  return { period, loading, error };
}

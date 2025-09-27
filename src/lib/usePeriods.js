import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const CSV_URL = '/content/periods.csv';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trim = (value) => (typeof value === 'string' ? value.trim() : '');

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse JSON payload from CSV row', value, error);
    return value;
  }
};

export function usePeriods() {
  const [rawRows, setRawRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить periods.csv (${response.status})`);
        }

        const text = await response.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });

        if (parsed.errors?.length) {
          console.warn('Papaparse detected issues', parsed.errors);
        }

        if (!cancelled) {
          setRawRows(parsed.data ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const periods = useMemo(() => {
    if (!rawRows.length) return [];

    const periodMap = new Map();

    for (const row of rawRows) {
      const periodId = trim(row.period_id);
      const sectionId = trim(row.section_id);
      const deckUrl = trim(row.deck_url);

      if (!periodId || !sectionId) continue;

      const period = (() => {
        if (!periodMap.has(periodId)) {
          periodMap.set(periodId, {
            id: periodId,
            label: trim(row.period_label) || periodId,
            order: toNumber(row.period_order),
            sections: new Map(),
            deckUrl: deckUrl,
          });
        }
        const stored = periodMap.get(periodId);
        if (!stored.deckUrl && deckUrl) {
          stored.deckUrl = deckUrl;
        }
        return stored;
      })();

      const section = (() => {
        const key = sectionId;
        if (!period.sections.has(key)) {
          period.sections.set(key, {
            key,
            title: trim(row.section_title) || key,
            order: toNumber(row.section_order),
            items: [],
          });
        }
        return period.sections.get(key);
      })();

      if (row.content_type === 'object') {
        section.items.push({
          order: toNumber(row.item_order),
          value: safeParse(row.content_value ?? '{}'),
        });
      } else if (row.content_type === 'string') {
        section.items.push({
          order: toNumber(row.item_order),
          value: row.content_value ?? '',
        });
      } else {
        // fallback: keep raw value
        section.items.push({
          order: toNumber(row.item_order),
          value: row.content_value,
        });
      }
    }

    return Array.from(periodMap.values())
      .sort((a, b) => a.order - b.order)
      .map((period) => ({
        id: period.id,
        label: period.label,
        sections: Array.from(period.sections.values())
          .sort((a, b) => a.order - b.order)
          .reduce((acc, section) => {
          acc[section.key] = {
            title: section.title,
            content: section.items
              .sort((a, b) => a.order - b.order)
              .map((item) => item.value),
          };
          return acc;
        }, {}),
        deckUrl: period.deckUrl ? period.deckUrl : '',
      }));
  }, [rawRows]);

  return { periods, loading, error };
}

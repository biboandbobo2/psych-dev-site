// File: src/lib/usePeriods.js
import { useMemo } from "react";
import Papa from "papaparse";
import csvRaw from "../../content/periods.csv?raw"; // путь: src/lib → ../../content

const SLUGS = [
  "prenatal",
  "infancy",
  "toddler",
  "preschool",
  "school",
  "earlyAdolescence",
  "adolescence",
  "emergingAdult",
  "earlyAdult",
  "midlife",
  "lateAdult",
  "oldestOld",
];

export function usePeriods() {
  return useMemo(() => {
    const { data } = Papa.parse(csvRaw, {
      header: true,
      skipEmptyLines: true,

      /** убираем NBSP и тримим заголовки */
      transformHeader: (h) =>
        h
          .replace(/\u00A0/g, " ") // NBSP → обычный пробел
          .trim(),

      /** тримим каждую ячейку */
      transform: (v) => (v == null ? "" : String(v).trim()),
    });

    // базовая структура
    const map = Object.fromEntries(
      SLUGS.map((slug) => [slug, { slug, label: slug, data: {}, format: {} }])
    );

    data.forEach((row) => {
      const rubricRaw = row.rubric || row[""]; // после transformHeader "" не случится
      if (!rubricRaw) return;

      if (rubricRaw === "label") {
        SLUGS.forEach((s) => {
          if (row[s]) map[s].label = row[s];
        });
        return;
      }

      const isFmt = rubricRaw.endsWith("_format");
      const rubric = isFmt ? rubricRaw.replace("_format", "") : rubricRaw;

      SLUGS.forEach((slug) => {
        const val = row[slug];
        if (!val) return;
        if (isFmt) map[slug].format[rubric] = val;
        else map[slug].data[rubric] = val;
      });
    });

    // возвращаем массив строго в нужном порядке
    return SLUGS.map((s) => map[s]);
  }, []);
}

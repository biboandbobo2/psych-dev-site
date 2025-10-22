import Papa from "papaparse";
import type { Period, IntroContent, Author, ContentLink } from "../types/content";
import { PERIOD_COLORS } from "../constants/periods";

function parseAuthors(str: string | undefined): Author[] {
  if (!str) return [];

  return str
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [name, url] = pair.split("::").map((s) => s.trim());
      return { name: name || "", url: url || undefined };
    })
    .filter((author) => author.name);
}

function parseLinks(str: string | undefined): ContentLink[] {
  if (!str) return [];

  return str
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [title, url] = pair.split("::").map((s) => s.trim());
      return { title: title || "", url: url || "" };
    })
    .filter((link) => link.title && link.url);
}

function parseArray(str: string | undefined): string[] {
  if (!str) return [];
  return str
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function csvRowToPeriod(row: any): Period {
  const periodId = row.period || row.Period || "";
  const colors = PERIOD_COLORS[periodId] || PERIOD_COLORS.intro;

  return {
    period: periodId,
    title: row.title || row.Title || "",
    subtitle: row.subtitle || row.Subtitle || "",
    video_url: row.video_url || row.VideoURL || row["Video URL"] || undefined,
    concepts: parseArray(row.concepts || row.Concepts),
    authors: parseAuthors(row.authors || row.Authors),
    core_literature: parseLinks(row.core_literature || row.CoreLiterature || row["Core Literature"]),
    extra_literature: parseLinks(row.extra_literature || row.ExtraLiterature || row["Extra Literature"]),
    extra_videos: parseLinks(row.extra_videos || row.ExtraVideos || row["Extra Videos"]),
    self_questions_url:
      row.self_questions_url || row.SelfQuestionsURL || row["Self Questions URL"] || undefined,
    deck_url: row.deck_url || row.DeckURL || row["Deck URL"] || undefined,
    accent: row.accent || colors.accent,
    accent100: row.accent100 || colors.accent100,
    background: row.background || row.Background || undefined,
    published: row.published === "true" || row.published === true || row.Published === "true",
    order: row.order ? parseInt(row.order, 10) : undefined,
  };
}

export async function parsePeriodsCSV(file: File): Promise<Period[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          const periods = (results.data as any[]).map((row) => csvRowToPeriod(row));
          resolve(periods);
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export async function parseIntroCSV(file: File): Promise<IntroContent> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          if (!results.data.length) {
            reject(new Error("Empty CSV file"));
            return;
          }
          const row = results.data[0] as any;
          const intro = csvRowToPeriod(row) as IntroContent;
          intro.period = "intro";
          resolve(intro);
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

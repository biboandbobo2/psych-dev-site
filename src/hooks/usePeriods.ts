import { useMemo } from 'react';
import Papa from 'papaparse';
import csvRaw from '../../content/periods.csv?raw';

interface Quiz {
  type: string;
  q: string;
  options: string[];
  answerIndex: number;
}

interface Period {
  slug: string;
  title: string;
  video?: string;
  concepts: string[];
  authors: string[];
  coreRead?: string;
  extraVideo?: string;
  quiz: Quiz | null;
}

const sanitize  = (s = '') => s.replace(/[\[\]"]/g, '').trim();
const parseList = (s?: string) =>
  sanitize(s).split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
const parseVideo = (s?: string) => sanitize(s);

const parseQuiz = (s?: string): Quiz | null => {
  try {
    const q = JSON.parse(s || '');
    return q && q.q && q.options ? q as Quiz : null;
  } catch {
    return null;
  }
};

export function usePeriods(): Period[] {
  return useMemo(() => {
    const { data, meta } = Papa.parse<Record<string, string>>(csvRaw, {
      header: true,
      skipEmptyLines: true,
    });
    const slugs = meta.fields?.slice(1) || [];
    const periods: Record<string, Partial<Period>> = {};
    slugs.forEach(slug => {
      periods[slug] = { slug, title: '', concepts: [], authors: [], quiz: null };
    });

    data.forEach(row => {
      const rubric = row.rubric;
      slugs.forEach(slug => {
        const val = row[slug] || '';
        const p = periods[slug]!;
        switch (rubric) {
          case 'label':
            p.title = val;
            break;
          case 'video':
            p.video = val;
            break;
          case 'concepts':
            p.concepts = parseList(val);
            break;
          case 'authors':
            p.authors = parseList(val);
            break;
          case 'coreRead':
            p.coreRead = val;
            break;
          case 'extraVideo':
            p.extraVideo = parseVideo(val);
            break;
          case 'quiz':
            p.quiz = parseQuiz(val);
            break;
        }
      });
    });

    return slugs.map(slug => periods[slug] as Period);
  }, []);
}

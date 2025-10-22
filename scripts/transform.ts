import fs from 'fs';
import Papa from 'papaparse';

type Link = { title: string; url: string };
type Author = { name: string; url?: string };
type LeisureItem = { title: string; url?: string; type?: string; year?: string };
type VideoEntry = { title: string; url: string; deckUrl?: string; audioUrl?: string };

interface Period {
  period: string;
  title: string;
  subtitle: string;
  video_url?: string;
  audio_url?: string;
  video_playlist: VideoEntry[];
  concepts: string[];
  authors: Author[];
  core_literature: Link[];
  extra_literature: Link[];
  extra_videos: Link[];
  leisure: LeisureItem[];
  self_questions_url?: string;
  deck_url?: string;
  accent: string;
  accent100: string;
  background?: string;
  published: boolean;
  order: number;
}

const PERIOD_THEME: Record<string, { accent: string; accent100: string }> = {
  intro: { accent: '#C58F12', accent100: '#FFF4DA' },
  prenatal: { accent: '#2F9683', accent100: '#E6F2F0' },
  infancy: { accent: '#2E7D32', accent100: '#E5EFE6' },
  toddler: { accent: '#5C6BC0', accent100: '#EBEDF7' },
  preschool: { accent: '#FB8C00', accent100: '#FEF0DD' },
  school: { accent: '#26A69A', accent100: '#E4F4F2' },
  school1: { accent: '#26A69A', accent100: '#E4F4F2' },
  earlyAdolescence: { accent: '#5E35B1', accent100: '#EBE6F5' },
  adolescence: { accent: '#D81B60', accent100: '#FAE3EB' },
  emergingAdult: { accent: '#1E88E5', accent100: '#E4F0FB' },
  earlyAdult: { accent: '#43A047', accent100: '#E8F3E8' },
  midlife: { accent: '#6D4C41', accent100: '#EDE9E8' },
  lateAdult: { accent: '#607D8B', accent100: '#EBEFF1' },
  oldestOld: { accent: '#8D6E63', accent100: '#F1EDEC' },
};

function getPeriodTheme(periodId: string) {
  return PERIOD_THEME[periodId] || PERIOD_THEME.intro;
}

function cleanText(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
}

function parseJSONValue(value: string): any {
  if (!value || value === '""' || value === '') return null;
  const attempt = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const direct = attempt(value);
  if (direct !== null) {
    return direct;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const inner = trimmed.slice(1, -1);
    const repaired = inner.replace(/""/g, '"');
    const result = attempt(repaired);
    if (result !== null) {
      return result;
    }
  }

  return null;
}

function ensureArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

function pickFirst<T>(...items: (T | undefined)[]): T | undefined {
  return items.find((item) => item !== undefined && item !== null);
}

interface CSVRow {
  [key: string]: string;
}

function transformPeriodsCSV(csvPath: string): Period[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const { data } = Papa.parse<CSVRow>(csvContent, {
    header: false,
    delimiter: ';',
    skipEmptyLines: true,
    quoteChar: '"',
  });

  console.log(`📄 Total CSV rows: ${data.length}`);

  const grouped = new Map<string, CSVRow[]>();

  for (const row of data) {
    const periodId = cleanText(row[0]);
    if (!periodId || periodId === 'intro' || periodId === 'period_id') continue;

    if (!grouped.has(periodId)) grouped.set(periodId, []);
    grouped.get(periodId)!.push(row);
  }

  console.log(`📊 Unique periods: ${grouped.size}`);
  console.log(`📊 Period IDs: ${Array.from(grouped.keys()).join(', ')}`);

  const periods: Period[] = [];
  let order = 1;

  for (const [periodId, rows] of grouped.entries()) {
    const firstRow = rows[0];
    const theme = getPeriodTheme(periodId);

    const period: Period = {
      period: periodId,
      title: cleanText(firstRow[1]) || periodId,
      subtitle: '',
      video_url: undefined,
      audio_url: undefined,
      video_playlist: [],
      concepts: [],
      authors: [],
      core_literature: [],
      extra_literature: [],
      extra_videos: [],
      leisure: [],
      self_questions_url: undefined,
      deck_url: undefined,
      accent: theme.accent,
      accent100: theme.accent100,
      background: undefined,
      published: true,
      order: order++,
    };

    console.log(`\n🔄 Processing ${periodId}...`);

    for (const row of rows) {
      const sectionTitle = cleanText(row[4]).toLowerCase();
      const contentType = cleanText(row[7]).toLowerCase();
      const contentValue = row[8] || '';

      if (!sectionTitle && !contentValue) continue;

      const obj = parseJSONValue(contentValue);

      if (sectionTitle.includes('видео-лекция')) {
        if (obj) {
          const title = cleanText(obj.title) || cleanText(obj.label) || period.title;
          const url = cleanText(obj.url ?? obj.videoUrl ?? obj.src);
          const deckUrl = cleanText(obj.deckUrl ?? obj.deck_url);
          const audioUrl = cleanText(obj.audioUrl ?? obj.audio_url);

          if (url) {
            const entry: VideoEntry = {
              title: title || period.title,
              url,
              ...(deckUrl ? { deckUrl } : {}),
              ...(audioUrl ? { audioUrl } : {}),
            };
            period.video_playlist.push(entry);
          }

          if (!period.video_url && url) {
            period.video_url = url;
            if (deckUrl) period.deck_url = deckUrl;
            if (audioUrl) period.audio_url = audioUrl;
          }
        }
      } else if (sectionTitle.includes('понятия')) {
        if (contentType === 'string') {
          const text = cleanText(contentValue);
          if (text) period.concepts.push(text);
        } else if (obj) {
          ensureArray(obj.items || obj).forEach((item: any) => {
            const name = typeof item === 'string' ? item : item?.title;
            if (name) period.concepts.push(name);
          });
        }
      } else if (sectionTitle.includes('ключевые авторы')) {
        if (obj && obj.title) {
          period.authors.push({ name: obj.title, url: obj.url || obj.link || undefined });
        } else {
          const text = cleanText(contentValue);
          if (text) period.authors.push({ name: text });
        }
      } else if (sectionTitle.includes('основная литература')) {
        if (obj && obj.title && obj.url) {
          period.core_literature.push({ title: obj.title, url: obj.url });
        }
      } else if (sectionTitle.includes('доп. литература')) {
        if (obj && obj.title && obj.url) {
          period.extra_literature.push({ title: obj.title, url: obj.url });
        }
      } else if (sectionTitle.includes('современные исследования') || sectionTitle.includes('совмещённые исследования') || sectionTitle.includes('экспериментальная психология')) {
        if (obj && obj.title && obj.url) {
          period.extra_literature.push({ title: obj.title, url: obj.url });
        }
      } else if (sectionTitle.includes('доп. видео') || sectionTitle.includes('доп. лекции')) {
        if (obj && obj.title && obj.url) {
          period.extra_videos.push({ title: obj.title, url: obj.url });
        }
      } else if (sectionTitle.includes('досугов')) {
        if (obj && obj.title) {
          const leisureItem: LeisureItem = {
            title: obj.title,
            url: obj.url || obj.link || undefined,
            type: obj.type || obj.category || undefined,
            year: obj.year ? String(obj.year) : undefined,
          };
          period.leisure.push(leisureItem);
        } else {
          const text = cleanText(contentValue);
          if (text) {
            period.leisure.push({ title: text });
          }
        }
      } else if (sectionTitle.includes('рабочая тетрадь') || sectionTitle.includes('вопросы для контакта') || sectionTitle.includes('квиз')) {
        if (obj && obj.url) {
          period.self_questions_url = pickFirst(obj.url, period.self_questions_url);
        }
      }
    }

    console.log(`  ✅ ${periodId}: Video=${period.video_url ? 'yes' : 'no'}, Audio=${period.audio_url ? 'yes' : 'no'}, Deck=${period.deck_url ? 'yes' : 'no'}`);
    console.log(`     Concepts=${period.concepts.length}, Authors=${period.authors.length}, CoreLit=${period.core_literature.length}, ExtraLit=${period.extra_literature.length}, ExtraVideos=${period.extra_videos.length}, Leisure=${period.leisure.length}, SelfCheck=${period.self_questions_url ? 'yes' : 'no'}`);

    periods.push(period);
  }

  return periods;
}

function splitPipe(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split('|')
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function parseAuthorList(value: string | undefined): Author[] {
  return splitPipe(value).map((item) => {
    const [rawName, ...rest] = item.split('::');
    const name = cleanText(rawName);
    const url = cleanText(rest.join('::'));
    return url ? { name, url } : { name };
  }).filter((author) => Boolean(author.name));
}

function parseLinkList(value: string | undefined): Link[] {
  return splitPipe(value)
    .map((item) => {
      const [rawTitle, ...rest] = item.split('::');
      const title = cleanText(rawTitle);
      const url = cleanText(rest.join('::'));
      if (!title) return null;
      return url ? { title, url } : { title, url: '' };
    })
    .filter((link): link is Link => Boolean(link?.title && link?.url));
}

function parseIntroCSV(csvPath: string): Period | null {
  if (!fs.existsSync(csvPath)) {
    console.log('⚠️  intro.csv not found');
    return null;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
  });

  if (!parsed.data.length) {
    console.log('⚠️  intro.csv is empty');
    return null;
  }

  const row = parsed.data[0];
  const theme = getPeriodTheme('intro');

  const videoUrl = cleanText(row.video_url);
  const deckUrl = cleanText(row.deck_url);
  const selfQuestionsUrl = cleanText(row.self_questions_url);

  const videoPlaylist: VideoEntry[] = [];
  if (videoUrl) {
    videoPlaylist.push({
      title: 'Введение',
      url: videoUrl,
      ...(deckUrl ? { deckUrl } : {}),
    });
  }

  return {
    period: 'intro',
    title: 'Введение',
    subtitle: '',
    video_url: videoUrl || undefined,
    audio_url: undefined,
    video_playlist: videoPlaylist,
    concepts: splitPipe(row.concepts),
    authors: parseAuthorList(row.authors),
    core_literature: parseLinkList(row.core_literature),
    extra_literature: parseLinkList(row.extra_literature),
    extra_videos: parseLinkList(row.extra_videos),
    self_questions_url: selfQuestionsUrl || undefined,
    deck_url: deckUrl || undefined,
    accent: theme.accent,
    accent100: theme.accent100,
    background: undefined,
    published: true,
    order: 0,
  };
}

console.log('🚀 Starting COMPLETE transformation...\n');
try {
  const allPeriods: Period[] = [];

  console.log('📖 Parsing intro...');
  const intro = parseIntroCSV('public/content/intro.csv');
  if (intro) allPeriods.push(intro);

  console.log('\n📚 Parsing periods.csv...');
  const periods = transformPeriodsCSV('public/content/periods.csv');
  allPeriods.push(...periods);

  fs.writeFileSync('public/transformed-data.json', JSON.stringify(allPeriods, null, 2), 'utf-8');

  console.log(`\n✅ SUCCESS!`);
  console.log(`📊 Total periods: ${allPeriods.length}`);
  console.log(`📂 Saved to: public/transformed-data.json`);

  let totalConcepts = 0;
  let totalAuthors = 0;
  let totalLit = 0;
  let totalVideos = 0;
  let totalLeisure = 0;

  console.log(`\n🎨 Final Summary:`);
  allPeriods.forEach((p) => {
    const litCount = p.core_literature.length + p.extra_literature.length;
    const playlist = Array.isArray(p.video_playlist) ? p.video_playlist : [];
    const primaryVideos = playlist.length
      ? playlist.length
      : p.video_url
      ? 1
      : 0;
    const videoCount = p.extra_videos.length + primaryVideos;
    const leisureCount = p.leisure?.length ?? 0;
    totalConcepts += p.concepts.length;
    totalAuthors += p.authors.length;
    totalLit += litCount;
    totalVideos += videoCount;
    totalLeisure += leisureCount;

    console.log(`  ${p.period.padEnd(18)} ${p.accent} - ${p.title}`);
    console.log(`    └─ concepts=${p.concepts.length}, authors=${p.authors.length}, lit=${litCount}, videos=${videoCount}, leisure=${leisureCount}`);
  });

  console.log(`\n📈 TOTALS: ${totalConcepts} concepts, ${totalAuthors} authors, ${totalLit} literature items, ${totalVideos} videos, ${totalLeisure} leisure picks`);
} catch (err: any) {
  console.error(`\n❌ Error:`, err.message);
  console.error(err.stack);
  process.exit(1);
}

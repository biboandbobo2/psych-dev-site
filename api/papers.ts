/* Serverless endpoint: GET /api/papers
 * Fetches open-access works from OpenAlex, applies allow-list filtering,
 * basic paragraph reconstruction, and per-IP rate limiting.
 */
import type { IncomingMessage } from 'node:http';
import { createRequire } from 'node:module';

// ============================================================================
// INLINE WIKIDATA & QUERY VARIANTS (standalone, no src/ dependencies)
// ============================================================================

type WikidataSearchResult = {
  id: string;
  label?: string;
  description?: string;
};

type WikidataEntity = {
  id: string;
  labels: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
};

type QueryVariantSource = {
  variant: string;
  lang: string;
  source: 'wikidata' | 'original';
};

class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  constructor(private readonly ttlMs: number) {}
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  set(key: string, value: T) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

const SEARCH_CACHE = new TtlCache<WikidataSearchResult[]>(6 * 60 * 60 * 1000);
const ENTITY_CACHE = new TtlCache<Record<string, WikidataEntity>>(6 * 60 * 60 * 1000);
const WD_ENDPOINT = 'https://www.wikidata.org/w/api.php';
// TODO: Re-enable Chinese when needed
const WD_DEFAULT_LANGS = ['ru', 'en', 'de', 'fr', 'es' /* 'zh' */];

async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Wikidata ${response.status}`);
  return response.json();
}

async function wdSearch(q: string, lang: string, limit = 3, timeoutMs = 1200): Promise<WikidataSearchResult[]> {
  const cacheKey = `${lang}:${q}`;
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached) return cached;
  const url = new URL(WD_ENDPOINT);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', q);
  url.searchParams.set('language', lang || 'en');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('format', 'json');
  const data = await fetchJson(url.toString(), timeoutMs);
  const results: WikidataSearchResult[] = (data?.search ?? []).map((item: any) => ({
    id: item.id,
    label: item.label,
    description: item.description,
  }));
  SEARCH_CACHE.set(cacheKey, results);
  return results;
}

async function wdGetEntities(ids: string[], langs: string[], timeoutMs = 1500): Promise<Record<string, WikidataEntity>> {
  if (ids.length === 0) return {};
  const cacheKey = `${ids.join(',')}:${langs.join(',')}`;
  const cached = ENTITY_CACHE.get(cacheKey);
  if (cached) return cached;
  const url = new URL(WD_ENDPOINT);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', ids.join('|'));
  url.searchParams.set('props', 'labels|aliases');
  url.searchParams.set('languages', langs.length > 0 ? langs.join('|') : WD_DEFAULT_LANGS.join('|'));
  url.searchParams.set('format', 'json');
  const data = await fetchJson(url.toString(), timeoutMs);
  const entities: Record<string, WikidataEntity> = {};
  for (const [qid, val] of Object.entries(data?.entities ?? {})) {
    const e = val as any;
    if (e.missing) continue;
    entities[qid] = {
      id: qid,
      labels: e.labels ?? {},
      aliases: e.aliases ?? {},
    };
  }
  ENTITY_CACHE.set(cacheKey, entities);
  return entities;
}

function extractLabelsAndAliases(entity: WikidataEntity): QueryVariantSource[] {
  const variants: QueryVariantSource[] = [];
  for (const [langCode, labelObj] of Object.entries(entity.labels ?? {})) {
    const val = (labelObj as any).value?.trim();
    if (val) variants.push({ variant: val, lang: langCode, source: 'wikidata' });
  }
  for (const [langCode, aliasArr] of Object.entries(entity.aliases ?? {})) {
    for (const aliasObj of aliasArr as any[]) {
      const val = aliasObj.value?.trim();
      if (val) variants.push({ variant: val, lang: langCode, source: 'wikidata' });
    }
  }
  return variants;
}

const GENERIC_STOPWORDS = new Set(['study', 'research', 'theory', 'analysis', 'review', 'science']);
const EN_STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'in']);
const RU_STOPWORDS = new Set(['и', 'в', 'на', 'по', 'о', 'об', 'от', 'для', 'как', 'снижения', 'коррекции', 'средство']);

// Dictionary for translating Russian psychology terms to English
// OpenAlex search works much better with English terms even for Russian articles
// Include multiple grammatical forms (cases) for better matching
const RU_TO_EN_TERMS: Record<string, string> = {
  // Therapy types (all cases)
  'арт-терапия': 'art therapy', 'арт-терапии': 'art therapy', 'арт-терапию': 'art therapy',
  'арт терапия': 'art therapy', 'арт терапии': 'art therapy',
  'арттерапия': 'art therapy', 'арттерапии': 'art therapy',
  'игротерапия': 'play therapy', 'игротерапии': 'play therapy',
  'психотерапия': 'psychotherapy', 'психотерапии': 'psychotherapy',
  'терапия': 'therapy', 'терапии': 'therapy', 'терапию': 'therapy',
  'когнитивно-поведенческая': 'cognitive behavioral',
  'гештальт': 'gestalt',
  // Conditions/behaviors (all cases)
  'агрессия': 'aggression', 'агрессии': 'aggression', 'агрессию': 'aggression',
  'агрессивное': 'aggressive', 'агрессивного': 'aggressive', 'агрессивным': 'aggressive',
  'агрессивность': 'aggressiveness', 'агрессивности': 'aggressiveness',
  'тревога': 'anxiety', 'тревоги': 'anxiety', 'тревогу': 'anxiety',
  'тревожность': 'anxiety', 'тревожности': 'anxiety',
  'депрессия': 'depression', 'депрессии': 'depression', 'депрессию': 'depression',
  'стресс': 'stress', 'стресса': 'stress', 'стрессом': 'stress',
  'травма': 'trauma', 'травмы': 'trauma', 'травму': 'trauma',
  'птср': 'ptsd',
  'аутизм': 'autism', 'аутизма': 'autism', 'аутизмом': 'autism',
  'сдвг': 'adhd',
  // Age groups (all cases)
  'дети': 'children', 'детей': 'children', 'детям': 'children', 'детьми': 'children',
  'ребенок': 'child', 'ребёнок': 'child', 'ребенка': 'child', 'ребёнка': 'child',
  'подростки': 'adolescents', 'подростков': 'adolescents', 'подросткам': 'adolescents',
  'младшие школьники': 'elementary school children',
  'младших школьников': 'elementary school children',
  'школьники': 'schoolchildren', 'школьников': 'schoolchildren',
  'дошкольники': 'preschoolers', 'дошкольников': 'preschoolers',
  // Psychology terms (all cases)
  'психология': 'psychology', 'психологии': 'psychology',
  'психологический': 'psychological', 'психологического': 'psychological',
  'поведение': 'behavior', 'поведения': 'behavior', 'поведением': 'behavior',
  'развитие': 'development', 'развития': 'development', 'развитием': 'development',
  'эмоции': 'emotions', 'эмоций': 'emotions', 'эмоциями': 'emotions',
  'эмоциональный': 'emotional', 'эмоционального': 'emotional', 'эмоциональное': 'emotional',
  'привязанность': 'attachment', 'привязанности': 'attachment',
  'самооценка': 'self-esteem', 'самооценки': 'self-esteem', 'самооценку': 'self-esteem',
  'мотивация': 'motivation', 'мотивации': 'motivation',
};

/**
 * Translate Russian query to English for better OpenAlex search results.
 * OpenAlex indexes Russian articles but searches them better with English terms.
 */
function translateRuToEn(query: string): string | null {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/);
  const translated: string[] = [];
  let hasTranslation = false;

  let i = 0;
  while (i < words.length) {
    // Try multi-word phrases first (up to 3 words)
    let matched = false;
    for (let len = 3; len >= 1 && !matched; len--) {
      if (i + len <= words.length) {
        const phrase = words.slice(i, i + len).join(' ');
        if (RU_TO_EN_TERMS[phrase]) {
          translated.push(RU_TO_EN_TERMS[phrase]);
          hasTranslation = true;
          matched = true;
          i += len;
        }
      }
    }
    if (!matched) {
      // Single word lookup
      const word = words[i];
      if (RU_TO_EN_TERMS[word]) {
        translated.push(RU_TO_EN_TERMS[word]);
        hasTranslation = true;
      } else if (!RU_STOPWORDS.has(word)) {
        // Keep non-stopwords as-is (might be transliterated or proper nouns)
        translated.push(word);
      }
      i++;
    }
  }

  if (!hasTranslation || translated.length === 0) return null;
  return translated.join(' ');
}

function isStopword(value: string, lang: string): boolean {
  const lower = value.toLowerCase();
  if (GENERIC_STOPWORDS.has(lower)) return true;
  if (lang === 'en' && EN_STOPWORDS.has(lower)) return true;
  if (lang === 'ru' && RU_STOPWORDS.has(lower)) return true;
  return false;
}

function normalizeVariant(value: string): string {
  return value.trim();
}

function buildQueryVariants({
  q,
  detectedLang,
  wikidataVariants,
  langsRequested,
  mode,
}: {
  q: string;
  detectedLang: string;
  wikidataVariants: QueryVariantSource[];
  langsRequested: string[];
  mode: 'drawer' | 'page';
}): string[] {
  const maxVariants = mode === 'page' ? 8 : 6;
  const variants: string[] = [q];
  const seen = new Set([q.toLowerCase()]);

  // Helper to add variant if not duplicate/stopword
  const tryAdd = (v: QueryVariantSource): boolean => {
    const variant = normalizeVariant(v.variant);
    const lower = variant.toLowerCase();
    if (seen.has(lower)) return false;
    if (isStopword(variant, v.lang || detectedLang)) return false;
    seen.add(lower);
    variants.push(variant);
    return true;
  };

  // STEP 1: Add one label per language (prioritize diversity)
  // This ensures cross-language search works
  const targetLangs = langsRequested.filter((lang) => lang !== detectedLang);
  for (const lang of targetLangs) {
    if (variants.length >= maxVariants) break;
    const labelForLang = wikidataVariants.find(
      (v) => v.lang === lang && !seen.has(normalizeVariant(v.variant).toLowerCase())
    );
    if (labelForLang) {
      tryAdd(labelForLang);
    }
  }

  // STEP 2: Add one synonym in the original language (for synonym expansion)
  const sameLangVariant = wikidataVariants.find(
    (v) => v.lang === detectedLang && !seen.has(normalizeVariant(v.variant).toLowerCase())
  );
  if (sameLangVariant && variants.length < maxVariants) {
    tryAdd(sameLangVariant);
  }

  // STEP 3: Fill remaining slots with any other variants
  for (const v of wikidataVariants) {
    if (variants.length >= maxVariants) break;
    tryAdd(v);
  }

  return variants;
}

// ============================================================================
// INLINE PSYCHOLOGY FILTER (post-processing)
// ============================================================================

const PSYCHOLOGY_TERMS: Record<string, string[]> = {
  en: [
    'psychology', 'psychological', 'psychologist', 'psychotherapy', 'psychotherapist',
    'psychiatry', 'psychiatric', 'mental health', 'mental disorder', 'mental illness',
    'therapy', 'therapist', 'counseling', 'counselor', 'clinical', 'treatment',
    'developmental', 'child development', 'adolescent', 'attachment', 'parenting',
    'cognitive', 'cognition', 'memory', 'attention', 'perception', 'learning',
    'executive function', 'decision making', 'problem solving', 'intelligence',
    'social psychology', 'personality', 'behavior', 'behaviour', 'emotion', 'emotional',
    'interpersonal', 'relationship', 'motivation', 'self-esteem', 'identity',
    'neuroscience', 'neuropsychology', 'brain', 'neural', 'neurocognitive',
    'participants', 'subjects', 'questionnaire', 'scale', 'inventory', 'assessment',
    'intervention', 'experiment', 'longitudinal', 'cross-sectional',
    'anxiety', 'depression', 'ptsd', 'trauma', 'stress', 'burnout',
    'adhd', 'autism', 'schizophrenia', 'bipolar', 'ocd', 'phobia',
    'narcissism', 'narcissistic', 'borderline', 'dissociation',
  ],
  ru: [
    'психология', 'психологический', 'психолог', 'психотерапия', 'психотерапевт',
    'психиатрия', 'психиатр', 'психическое здоровье', 'психическое расстройство',
    'терапия', 'терапевт', 'консультирование', 'клинический', 'лечение',
    'развитие', 'детское развитие', 'подростковый', 'привязанность', 'воспитание',
    'когнитивный', 'познание', 'память', 'внимание', 'восприятие', 'обучение',
    'исполнительные функции', 'принятие решений', 'интеллект', 'мышление',
    'социальная психология', 'личность', 'поведение', 'эмоция', 'эмоциональный',
    'межличностный', 'отношения', 'мотивация', 'самооценка', 'идентичность',
    'нейронаука', 'нейропсихология', 'мозг', 'нейронный', 'нейрокогнитивный',
    'респондент', 'испытуемый', 'опросник', 'шкала', 'методика', 'диагностика',
    'интервенция', 'эксперимент', 'лонгитюдный', 'выборка',
    'тревога', 'тревожность', 'депрессия', 'птср', 'травма', 'стресс', 'выгорание',
    'сдвг', 'аутизм', 'шизофрения', 'биполярный', 'окр', 'фобия',
    'нарциссизм', 'нарциссический', 'пограничный', 'диссоциация',
    'психика', 'сознание', 'подсознание', 'бессознательное', 'защитные механизмы',
    'копинг', 'адаптация', 'ресилентность', 'благополучие',
  ],
  de: [
    'psychologie', 'psychologisch', 'psychologe', 'psychotherapie', 'psychotherapeut',
    'psychiatrie', 'psychiater', 'psychische gesundheit', 'psychische störung',
    'therapie', 'therapeut', 'beratung', 'klinisch', 'behandlung',
    'entwicklung', 'kindheitsentwicklung', 'bindung', 'erziehung',
    'kognitiv', 'kognition', 'gedächtnis', 'aufmerksamkeit', 'wahrnehmung',
    'sozialpsychologie', 'persönlichkeit', 'verhalten', 'emotion', 'motivation',
    'neurowissenschaft', 'neuropsychologie', 'gehirn',
    'angst', 'depression', 'trauma', 'stress', 'burnout', 'störung', 'syndrom',
  ],
  fr: [
    'psychologie', 'psychologique', 'psychologue', 'psychothérapie', 'psychothérapeute',
    'psychiatrie', 'psychiatre', 'santé mentale', 'trouble mental',
    'thérapie', 'thérapeute', 'conseil', 'clinique', 'traitement',
    'développement', 'attachement', 'éducation', 'enfance',
    'cognitif', 'cognition', 'mémoire', 'attention', 'perception',
    'psychologie sociale', 'personnalité', 'comportement', 'émotion', 'motivation',
    'neuroscience', 'neuropsychologie', 'cerveau',
    'anxiété', 'dépression', 'traumatisme', 'stress', 'trouble', 'syndrome',
    'narcissisme', 'narcissique',
  ],
  es: [
    'psicología', 'psicológico', 'psicólogo', 'psicoterapia', 'psicoterapeuta',
    'psiquiatría', 'psiquiatra', 'salud mental', 'trastorno mental',
    'terapia', 'terapeuta', 'consejería', 'clínico', 'tratamiento',
    'desarrollo', 'apego', 'crianza', 'infancia',
    'cognitivo', 'cognición', 'memoria', 'atención', 'percepción',
    'psicología social', 'personalidad', 'comportamiento', 'emoción', 'motivación',
    'neurociencia', 'neuropsicología', 'cerebro',
    'ansiedad', 'depresión', 'trauma', 'estrés', 'trastorno', 'síndrome',
    'narcisismo', 'narcisista',
  ],
  // TODO: Re-enable Chinese when needed
  // zh: [
  //   '心理学', '心理', '心理治疗', '精神病学', '精神健康',
  //   '治疗', '咨询', '临床', '发展', '依恋', '认知',
  //   '记忆', '注意', '感知', '社会心理', '人格', '行为',
  //   '情绪', '动机', '神经科学', '神经心理学', '大脑',
  //   '焦虑', '抑郁', '创伤', '压力', '障碍', '症状', '自恋',
  // ],
};

const ALL_PSYCHOLOGY_TERMS_SET = new Set<string>();
for (const terms of Object.values(PSYCHOLOGY_TERMS)) {
  for (const term of terms) {
    ALL_PSYCHOLOGY_TERMS_SET.add(term.toLowerCase());
  }
}

// Non-psychology terms: presence indicates article is NOT about psychology
const NON_PSYCHOLOGY_TERMS = [
  // Agriculture / Soil science
  'soil', 'roughness', 'tillage', 'agronomie', 'agronomy', 'agricultural', 'crop',
  'irrigation', 'fertilizer', 'agrofitocenoz', 'почва', 'пахота', 'агрономия', 'урожай',
  'удобрение', 'агрофитоценоз', 'растениеводство',
  // Physics / Electronics / Engineering
  'electrical resistance', 'ohm', 'circuit', 'voltage', 'current', 'capacitor',
  'resistor', 'semiconductor', 'transistor', 'plasma coating', 'ion-plasma',
  'износостойкость', 'диод', 'транзистор', 'конденсатор', 'вакуумн',
  'электрическое сопротивление', 'омическое', 'цепь', 'напряжение',
  // Materials science
  'alloy', 'corrosion', 'metallurgy', 'tensile', 'polymer', 'сплав', 'коррозия',
  // Biology (non-psychology)
  'bacteria', 'virus', 'antibiotic', 'enzyme', 'photosynthesis', 'yeast', 'dna sequencing',
  'бактерия', 'вирус', 'антибиотик', 'фермент', 'фотосинтез', 'дрожж',
  // Ornithology / Zoology (not psychology)
  'bird migration', 'ornithology', 'nesting', 'passeriformes', 'миграция птиц',
  'орнитология', 'гнездование', 'воробьинообразн',
  // Chemistry
  'chemical reaction', 'catalyst', 'molecule', 'oxidation', 'катализатор', 'окисление',
  // Geology
  'geology', 'seismic', 'tectonic', 'earthquake', 'геология', 'сейсмический', 'землетрясение',
  // Astronomy
  'galaxy', 'asteroid', 'planetary', 'космический', 'галактика', 'астероид',
  // Medicine (non-psychiatry/non-psychology)
  'spine surgery', 'vertebral', 'spinal fixation', 'transpedicular', 'echocardiography',
  'myocardial', 'ischemia', 'cardiac stress', 'фиксация позвоночника', 'транспедикулярн',
  'эхокардиография', 'миокард', 'ишемия',
  // IT/AI (not cognitive psychology)
  'cloud service', 'облачный сервис', 'робототехническ', 'autonomous robot',
  'криптовалют', 'блокчейн', 'blockchain',
  // Linguistics / Pure pedagogy (not educational psychology)
  'pronunciation', 'grammar teaching', 'language instruction', 'произношение',
  'грамматика обучени', 'методика преподавания языка',
  // Economics/Finance (not economic psychology)
  'gdp', 'inflation rate', 'monetary policy', 'fiscal', 'macroprudential',
  'stress testing imf', 'денежная политика', 'макропруденциальн', 'стресс-тестирование мвф',
  // History/Political science (not political psychology)
  'historical memory', 'политическая идентичность региона', 'историческая память',
  // Literature studies
  'культурный герой', 'сказочный мир', 'натурфилософск',
];

// Non-psychology venue patterns (journal names that indicate non-psychology content)
const NON_PSYCHOLOGY_VENUES = [
  // Agriculture / Biology
  'agronomi', 'soil', 'crop', 'plant', 'botany', 'kemerovo state university',
  'bulletin of kemerovo',
  // Geology / Physics / Chemistry
  'geology', 'geophys', 'electric', 'electron', 'circuit', 'physics', 'chemistry',
  'chemical', 'material', 'metallurg', 'mining', 'petroleum',
  // Russian technical
  'энерг', 'физик', 'химия', 'агрономия', 'почвовед', 'геология', 'механика', 'машиностр',
  // Astronomy
  'astronomy', 'astrophys', 'космос',
  // Medical (non-psychiatric)
  'spine surgery', 'хирургия позвоночника', 'cardiol', 'кардиол',
  // IT
  'program systems', 'information technolog', 'информационн', 'open information',
  // History / Political science
  'власть', 'revue des études slaves', 'bibliosphere',
  // General (too broad)
  'fundamental research', 'фундаментальные исследования',
];

function getPsychologyScore(title: string, abstract?: string | null, lang?: string, venue?: string | null): number {
  let score = 0;
  const titleLower = title.toLowerCase();
  const abstractLower = abstract?.toLowerCase() ?? '';
  const venueLower = venue?.toLowerCase() ?? '';
  const primaryTerms = PSYCHOLOGY_TERMS[lang ?? 'en'] ?? PSYCHOLOGY_TERMS.en;

  // Positive scoring: psychology terms
  for (const term of primaryTerms) {
    const termLower = term.toLowerCase();
    if (titleLower.includes(termLower)) score += 15;
    if (abstractLower.includes(termLower)) score += 5;
  }

  for (const [termLang, terms] of Object.entries(PSYCHOLOGY_TERMS)) {
    if (termLang === (lang ?? 'en')) continue;
    for (const term of terms) {
      const termLower = term.toLowerCase();
      if (titleLower.includes(termLower)) score += 10;
      if (abstractLower.includes(termLower)) score += 3;
    }
  }

  // Negative scoring: non-psychology terms
  for (const term of NON_PSYCHOLOGY_TERMS) {
    const termLower = term.toLowerCase();
    if (titleLower.includes(termLower)) score -= 25; // Strong penalty in title
    if (abstractLower.includes(termLower)) score -= 10;
  }

  // Negative scoring: non-psychology venue/journal
  for (const pattern of NON_PSYCHOLOGY_VENUES) {
    if (venueLower.includes(pattern.toLowerCase())) {
      score -= 30; // Strong penalty for clearly non-psychology journals
      break; // Only penalize once
    }
  }

  return Math.max(0, Math.min(score, 100));
}

// ============================================================================
// END INLINE CODE
// ============================================================================

type ResearchSource = 'openalex' | 'openaire' | 'semanticscholar';

type AllowedSource = {
  key: string;
  enabled: boolean;
  hosts: string[];
  pathPrefixes?: string[];
};

type OpenAlexWork = {
  id?: string;
  display_name?: string;
  publication_year?: number;
  authorships?: Array<{ author?: { display_name?: string } }>;
  host_venue?: { display_name?: string };
  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    source?: { display_name?: string } | null;
  } | null;
  open_access?: {
    is_oa?: boolean;
    oa_url?: string | null;
  } | null;
  doi?: string | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  language?: string | null;
};

type ResearchWork = {
  id: string;
  title: string;
  year: number | null;
  authors: string[];
  venue: string | null;
  language: string | 'unknown';
  doi?: string | null;
  primaryUrl?: string | null;
  oaPdfUrl?: string | null;
  paragraph?: string | null;
  source: ResearchSource;
  score?: number;
  host?: string | null;
  isOa?: boolean;  // OpenAlex open_access.is_oa flag
};

type PapersApiResponse = {
  query: string;
  results: ResearchWork[];
  meta: {
    tookMs: number;
    cached: boolean;
    sourcesUsed: ResearchSource[];
    allowListApplied: boolean;
    psychologyFilterApplied?: boolean;
    queryVariantsUsed?: string[];
  };
};

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 30; // 30 requests per window
const rateLimitStore = new Map<string, number[]>();

// TODO: Re-enable Chinese when needed
const DEFAULT_LANGS = ['ru', 'de', 'fr', 'es', 'en' /* 'zh' */];
const MAX_LIMIT = 50;  // Increased: OpenAlex Concepts gives more relevant results
const DEFAULT_LIMIT = 30;  // Increased from 20
const MIN_RESULTS_FOR_NO_EXPANSION = 15;  // Increased threshold
// TODO: Re-enable Chinese when needed
const DEFAULT_WD_LANGS = ['ru', 'en', 'de', 'fr', 'es' /* 'zh' */];

const require = createRequire(import.meta.url);
// Use require to load JSON without import assertions (compatible with Node ESM + Vite dev)
const allowListConfig = require('../src/features/researchSearch/config/research_sources.json') as {
  sources: AllowedSource[];
};

const ALLOW_SOURCES: AllowedSource[] = allowListConfig?.sources ?? [];

function cleanHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const path = parsed.pathname || '/';

  return ALLOW_SOURCES.some((source) => {
    if (!source.enabled) return false;
    const matchHost = source.hosts.some((allowedHost) => allowedHost.toLowerCase() === host);
    if (!matchHost) return false;
    const prefixes = source.pathPrefixes ?? [];
    if (prefixes.length === 0) return true;
    return prefixes.some((prefix) => path.startsWith(prefix));
  });
}

function enforceRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const entries = rateLimitStore.get(ip)?.filter((ts) => ts >= windowStart) ?? [];

  if (entries.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, entries);
    return false;
  }

  entries.push(now);
  rateLimitStore.set(ip, entries);
  return true;
}

function parseQueryParams(req: any): {
  qRaw: string;
  limit: number;
  langs: string[];
  mode: 'drawer' | 'page';
  psychologyOnly: boolean;
} {
  const qRaw = (req.query?.q ?? '').toString().trim();
  const limitRaw = Number.parseInt((req.query?.limit ?? '').toString(), 10);
  const langsRaw = (req.query?.langs ?? '').toString().trim();
  const modeRaw = (req.query?.mode ?? '').toString().trim();
  const psychologyOnlyRaw = (req.query?.psychologyOnly ?? '').toString().trim();

  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, MAX_LIMIT)
      : DEFAULT_LIMIT;
  const langs: string[] =
    langsRaw.length > 0
      ? Array.from(
          new Set(
            langsRaw
              .split(',')
              .map((lang: string) => lang.trim().toLowerCase())
              .filter(Boolean)
          )
        )
      : DEFAULT_LANGS;
  const mode: 'drawer' | 'page' = modeRaw === 'page' ? 'page' : 'drawer';
  // psychologyOnly defaults to true for psychology-focused search
  const psychologyOnly = psychologyOnlyRaw === 'false' ? false : true;

  return { qRaw, limit, langs, mode, psychologyOnly };
}

function reconstructAbstractFromIndex(index?: Record<string, number[]> | null): string | null {
  if (!index) return null;
  const positions: Array<{ word: string; pos: number }> = [];

  for (const [word, posList] of Object.entries(index)) {
    posList.forEach((pos) => {
      positions.push({ word, pos });
    });
  }

  if (positions.length === 0) return null;

  positions.sort((a, b) => a.pos - b.pos);
  const maxPos = positions[positions.length - 1]?.pos ?? 0;
  const words = new Array(maxPos + 1).fill('');

  positions.forEach(({ word, pos }) => {
    words[pos] = word;
  });

  const result = words.join(' ').replace(/\s+/g, ' ').trim();
  return result || null;
}

function buildParagraph(work: ResearchWork): string | null {
  const raw = work.paragraph;
  if (raw) {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (cleaned.length === 0) return null;
    const maxLen = 650;
    return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen).trim()}…` : cleaned;
  }

  const parts: string[] = [];
  if (work.venue) parts.push(work.venue);
  if (work.year) parts.push(String(work.year));
  if (work.language && work.language !== 'unknown') parts.push(work.language.toUpperCase());
  if (work.authors.length) parts.push(work.authors.slice(0, 3).join(', '));

  if (!parts.length) return null;
  return `Описание по метаданным: ${parts.join(' • ')}`;
}

function normalizeOpenAlexWork(item: OpenAlexWork): ResearchWork | null {
  const id = item.id ?? '';
  if (!id) return null;

  const authors: string[] =
    item.authorships?.map((auth) => auth.author?.display_name).filter((name): name is string => Boolean(name)) ?? [];

  const primaryUrl =
    item.primary_location?.landing_page_url ??
    item.open_access?.oa_url ??
    null;
  const oaPdfUrl = item.primary_location?.pdf_url ?? item.open_access?.oa_url ?? null;

  const paragraph =
    reconstructAbstractFromIndex(item.abstract_inverted_index) ?? null;

  const host = cleanHost(oaPdfUrl || primaryUrl);

  return {
    id,
    title: item.display_name ?? 'Untitled',
    year: item.publication_year ?? null,
    authors,
    venue:
      item.primary_location?.source?.display_name ??
      item.host_venue?.display_name ??
      null,
    language: item.language ?? 'unknown',
    doi: item.doi ?? null,
    primaryUrl,
    oaPdfUrl,
    paragraph,
    source: 'openalex',
    host,
    isOa: item.open_access?.is_oa ?? false,
  };
}

// OpenAlex Psychology concept IDs for filtering
// These are ML-classified categories that dramatically improve relevance
const PSYCHOLOGY_CONCEPT_IDS = [
  'C15744967',   // Psychology (main, level 0)
  'C77805123',   // Social psychology (level 1)
  'C138496976',  // Developmental psychology (level 1)
  'C70410870',   // Clinical psychology (level 1)
  'C180747234',  // Cognitive psychology (level 1)
  'C75630572',   // Applied psychology (level 1)
  'C126838900',  // Psychiatry (related)
  'C134895398',  // Educational psychology (level 2) - for articles on child development, school psychology
];

async function fetchOpenAlex(
  q: string,
  langs: string[],
  candidateLimit: number,
  usePsychologyConceptFilter: boolean = true,
  requireOa: boolean = false  // OpenAlex incorrectly marks many open sources as non-OA
): Promise<ResearchWork[]> {
  const searchUrl = new URL('https://api.openalex.org/works');
  searchUrl.searchParams.set('search', q);

  // Build filter: language + optionally OA + optionally psychology concepts
  // NOTE: is_oa:true is now optional because OpenAlex incorrectly marks many
  // trusted open-access sources (e.g., CyberLeninka) as non-OA
  const filters = [`language:${langs.join('|')}`];
  if (requireOa) {
    filters.push('is_oa:true');
  }
  if (usePsychologyConceptFilter) {
    // Use OpenAlex's ML-based concept classification for psychology
    // This dramatically improves relevance (e.g., 53 vs 5 results for "агрессия")
    filters.push(`concepts.id:${PSYCHOLOGY_CONCEPT_IDS.join('|')}`);
  }
  searchUrl.searchParams.set('filter', filters.join(','));
  searchUrl.searchParams.set('per-page', String(candidateLimit));

  const response = await fetch(searchUrl.toString(), {
    headers: {
      'User-Agent': 'psych-dev-site/oss-research-search',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const statusText = response.statusText || 'OpenAlex error';
    throw new Error(`OpenAlex ${response.status}: ${statusText}`);
  }

  const payload = await response.json();
  const items: OpenAlexWork[] = payload?.results ?? [];
  const normalized = items
    .map(normalizeOpenAlexWork)
    .filter((entry): entry is ResearchWork => Boolean(entry));

  return normalized;
}

function filterByAllowList(items: ResearchWork[]): ResearchWork[] {
  return items.filter((item) => isAllowedUrl(item.oaPdfUrl) || isAllowedUrl(item.primaryUrl));
}

// ============================================================================
// OpenAIRE API - European open access aggregator, indexes CyberLeninka
// ============================================================================

type OpenAIREResult = {
  header?: { 'dri:objIdentifier'?: { $?: string } };
  metadata?: {
    'oaf:entity'?: {
      'oaf:result'?: {
        title?: { $?: string } | Array<{ $?: string }>;
        creator?: { $?: string } | Array<{ $?: string; '@rank'?: string }>;
        dateofacceptance?: { $?: string };
        description?: { $?: string };
        language?: { '@classname'?: string };
        pid?: { '@classid'?: string; $?: string } | Array<{ '@classid'?: string; $?: string }>;
        children?: {
          instance?: Array<{
            webresource?: { url?: { $?: string } };
            accessright?: { '@classid'?: string };
          }>;
        };
      };
    };
  };
};

function normalizeOpenAIREWork(result: OpenAIREResult): ResearchWork | null {
  const meta = result?.metadata?.['oaf:entity']?.['oaf:result'];
  if (!meta) return null;

  // Extract title
  let title = '';
  if (meta.title) {
    if (Array.isArray(meta.title)) {
      title = meta.title[0]?.['$'] ?? '';
    } else {
      title = meta.title['$'] ?? '';
    }
  }
  if (!title) return null;

  // Extract DOI
  let doi: string | null = null;
  const pids = meta.pid;
  if (pids) {
    const pidArray = Array.isArray(pids) ? pids : [pids];
    for (const pid of pidArray) {
      if (pid['@classid'] === 'doi' && pid['$']) {
        doi = pid['$'].toLowerCase();
        break;
      }
    }
  }

  // Extract authors
  const authors: string[] = [];
  if (meta.creator) {
    const creators = Array.isArray(meta.creator) ? meta.creator : [meta.creator];
    for (const c of creators) {
      const name = typeof c === 'string' ? c : c['$'];
      if (name) authors.push(name);
    }
  }

  // Extract year
  let year: number | null = null;
  if (meta.dateofacceptance?.['$']) {
    const match = meta.dateofacceptance['$'].match(/^(\d{4})/);
    if (match) year = parseInt(match[1], 10);
  }

  // Extract URL
  let primaryUrl: string | null = null;
  let oaPdfUrl: string | null = null;
  const instances = meta.children?.instance;
  if (instances && Array.isArray(instances)) {
    for (const inst of instances) {
      const url = inst.webresource?.url?.['$'];
      if (url) {
        if (!primaryUrl) primaryUrl = url;
        if (inst.accessright?.['@classid'] === 'OPEN' && !oaPdfUrl) {
          oaPdfUrl = url;
        }
      }
    }
  }

  // Extract language
  const langClass = meta.language?.['@classname'] ?? 'unknown';
  const language = langClass === 'English' ? 'en' : langClass === 'Russian' ? 'ru' : langClass.toLowerCase().slice(0, 2);

  // Extract description/abstract
  const paragraph = meta.description?.['$'] ?? null;

  const id = result.header?.['dri:objIdentifier']?.['$'] ?? `openaire-${doi ?? title.slice(0, 30)}`;

  return {
    id,
    title,
    year,
    authors: authors.slice(0, 5),
    venue: null,
    language: language || 'unknown',
    doi: doi ? `https://doi.org/${doi}` : null,
    primaryUrl,
    oaPdfUrl,
    paragraph,
    source: 'openaire' as ResearchSource,
    host: cleanHost(oaPdfUrl || primaryUrl),
    isOa: Boolean(oaPdfUrl),
  };
}

async function fetchOpenAIRE(q: string, limit: number = 30): Promise<ResearchWork[]> {
  const url = new URL('https://api.openaire.eu/search/publications');
  url.searchParams.set('keywords', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', String(limit));

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`OpenAIRE ${response.status}`);
  }

  const payload = await response.json();
  const results: OpenAIREResult[] = payload?.response?.results?.result ?? [];

  return results
    .map(normalizeOpenAIREWork)
    .filter((w): w is ResearchWork => w !== null);
}

// ============================================================================
// Semantic Scholar API - AI-powered academic search
// ============================================================================

type SemanticScholarPaper = {
  paperId?: string;
  title?: string;
  year?: number;
  authors?: Array<{ name?: string }>;
  abstract?: string;
  externalIds?: { DOI?: string };
  openAccessPdf?: { url?: string };
  venue?: string;
};

function normalizeSemanticScholarWork(paper: SemanticScholarPaper): ResearchWork | null {
  if (!paper.title) return null;

  const doi = paper.externalIds?.DOI?.toLowerCase();
  const oaPdfUrl = paper.openAccessPdf?.url ?? null;

  return {
    id: paper.paperId ?? `ss-${doi ?? paper.title.slice(0, 30)}`,
    title: paper.title,
    year: paper.year ?? null,
    authors: (paper.authors ?? []).map(a => a.name ?? '').filter(Boolean).slice(0, 5),
    venue: paper.venue ?? null,
    language: 'unknown', // Semantic Scholar doesn't reliably return language
    doi: doi ? `https://doi.org/${doi}` : null,
    primaryUrl: doi ? `https://doi.org/${doi}` : null,
    oaPdfUrl,
    paragraph: paper.abstract ?? null,
    source: 'semanticscholar' as ResearchSource,
    host: cleanHost(oaPdfUrl || (doi ? `https://doi.org/${doi}` : null)),
    isOa: Boolean(oaPdfUrl),
  };
}

async function fetchSemanticScholar(q: string, limit: number = 30): Promise<ResearchWork[]> {
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
  url.searchParams.set('query', q);
  url.searchParams.set('limit', String(Math.min(limit, 100))); // SS max is 100
  url.searchParams.set('fields', 'paperId,title,year,authors,abstract,externalIds,openAccessPdf,venue');

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Semantic Scholar ${response.status}`);
  }

  const payload = await response.json();
  const papers: SemanticScholarPaper[] = payload?.data ?? [];

  return papers
    .map(normalizeSemanticScholarWork)
    .filter((w): w is ResearchWork => w !== null);
}

/**
 * Filter by open access: article passes if:
 * 1. OpenAlex marks it as OA (isOa=true), OR
 * 2. URL is from a trusted source in allow-list (e.g., CyberLeninka)
 *
 * This is needed because OpenAlex incorrectly marks many trusted open sources as non-OA.
 */
function filterByOpenAccess(items: ResearchWork[]): ResearchWork[] {
  return items.filter((item) => {
    // Pass if OpenAlex says it's OA
    if (item.isOa) return true;
    // Pass if URL is from trusted source (allow-list)
    if (isAllowedUrl(item.oaPdfUrl) || isAllowedUrl(item.primaryUrl)) return true;
    return false;
  });
}

async function fetchSemanticScholarAbstracts(dois: string[], maxRequests = 5): Promise<Map<string, string>> {
  const limited = Array.from(new Set(dois.filter(Boolean))).slice(0, maxRequests);
  const result = new Map<string, string>();

  for (const doi of limited) {
    try {
      const url = new URL(`https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}`);
      url.searchParams.set('fields', 'abstract');
      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const payload = await response.json();
      const abstract = payload?.abstract;
      if (abstract && typeof abstract === 'string' && abstract.trim().length > 0) {
        result.set(doi, abstract.trim());
      }
    } catch {
      // swallow; fallback best-effort
    }
  }

  return result;
}

function enrichWithAbstractFallback(items: ResearchWork[], abstractMap: Map<string, string>): ResearchWork[] {
  return items.map((item) => {
    if (item.paragraph || !item.doi) return item;
    const extra = abstractMap.get(item.doi);
    if (!extra) return item;
    return {
      ...item,
      paragraph: extra,
      source: item.source, // keep original source marker
    };
  });
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '') as string;
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (req.socket && (req.socket as any).remoteAddress) || 'unknown';
}

function detectLang(query: string): string {
  const text = query.toLowerCase();
  const hasCyrillic = /[а-яё]/i.test(text);
  if (hasCyrillic) return 'ru';
  // TODO: Re-enable Chinese when needed
  // const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  // if (hasChinese) return 'zh';
  if (/[äöüß]/i.test(text) || /\bder\b|\bdie\b|\bund\b/.test(text)) return 'de';
  if (/[áéíóúñ¡¿]/i.test(text) || /\bel\b|\bla\b|\bdel\b/.test(text)) return 'es';
  if (/[àâçéèêëîïôûùüÿœ]/i.test(text) || /\ble\b|\bla\b|\bet\b/.test(text)) return 'fr';
  return 'en';
}

export default async function handler(req: any, res: any) {
  const started = Date.now();

  if (req.method !== 'GET') {
    res.status(405).json({ status: 405, message: 'Method not allowed' });
    return;
  }

  const { qRaw, limit, langs, mode, psychologyOnly } = parseQueryParams(req);
  if (!qRaw || qRaw.length < 3) {
    res.status(400).json({ status: 400, message: 'Query parameter q is required (min 3 chars)', code: 'INVALID_QUERY' });
    return;
  }

  const clientIp = getClientIp(req as IncomingMessage);
  if (!enforceRateLimit(clientIp)) {
    res.status(429).json({ status: 429, message: 'Rate limit exceeded', code: 'RATE_LIMITED' });
    return;
  }

  try {
    const candidateLimit = mode === 'page' ? 50 : 30;
    const baseLang = detectLang(qRaw);

    // For Russian queries, translate to English for better results
    const translatedQuery = baseLang === 'ru' ? translateRuToEn(qRaw) : null;

    // Build search queries: use translated for OpenAlex, original for all
    const openAlexQuery = translatedQuery || qRaw;
    const queryVariantsUsed: string[] = translatedQuery ? [translatedQuery, qRaw] : [qRaw];

    // =========================================================================
    // PARALLEL SEARCH: OpenAlex + OpenAIRE + Semantic Scholar
    // =========================================================================
    const sourcesUsed: ResearchSource[] = [];

    const [openAlexResult, openAIREResult, semanticScholarResult] = await Promise.allSettled([
      // OpenAlex: use translated query for better Russian results
      fetchOpenAlex(openAlexQuery, langs, candidateLimit, psychologyOnly, false)
        .then(works => {
          sourcesUsed.push('openalex');
          return filterByOpenAccess(works);
        }),

      // OpenAIRE: use original query (good for Russian articles, indexes CyberLeninka)
      fetchOpenAIRE(qRaw, candidateLimit)
        .then(works => {
          sourcesUsed.push('openaire');
          return works;
        })
        .catch(() => [] as ResearchWork[]), // Don't fail if OpenAIRE is down

      // Semantic Scholar: use original query (AI-powered search)
      fetchSemanticScholar(qRaw, candidateLimit)
        .then(works => {
          sourcesUsed.push('semanticscholar');
          return works;
        })
        .catch(() => [] as ResearchWork[]), // Don't fail if SS is down
    ]);

    // Collect all results with source-based scoring
    // Lower score = higher priority (OpenAlex first, then OpenAIRE, then SS)
    const allWorks: ResearchWork[] = [];

    if (openAlexResult.status === 'fulfilled') {
      openAlexResult.value.forEach((work, idx) => {
        allWorks.push({ ...work, score: idx });
      });
    }

    if (openAIREResult.status === 'fulfilled') {
      openAIREResult.value.forEach((work, idx) => {
        allWorks.push({ ...work, score: 1000 + idx });
      });
    }

    if (semanticScholarResult.status === 'fulfilled') {
      semanticScholarResult.value.forEach((work, idx) => {
        allWorks.push({ ...work, score: 2000 + idx });
      });
    }

    // =========================================================================
    // DEDUPLICATION by DOI (case-insensitive)
    // Keep the one with lower score (higher priority source)
    // =========================================================================
    const dedupedMap = new Map<string, ResearchWork>();

    allWorks.forEach((work) => {
      // Use DOI as primary key, fallback to normalized title
      const doiKey = work.doi?.toLowerCase().replace('https://doi.org/', '');
      const titleKey = work.title.toLowerCase().replace(/[^a-zа-яё0-9]/g, '').slice(0, 50);
      const key = doiKey || titleKey;

      const existing = dedupedMap.get(key);
      const incomingScore = work.score ?? Number.MAX_SAFE_INTEGER;
      const existingScore = existing?.score ?? Number.MAX_SAFE_INTEGER;

      if (!existing || incomingScore < existingScore) {
        dedupedMap.set(key, work);
      }
    });

    const deduped = Array.from(dedupedMap.values()).sort((a, b) => {
      return (a.score ?? 0) - (b.score ?? 0);
    });

    // =========================================================================
    // PSYCHOLOGY FILTER (if enabled)
    // =========================================================================
    const PSYCHOLOGY_SCORE_THRESHOLD = 10;
    const psychologyFiltered = psychologyOnly
      ? deduped.filter((work) => {
          const score = getPsychologyScore(work.title, work.paragraph, work.language, work.venue);
          return score >= PSYCHOLOGY_SCORE_THRESHOLD;
        })
      : deduped;

    // =========================================================================
    // FINAL PROCESSING
    // =========================================================================
    const sliced = psychologyFiltered.slice(0, limit).map((work) => ({
      ...work,
      paragraph: buildParagraph(work),
    }));

    const response: PapersApiResponse = {
      query: qRaw,
      results: sliced,
      meta: {
        tookMs: Date.now() - started,
        cached: false,
        sourcesUsed: Array.from(new Set(sourcesUsed)),
        allowListApplied: true,
        psychologyFilterApplied: psychologyOnly,
        queryVariantsUsed,
      },
    };

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(response);
  } catch (error: any) {
    const message = error?.message || 'Upstream unavailable';
    res.status(502).json({
      status: 502,
      message: 'Search service temporarily unavailable',
      code: 'UPSTREAM_UNAVAILABLE',
      detail: message,
    });
  }
}

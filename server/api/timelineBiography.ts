export const TIMELINE_BIOGRAPHY_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash'] as const;
export const TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS = 8192;
export const MAX_WIKIPEDIA_EXTRACT_CHARS = 32000;
const LINE_X_POSITION = 2000;
export type TimelineSphere =
  | 'education'
  | 'career'
  | 'family'
  | 'health'
  | 'friends'
  | 'place'
  | 'finance'
  | 'hobby'
  | 'other';

const WIKIPEDIA_HOST_PATTERN = /(?:^|\.)wikipedia\.org$/i;
const DEFAULT_BRANCH_LENGTH = 6;
const BRANCH_X_OFFSETS = [-360, 360, -620, 620, -900, 900, -1180, 1180] as const;

// Slot indices into BRANCH_X_OFFSETS: even=left, odd=right.
// Alternate left/right to balance the tree visually.
const BRANCH_SLOT_ORDER: Record<TimelineSphere, readonly number[]> = {
  education: [0, 1, 2, 3, 4, 5, 6, 7],
  career: [1, 0, 3, 2, 5, 4, 7, 6],
  family: [3, 2, 1, 0, 5, 4, 6, 7],
  health: [0, 1, 2, 3, 4, 5, 6, 7],
  friends: [2, 1, 0, 3, 4, 5, 6, 7],
  place: [0, 1, 2, 3, 4, 5, 6, 7],
  finance: [1, 0, 3, 2, 5, 4, 7, 6],
  hobby: [2, 1, 0, 3, 4, 5, 6, 7],
  other: [0, 1, 2, 3, 4, 5, 6, 7],
};

const SPHERE_META: Record<TimelineSphere, { color: string; label: string; emoji: string }> = {
  education: { color: '#a5b4fc', label: 'Образование', emoji: '🎓' },
  career: { color: '#7dd3fc', label: 'Карьера', emoji: '💼' },
  family: { color: '#fca5a5', label: 'Семья', emoji: '❤️' },
  health: { color: '#86efac', label: 'Здоровье', emoji: '💪' },
  friends: { color: '#fcd34d', label: 'Друзья', emoji: '🤝' },
  place: { color: '#c4b5fd', label: 'Место/переезд', emoji: '🏠' },
  finance: { color: '#6ee7b7', label: 'Финансы', emoji: '💰' },
  hobby: { color: '#f9a8d4', label: 'Хобби', emoji: '🎨' },
  other: { color: '#cbd5e1', label: 'Другое', emoji: '⭐' },
};

const TIMELINE_PERIODIZATION_IDS = ['piaget', 'vygotsky', 'erikson', 'freud', 'montessori', 'gesell', 'kohlberg'] as const;
const EVENT_ICON_IDS = [
  'baby-swaddle',
  'baby-feet',
  'heart-message',
  'friendship',
  'celebration-balloons',
  'pet-paw',
  'school-backpack',
  'report-card',
  'graduation-cap',
  'party-balloons',
  'art-palette',
  'music-headphones',
  'car',
  'briefcase',
  'cash',
  'key',
  'house',
  'mortgage',
  'passport',
  'world-travel',
  'id-card',
  'graduation-diploma',
  'love-letter',
  'idea-book',
  'thermometer',
  'heart-nature',
  'trophy',
  'love-rings',
  'engagement-ring',
  'baby-stroller',
  'visa-card',
  'certificate',
  'handshake',
  'heart-hands',
  'hammock',
  'winner-cup',
  'baby-mobile',
  'infinity-ring',
  'wedding-rings',
  'prayer-hands',
  'custom-icon',
] as const;

type TimelineIconId = (typeof EVENT_ICON_IDS)[number];

export type BiographyImportRequest = {
  sourceUrl: string;
};

export type BiographyTimelineEventPlan = {
  age: number;
  label: string;
  notes?: string;
  sphere?: TimelineSphere;
  isDecision: boolean;
  iconId?: TimelineIconId;
};

export type BiographyTimelineBranchPlan = {
  label: string;
  sphere: TimelineSphere;
  sourceMainEventIndex: number;
  events: BiographyTimelineEventPlan[];
};

export type BiographyTimelinePlan = {
  subjectName: string;
  canvasName: string;
  currentAge: number;
  selectedPeriodization?: (typeof TIMELINE_PERIODIZATION_IDS)[number] | null;
  birthDetails?: {
    date?: string;
    place?: string;
    notes?: string;
  };
  mainEvents: BiographyTimelineEventPlan[];
  branches: BiographyTimelineBranchPlan[];
};

export type BiographyTimelineData = {
  currentAge: number;
  ageMax: number;
  nodes: Array<{
    id: string;
    age: number;
    x?: number;
    parentX?: number;
    label: string;
    notes?: string;
    sphere?: TimelineSphere;
    isDecision: boolean;
    iconId?: TimelineIconId;
  }>;
  edges: Array<{
    id: string;
    x: number;
    startAge: number;
    endAge: number;
    color: string;
    nodeId: string;
  }>;
  birthDetails?: {
    date?: string;
    place?: string;
    notes?: string;
  };
  selectedPeriodization?: (typeof TIMELINE_PERIODIZATION_IDS)[number] | null;
};

type WikipediaPageExtract = {
  title: string;
  extract: string;
  canonicalUrl: string;
};

type OccupiedBranchLane = {
  x: number;
  startAge: number;
  endAge: number;
};

export type BiographyPlanDiagnostics = {
  source: 'model' | 'merged-with-heuristics' | 'heuristics-only';
  mainEvents: number;
  branches: number;
  branchEvents: number;
  hasBirthDate: boolean;
  hasBirthPlace: boolean;
};

export type BiographyTimelineFact = {
  year?: number;
  age?: number;
  sphere?: TimelineSphere;
  category: string;
  labelHint: string;
  details: string;
  importance: 'high' | 'medium' | 'low';
};

export type BiographyGenerationStageDiagnostics = {
  facts: number;
  reviewApplied: boolean;
  reviewIssues: string[];
};

const BIOGRAPHY_TIMELINE_FEW_SHOT_EXAMPLE = `{
  "subjectName": "Человек А",
  "canvasName": "Человек А",
  "currentAge": 68,
  "selectedPeriodization": "erikson",
  "birthDetails": {
    "date": "14 марта 1956",
    "place": "Город А",
    "notes": "Умер в 2024 году после болезни."
  },
  "mainEvents": [
    { "age": 0, "label": "Рождение", "sphere": "family", "isDecision": false, "iconId": "baby-feet", "notes": "Родился в Городе А." },
    { "age": 11, "label": "Поступление в лицей", "sphere": "education", "isDecision": true, "iconId": "school-backpack", "notes": "Начал системное обучение." },
    { "age": 18, "label": "Переезд в столицу", "sphere": "place", "isDecision": true, "iconId": "passport", "notes": "Переехал ради учёбы и работы." },
    { "age": 24, "label": "Первый профессиональный прорыв", "sphere": "career", "isDecision": true, "iconId": "briefcase", "notes": "Получил широкое признание." },
    { "age": 31, "label": "Брак", "sphere": "family", "isDecision": true, "iconId": "wedding-rings", "notes": "Создал семью." },
    { "age": 43, "label": "Запуск главного проекта", "sphere": "career", "isDecision": true, "iconId": "idea-book", "notes": "Запустил проект зрелого периода." },
    { "age": 56, "label": "Смена жизненного этапа", "sphere": "career", "isDecision": true, "notes": "Перешёл к новому формату деятельности." },
    { "age": 68, "label": "Смерть", "sphere": "health", "isDecision": false, "iconId": "thermometer", "notes": "Завершение жизненного пути." }
  ],
  "branches": [
    {
      "label": "Образование",
      "sphere": "education",
      "sourceMainEventIndex": 1,
      "events": [
        { "age": 13, "label": "Круг чтения и наставники", "sphere": "education", "isDecision": false, "notes": "Расширил круг идей и влияний." },
        { "age": 17, "label": "Первое публичное признание", "sphere": "education", "isDecision": false, "notes": "Получил заметную оценку способностей." }
      ]
    },
    {
      "label": "Карьера",
      "sphere": "career",
      "sourceMainEventIndex": 3,
      "events": [
        { "age": 27, "label": "Первое крупное произведение", "sphere": "career", "isDecision": true, "iconId": "idea-book", "notes": "Укрепил профессиональную репутацию." },
        { "age": 44, "label": "Расширение влияния", "sphere": "career", "isDecision": false, "notes": "Стал заметной фигурой в своей области." },
        { "age": 60, "label": "Поздний зрелый вклад", "sphere": "career", "isDecision": false, "notes": "Сохранил значение в позднем периоде жизни." }
      ]
    },
    {
      "label": "Семья",
      "sphere": "family",
      "sourceMainEventIndex": 4,
      "events": [
        { "age": 33, "label": "Рождение первого ребёнка", "sphere": "family", "isDecision": false, "iconId": "baby-stroller", "notes": "Семейная линия стала самостоятельной темой жизни." },
        { "age": 58, "label": "Семейное напряжение позднего периода", "sphere": "family", "isDecision": false, "notes": "Семья оставалась важной частью поздней жизни." }
      ]
    }
  ]
}`;

export const BIOGRAPHY_TIMELINE_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  required: ['subjectName', 'canvasName', 'currentAge', 'mainEvents', 'branches'],
  properties: {
    subjectName: { type: 'string' },
    canvasName: { type: 'string' },
    currentAge: { type: 'number', minimum: 0, maximum: 120 },
    selectedPeriodization: {
      type: ['string', 'null'],
      enum: [...TIMELINE_PERIODIZATION_IDS, null],
    },
    birthDetails: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        place: { type: 'string' },
        notes: { type: 'string' },
      },
    },
    mainEvents: {
      type: 'array',
      items: {
        type: 'object',
        required: ['age', 'label', 'isDecision'],
        properties: {
          age: { type: 'number', minimum: 0, maximum: 120 },
          label: { type: 'string' },
          notes: { type: 'string' },
          sphere: { type: 'string', enum: Object.keys(SPHERE_META) },
          isDecision: { type: 'boolean' },
          iconId: { type: 'string', enum: [...EVENT_ICON_IDS] },
        },
      },
    },
    branches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'sphere', 'sourceMainEventIndex', 'events'],
        properties: {
          label: { type: 'string' },
          sphere: { type: 'string', enum: Object.keys(SPHERE_META) },
          sourceMainEventIndex: { type: 'integer', minimum: 0, maximum: 17 },
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['age', 'label', 'isDecision'],
              properties: {
                age: { type: 'number', minimum: 0, maximum: 120 },
                label: { type: 'string' },
                notes: { type: 'string' },
                sphere: { type: 'string', enum: Object.keys(SPHERE_META) },
                isDecision: { type: 'boolean' },
                iconId: { type: 'string', enum: [...EVENT_ICON_IDS] },
              },
            },
          },
        },
      },
    },
  },
} as const;

export function parseWikipediaSourceUrl(sourceUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error('Укажите корректную ссылку на статью Wikipedia.');
  }

  if (!WIKIPEDIA_HOST_PATTERN.test(parsed.hostname)) {
    throw new Error('Пока поддерживаются только ссылки Wikipedia.');
  }

  if (!parsed.pathname.startsWith('/wiki/')) {
    throw new Error('Нужна прямая ссылка на статью Wikipedia вида /wiki/... .');
  }

  const rawTitle = parsed.pathname.replace(/^\/wiki\//, '').trim();
  if (!rawTitle) {
    throw new Error('Не удалось определить название статьи Wikipedia.');
  }

  const pageTitle = decodeURIComponent(rawTitle).replace(/_/g, ' ');
  return {
    sourceUrl: parsed.toString(),
    apiOrigin: `${parsed.protocol}//${parsed.hostname}`,
    pageTitle,
    encodedTitle: encodeURIComponent(pageTitle),
  };
}

export function buildWikipediaExtractUrl(sourceUrl: string) {
  const parsed = parseWikipediaSourceUrl(sourceUrl);
  return {
    pageTitle: parsed.pageTitle,
    sourceUrl: parsed.sourceUrl,
    url:
      `${parsed.apiOrigin}/w/api.php?action=query&prop=extracts|info&inprop=url` +
      `&titles=${parsed.encodedTitle}&explaintext=1&exsectionformat=plain&redirects=1&format=json&formatversion=2`,
  };
}

export async function fetchWikipediaPlainExtract(sourceUrl: string): Promise<WikipediaPageExtract> {
  const { url, sourceUrl: normalizedSourceUrl } = buildWikipediaExtractUrl(sourceUrl);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'psych-dev-site timeline biography importer',
    },
  });

  if (!response.ok) {
    throw new Error('Не удалось загрузить статью с Wikipedia.');
  }

  const payload = (await response.json()) as {
    query?: {
      pages?: Array<{
        title?: string;
        extract?: string;
        fullurl?: string;
        missing?: boolean;
      }>;
    };
  };

  const page = payload.query?.pages?.[0];
  if (!page || page.missing || !page.extract?.trim()) {
    throw new Error('Wikipedia не вернула текст статьи. Проверьте ссылку.');
  }

  return {
    title: page.title?.trim() || parseWikipediaSourceUrl(normalizedSourceUrl).pageTitle,
    extract: page.extract.trim().slice(0, MAX_WIKIPEDIA_EXTRACT_CHARS),
    canonicalUrl: page.fullurl || normalizedSourceUrl,
  };
}

export function buildBiographyTimelinePrompt(params: {
  articleTitle: string;
  sourceUrl: string;
  extract: string;
  factsSummary?: string;
}) {
  const iconCatalog = EVENT_ICON_IDS.map((iconId) => `- ${iconId}`).join('\n');
  const sphereCatalog = Object.entries(SPHERE_META)
    .map(([sphere, meta]) => `- ${sphere}: ${meta.label} ${meta.emoji}`)
    .join('\n');

  return `Ты проектируешь насыщенный, но фактически точный life timeline для визуального инструмента.

ЗАДАЧА
Преобразуй биографию известного человека в структуру для интерактивного "дерева жизни".

КАК РАБОТАЕТ ИНСТРУМЕНТ
1. Есть главная вертикальная линия жизни: на ней должны быть только самые важные опорные события, которые помогают быстро прочитать весь жизненный путь.
2. Есть дополнительные ветки: они не контрфактические, а тематические. Используй их, чтобы показать параллельные линии жизни по сферам.
3. Каждая ветка должна быть посвящена одной сфере жизни и содержать только фактические события из этой сферы.
4. Ветки нужны, чтобы раскрыть потенциал инструмента: показывай длительные сюжетные линии, которые шли параллельно главной биографии.
5. Не дублируй одно и то же событие и на главной линии, и в ветке без необходимости.
6. Если информации в источнике недостаточно, лучше опусти событие, чем выдумывай.
7. Код сам разложит ветки в разные боковые линии, поэтому твоя задача — логично сгруппировать события по сферам и не создавать две почти одинаковые ветки.

ЧТО СЧИТАЕТСЯ СОБЫТИЕМ
- Событие — это отдельная биографическая веха, которую можно локализовать по году или возрасту и которая меняет сюжет жизни.
- Хорошие события: рождение, поступление, выпуск, переезд, ссылка, брак, публикация конкретного произведения, назначение, крупный успех, болезнь, дуэль, смерть.
- Плохие события: энциклопедическое описание личности, общий пересказ творчества, длинный обзор периода без одного факта, повтор того же факта другими словами.
- Одно событие = один факт. Не склеивай два разных факта в один label.

ФОРМАТ LABEL (КРИТИЧЕСКИ ВАЖНО)
- label — это ЗАГОЛОВОК события для визуального холста, а НЕ предложение из статьи.
- label должен быть 2-7 слов, как заголовок в учебнике или подпись на оси времени.
- ЗАПРЕЩЕНО копировать предложения из Wikipedia в label. Предложения идут в notes.
- Хорошие labels: "Рождение", "Поступление в Царскосельский лицей", "Публикация «Евгений Онегин»", "Болдинская осень", "Брак с Натальей Гончаровой", "Дуэль и смерть".
- Плохие labels: "В 1820 году Пушкин был отправлен...", "С 1816 года, вслед за Жуковским, он обращается к элегиям...", "Для поправления здоровья Раевские вывозят в конце мая 1820 года больного поэта...".
- notes — это место для развёрнутого описания (1-2 предложения). label — только краткий заголовок.

ФОРМАТ SPHERE
- Каждому событию ОБЯЗАТЕЛЬНО назначай sphere из списка ниже. Не оставляй sphere пустым.
- Если событие не подходит ни к одной конкретной сфере, используй "other", но это должно быть редким исключением.

ЧТО НУЖНО СДЕЛАТЬ
1. Определи subjectName и canvasName.
2. Выдели дату и место рождения, если они есть.
3. Если человек умер, currentAge должен быть равен возрасту на момент смерти. Если жив, используй текущий возраст.
4. Выбери selectedPeriodization из списка [${TIMELINE_PERIODIZATION_IDS.join(', ')}] или null.
   Предпочитай "erikson" как универсальный вариант для целостной биографии, если это помогает.
5. Построй mainEvents:
   - Делай плотность адаптивной: если статья богата фактами, дай 10-15 сильных событий; если биография действительно sparse, можно 6-8, но только без пустого заполнения.
   - События на главной линии должны быть хронологическими и покрывать всю жизнь РАВНОМЕРНО.
   - Это должны быть вехи: рождение, обучение, ключевые публикации/прорывы, ссылки/опалы, брак, переломы судьбы, кризисы, смерть и т.д.
   - КРИТИЧЕСКИ ВАЖНО: главная линия обязана покрывать ВСЕ периоды жизни:
     * Детство и юность (0-18): рождение, семья, школа, формирующие события.
     * Становление (18-30): образование, начало карьеры, первые достижения.
     * Зрелость (30+): кульминация, кризисы, поздние конфликты, финал жизни.
   - Не концентрируй всё в одном периоде. Если в детстве или поздней жизни есть факты — используй их.
   - Если человек умер и это видно из текста, в конце mainEvents обязательно должно быть терминальное событие смерти/дуэли/гибели.
   - Перед смертью должны быть отражены причины: конфликты, долги, кризисы — всё, что привело к финалу.
6. Построй branches:
   - 1-5 веток, только если они реально обоснованы текстом.
   - Каждая ветка должна быть строго в одной сфере.
   - sourceMainEventIndex должен ссылаться на реальное запускающее событие mainEvents, из которого тема начинает расти. Не привязывай ветку к случайной соседней вехе.
   - Ветка должна показывать длительное развитие одной темы: например, образование, литературная карьера, семья, переезды, здоровье.
   - Не создавай несколько веток с одинаковой сферой, если это можно выразить одной насыщенной веткой.
   - События внутри ветки располагай по возрастанию возраста.
   - Избегай наложения почти одновременных событий в одной ветке без необходимости: если в один возраст произошло много фактов, выбери самые важные.
   - Не перегружай: лучше меньше, но содержательнее.
7. notes делай краткими, фактологичными и полезными для чтения на холсте.
8. isDecision=true ставь там, где явно был осознанный выбор или поворотный шаг самого человека.
9. iconId заполняй только когда есть сильное соответствие событию. Иначе пропускай поле.
10. canvasName делай коротким и удобным для списка холстов, обычно 1-4 слова.

ДОСТУПНЫЕ СФЕРЫ
${sphereCatalog}

ДОСТУПНЫЕ iconId
${iconCatalog}

ОГРАНИЧЕНИЯ КАЧЕСТВА
- Не выдумывай даты, места или события.
- Если дата неточная, можно дать год или приблизительное словесное описание в notes, но age всё равно должен быть разумно оценён по источнику.
- Следи за хронологией.
- Делай timeline богатым, но не захламлённым.
- Не используй первую энциклопедическую фразу статьи как событие.
- Не дублируй один и тот же факт в mainEvents и branches.
- Не создавай generic label вроде "Обучение", "Публикация", "Карьерный этап", если можно назвать событие точнее.
- Предпочитай конкретные labels: "Поступление в Царскосельский лицей", "Публикация «Евгений Онегин»", "Брак с Натальей Гончаровой", "Дуэль и смерть".
- Если main event уже фиксирует факт, branch event должен его раскрывать, а не повторять теми же словами.
- Если статья даёт мало фактов, верни меньше событий. Если фактов много, используй это и делай путь длиннее и содержательнее.
- Возраст лучше задавать целыми годами; дроби используй только когда это действительно нужно для разведения двух разных событий одного периода.
- Не возвращай markdown, только JSON по схеме.

ПРИМЕР ХОРОШЕГО РЕЗУЛЬТАТА
Это обезличенный пример структуры. Сохрани логику и качество, но не копируй факты:
${BIOGRAPHY_TIMELINE_FEW_SHOT_EXAMPLE}

ИСТОЧНИК
Статья: ${params.articleTitle}
URL: ${params.sourceUrl}

НОРМАЛИЗОВАННЫЕ ФАКТЫ
${params.factsSummary?.trim() || 'Факты не выделены отдельно, опирайся только на текст статьи.'}

ТЕКСТ СТАТЬИ
${params.extract}`;
}

export function buildBiographyTimelineLinePrompt(params: {
  articleTitle: string;
  sourceUrl: string;
  extract: string;
  factsSummary?: string;
}) {
  return `Ты преобразуешь биографию в простой построчный формат для life timeline.

ВАЖНО
- Верни только plain text.
- Не используй markdown, json, yaml, code fences.
- Один факт = одна строка.
- Разделитель полей: TAB.
- Не используй TAB внутри значений.
- Если поле пустое, оставь пустое место между TAB.
- Для boolean используй только true или false.
- Для отсутствующего periodization используй null.
- Для отсутствующего iconId используй пустое поле.
- Для отсутствующего notes используй пустое поле.
- Не выдумывай факты.

ФОРМАТ СТРОК
SUBJECT<TAB>subjectName
CANVAS<TAB>canvasName
CURRENT_AGE<TAB>number
PERIODIZATION<TAB>piaget|vygotsky|erikson|freud|montessori|gesell|kohlberg|null
BIRTH<TAB>date<TAB>place<TAB>notes

MAIN<TAB>age<TAB>label<TAB>sphere<TAB>isDecision<TAB>iconId<TAB>notes

BRANCH<TAB>branchKey<TAB>label<TAB>sphere<TAB>sourceMainEventIndex
BRANCH_EVENT<TAB>branchKey<TAB>age<TAB>label<TAB>sphere<TAB>isDecision<TAB>iconId<TAB>notes

ОГРАНИЧЕНИЯ
- MAIN должен покрывать раннюю, среднюю и позднюю жизнь.
- Если человек умер, последняя сильная MAIN-веха должна отражать смерть/дуэль/гибель.
- Количество MAIN адаптивное: 8-14 для богатой биографии, 5-7 для sparse, без выдумывания фактов.
- 1-5 веток BRANCH только если реально нужны.
- Одна ветка = одна сфера.
- Не дублируй один и тот же факт в MAIN и BRANCH_EVENT.
- Не используй generic labels вроде "Обучение" или "Публикация", если можно назвать факт конкретнее.
- Одно событие = один факт. Не склеивай публикацию и ссылку в одну строку.
- Не используй первую энциклопедическую фразу статьи как MAIN-событие.
- Сферы только из:
education
career
family
health
friends
place
finance
hobby
other

ПРИМЕР ЛОГИКИ
- MAIN = опорные вехи всей жизни.
- BRANCH = отдельная тематическая линия, идущая от конкретной MAIN-вехи.
- Не повторяй один и тот же факт в MAIN и BRANCH_EVENT.
- Не пропускай позднюю жизнь и смерть, если они есть в биографии.

ИСТОЧНИК
Статья: ${params.articleTitle}
URL: ${params.sourceUrl}

НОРМАЛИЗОВАННЫЕ ФАКТЫ
${params.factsSummary?.trim() || 'Факты не выделены отдельно, опирайся только на текст статьи.'}

ТЕКСТ СТАТЬИ
${params.extract}`;
}

export function buildBiographyFactExtractionPrompt(params: {
  articleTitle: string;
  sourceUrl: string;
  extract: string;
}) {
  return `Ты извлекаешь биографические факты для дальнейшей сборки life timeline.

ВАЖНО
- Верни только plain text.
- Не используй markdown, json, yaml, code fences.
- Один факт = одна строка FACT.
- Не пересказывай статью целиком.
- Не включай энциклопедический лид вроде "X — русский поэт...".
- Выбирай только факты, которые действительно можно превратить в событие таймлайна.
- Покрой раннюю, среднюю и позднюю жизнь.
- Если человек умер, обязательно включи факт смерти.
- Если источник богатый, можно дать 12-20 фактов. Если бедный — меньше, но без выдумывания.

ФОРМАТ
SUBJECT<TAB>subjectName
BIRTH_YEAR<TAB>year|unknown
DEATH_YEAR<TAB>year|unknown
FACT<TAB>year<TAB>age_or_unknown<TAB>category<TAB>sphere<TAB>importance(high|medium|low)<TAB>labelHint<TAB>details

category — короткая категория факта:
birth
education
move
publication
career
family
health
conflict
award
project
death
other

sphere — только из:
education
career
family
health
friends
place
finance
hobby
other

ПРИМЕР
SUBJECT\tЧеловек А
BIRTH_YEAR\t1956
DEATH_YEAR\t2024
FACT\t1956\t0\tbirth\tfamily\thigh\tРождение\tРодился в Городе А.
FACT\t1967\t11\teducation\teducation\thigh\tПоступление в лицей\tНачал системное обучение.
FACT\t1974\t18\tmove\tplace\thigh\tПереезд в столицу\tПереехал ради учёбы и работы.
FACT\t1980\t24\tcareer\tcareer\thigh\tПервый профессиональный прорыв\tПолучил широкое признание.
FACT\t1987\t31\tfamily\tfamily\thigh\tБрак\tСоздал семью.
FACT\t2024\t68\tdeath\thealth\thigh\tСмерть\tЗавершение жизненного пути.

ИСТОЧНИК
Статья: ${params.articleTitle}
URL: ${params.sourceUrl}

ТЕКСТ СТАТЬИ
${params.extract}`;
}

export function buildBiographyTimelineReviewPrompt(params: {
  articleTitle: string;
  sourceUrl: string;
  factsSummary: string;
  draftPlanJson: string;
  issues: string[];
}) {
  return `Ты проверяешь и исправляешь уже собранный life timeline plan.

ЗАДАЧА
- Посмотри на facts summary и на draft JSON.
- Исправь только реальные проблемы.
- Сохрани формат JSON, но сделай результат качественнее.

ЧЕК-ЛИСТ ПРОБЛЕМ
${params.issues.map((issue) => `- ${issue}`).join('\n')}

ПРАВИЛА
- label — это ЗАГОЛОВОК события (2-7 слов), НЕ предложение из статьи. Предложения идут в notes.
- ЗАПРЕЩЕНО: label вида "В 1820 году Пушкин был отправлен...". Правильно: "Южная ссылка".
- Не дублируй один и тот же факт в mainEvents и branches.
- Не оставляй generic labels, если можно назвать событие конкретнее.
- Одна ветка = одна сфера.
- Каждому событию обязательно назначай sphere (не оставляй пустым).
- Если человек умер, в конце mainEvents должно быть terminal event.
- mainEvents должны РАВНОМЕРНО покрывать всю жизнь: детство, становление, зрелость. Не пропускай позднюю жизнь.
- Перед смертью/финалом должны быть отражены причины: конфликты, кризисы, события, приведшие к развязке.
- Если в детстве были значимые события (семья, учёба), включи их.
- 10-15 mainEvents для богатой биографии — нормальное количество.
- Не копируй факты из примера; используй только facts summary и draft JSON.

ПРИМЕР КАЧЕСТВА
${BIOGRAPHY_TIMELINE_FEW_SHOT_EXAMPLE}

FACTS SUMMARY
${params.factsSummary}

DRAFT JSON
${params.draftPlanJson}

Верни только исправленный JSON-объект по той же схеме, без markdown и без пояснений.`;
}

function normalizeSphere(sphere: unknown): TimelineSphere | undefined {
  return typeof sphere === 'string' && sphere in SPHERE_META ? (sphere as TimelineSphere) : undefined;
}

function normalizeIcon(iconId: unknown): TimelineIconId | undefined {
  return typeof iconId === 'string' && EVENT_ICON_IDS.includes(iconId as TimelineIconId)
    ? (iconId as TimelineIconId)
    : undefined;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function overlapsAgeRange(a: OccupiedBranchLane, startAge: number, endAge: number) {
  return !(a.endAge + 1 < startAge || endAge + 1 < a.startAge);
}

function pickBranchX(sphere: TimelineSphere, startAge: number, endAge: number, occupied: OccupiedBranchLane[]) {
  const slotOrder = BRANCH_SLOT_ORDER[sphere] || BRANCH_SLOT_ORDER.other;
  for (const slotIndex of slotOrder) {
    const x = LINE_X_POSITION + BRANCH_X_OFFSETS[slotIndex];
    const collides = occupied.some((lane) => lane.x === x && overlapsAgeRange(lane, startAge, endAge));
    if (!collides) {
      occupied.push({ x, startAge, endAge });
      return x;
    }
  }

  const x = LINE_X_POSITION + BRANCH_X_OFFSETS[slotOrder[0] ?? 0];
  occupied.push({ x, startAge, endAge });
  return x;
}

function sanitizeTimelineEventPlan(
  event: BiographyTimelineEventPlan,
  fallbackSphere?: TimelineSphere
): BiographyTimelineEventPlan | null {
  if (!Number.isFinite(event.age)) return null;

  const label = normalizeText(event.label, 60);
  if (!label) return null;

  return postProcessModelEvent({
    age: Math.max(0, Math.min(120, Number(event.age))),
    label,
    notes: normalizeText(event.notes, 700),
    sphere: normalizeSphere(event.sphere) ?? fallbackSphere,
    isDecision: Boolean(event.isDecision),
    iconId: normalizeIcon(event.iconId),
  });
}

/** Detect if a label looks like a raw sentence copied from Wikipedia */
function isRawSentenceLabel(label: string) {
  if (label.length > 55) return true;
  if (/^\d{1,2}\s+[а-яё]+\s+\d{4}/u.test(label)) return true;
  if (/^(?:В|С|К|После|Весной|Летом|Осенью|Зимой)\s+\d{4}/u.test(label)) return true;
  if (/^[А-ЯЁ][а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+\s+[а-яё]+/u.test(label)) return true;
  return false;
}

/** Post-process a model-generated event: fix label, sphere, icon */
function postProcessModelEvent(event: BiographyTimelineEventPlan): BiographyTimelineEventPlan {
  let { label, sphere, iconId } = event;
  const source = event.notes || event.label;

  // Fix raw sentence labels by re-generating from heuristic logic
  if (isRawSentenceLabel(label)) {
    const betterLabel = buildHeuristicLabel(source, sphere ?? 'other');
    if (betterLabel && betterLabel.length <= 50) {
      label = betterLabel;
    }
  }

  // Re-infer sphere if it's "other" or missing
  if (!sphere || sphere === 'other') {
    const inferred = inferSphereFromSentence(source);
    if (inferred !== 'other') {
      sphere = inferred;
    }
  }

  // Assign icon if missing
  if (!iconId && sphere) {
    iconId = inferIconFromSentence(source, sphere ?? 'other');
  }

  return { ...event, label, sphere, iconId };
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function extractQuotedWorkTitle(value: string) {
  return value.match(/[«"](.*?)[»"]/u)?.[1]?.trim();
}

function normalizeFactText(value: string) {
  return normalizeWhitespace(value.toLowerCase())
    .replace(/[«»"'`().,:;!?-]/g, ' ')
    .replace(/\b(году|года|лет|event|main|branch|публикация|обучение|карьерный|этап|жизнь)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildEventFactKey(event: Pick<BiographyTimelineEventPlan, 'age' | 'label' | 'notes'>) {
  const title = extractQuotedWorkTitle(event.label) || (event.notes ? extractQuotedWorkTitle(event.notes) : undefined);
  const normalizedAge = Math.round(Number(event.age) * 2) / 2;
  if (title) {
    return `${normalizedAge}|work|${normalizeFactText(title)}`;
  }

  const sourceText = normalizeFactText(event.notes || event.label);
  return `${normalizedAge}|fact|${sourceText.slice(0, 96)}`;
}

function hasTerminalLifeEvent(events: BiographyTimelineEventPlan[], currentAge: number) {
  const terminalEvent = events.find((event) =>
    /(смерт|гибел|погиб|умер|дуэл|died|death|killed)/i.test(`${event.label} ${event.notes ?? ''}`)
  );

  if (!terminalEvent) return false;
  return Math.abs(terminalEvent.age - currentAge) <= 1.5;
}

function splitBiographyExtractIntoSentences(extract: string) {
  return extract
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 12);
}

function extractYears(sentence: string) {
  return [...sentence.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((year, index, years) => year >= 1000 && year <= 2099 && years.indexOf(year) === index);
}

function reorderCommaSeparatedName(name: string) {
  const parts = name.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name.trim();
}

function inferSubjectName(articleTitle: string) {
  const trimmed = normalizeWhitespace(articleTitle);
  return reorderCommaSeparatedName(trimmed);
}

function inferCanvasName(subjectName: string) {
  const parts = subjectName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 1]} ${parts[0]}`.slice(0, 40);
  }
  return subjectName.slice(0, 40);
}

function inferBirthDetailsFromExtract(extract: string) {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const birthSentence = sentences.find((sentence) => /родил|born/i.test(sentence)) ?? sentences[0] ?? '';
  const years = extractYears(birthSentence);
  const birthYear = years[0];
  const fullDateMatch = birthSentence.match(
    /(\d{1,2}\s+[A-Za-zА-Яа-яЁё]+(?:\s+\d{4})?|\d{4})/
  );
  const placeMatch =
    birthSentence.match(/родил[а-яёa-z]*\s+(?:в|in)\s+([^,.();]+?)(?:\s+(?:в|in)\s+\d{4}\b|[,.();]|$)/i) ??
    birthSentence.match(/\(\s*[^,]+,\s*([^—,)]+?)(?:\s*[—,)])/);

  return {
    birthYear,
    birthDetails: {
      date: fullDateMatch?.[1] ? normalizeWhitespace(fullDateMatch[1]) : undefined,
      place: placeMatch?.[1] ? normalizeWhitespace(placeMatch[1]) : undefined,
    },
  };
}

function inferDeathYearFromExtract(extract: string) {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const deathSentence = sentences.find((sentence) => /умер|скончал|погиб|смерт|дуэл|died|killed|death/i.test(sentence));
  const years = deathSentence ? extractYears(deathSentence) : [];
  return years[0];
}

function isLikelyTimelineEventSentence(sentence: string) {
  const normalized = sentence.toLowerCase();
  const hasYear = extractYears(sentence).length > 0;
  const hasAction = /(родил|born|поступ|окончил|учил|опублик|издал|написал|создал|стал|назнач|служ|ссыл|переех|вернул|женил|брак|родил[а-яё]* сына|родил[а-яё]* дочь|умер|погиб|скончал|болез|дуэл|died|moved|married|published|appointed|founded|returned|exile|injur)/i.test(
    sentence
  );
  const looksLikeLead =
    hasYear &&
    /—/.test(sentence) &&
    /(поэт|писател|драматург|автор|historian|poet|writer|novelist|composer|artist)/i.test(normalized) &&
    !hasAction;

  if (!hasYear) return false;
  if (looksLikeLead) return false;
  if (!hasAction && sentence.length > 180) return false;

  return true;
}

function inferSphereFromSentence(sentence: string): TimelineSphere {
  const normalized = sentence.toLowerCase();

  if (/(родил|born)/i.test(normalized)) {
    return 'family';
  }
  if (/(лице|школ|универс|академ|институт|учил|образован|graduat|school|college|stud)/i.test(normalized)) {
    return 'education';
  }
  if (/(женил|брак|свад|семь|сын|доч|married|family|wife|husband|children)/i.test(normalized)) {
    return 'family';
  }
  if (/(умер|погиб|скончал|дуэл|болез|ранен|died|death|ill|injur)/i.test(normalized)) {
    return 'health';
  }
  if (
    /(ссыл|сослан|переех|эмигр|путешеств|жил в|вернул|москв|петербург|одесс|кишин|молдов|крым|кавказ|михайл|болдин|царск|travel|moved|exile|relocat)/i.test(
      normalized
    )
  ) {
    return 'place';
  }
  if (/(друж|друз|кружок|общество|арзамас|лампа|салон|friend|circle|acquaint)/i.test(normalized)) {
    return 'friends';
  }
  if (/(денег|финанс|банк|состояни|долг|наследств|fund|money|finance|wealth)/i.test(normalized)) {
    return 'finance';
  }
  if (/(арест|тюрьм|суд|следств|надзор|полиц|цензур|запрет|prison|arrest|trial|censor)/i.test(normalized)) {
    return 'career';
  }
  if (/(рисова|музык|театр|хобб|спорт|painting|music|sport|hobby)/i.test(normalized)) {
    return 'hobby';
  }
  if (
    /(опублик|издал|поэм|роман|стих|пьес|произвед|книг|журнал|повест|драм|элег|трагед|заверш|начал работу|назнач|стал|служ|карьер|published|poem|novel|book|work|career|appointed|founded)/i.test(
      normalized
    )
  ) {
    return 'career';
  }

  return 'other';
}

function inferDecisionFromSentence(sentence: string) {
  return /(поступил|начал|решил|женил|переех|опублик|издал|основал|вернул|стал|entered|began|decided|married|moved|published|founded|became)/i.test(
    sentence
  );
}

function inferIconFromSentence(sentence: string, sphere: TimelineSphere): TimelineIconId | undefined {
  if (/родил|born/i.test(sentence)) return 'baby-feet';
  if (/женил|брак|свад/i.test(sentence)) return 'wedding-rings';
  if (/лице|школ|универс|академ|учил/i.test(sentence)) return 'school-backpack';
  if (/опублик|издал|поэм|роман|стих|книг|произвед/i.test(sentence)) return 'idea-book';
  if (/ссыл|переех|эмигр|travel|moved/i.test(sentence)) return 'passport';
  if (/умер|погиб|дуэл|болез/i.test(sentence)) return 'thermometer';
  if (sphere === 'career') return 'briefcase';
  return undefined;
}

function buildHeuristicLabel(sentence: string, sphere: TimelineSphere) {
  const workTitle = extractQuotedWorkTitle(sentence);
  const location =
    sentence.match(/\b(?:в|на|из)\s+([А-ЯЁA-Z][^,.();:]{2,50})/u)?.[1]?.trim().replace(/\s+/g, ' ') ?? undefined;
  const spouse =
    sentence.match(/\bс\s+([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,2})/u)?.[1]?.trim() ?? undefined;
  const institution =
    sentence.match(
      /\b((?:Царскосельск[^\s,.;:)]*\s+)?(?:лице[йя]|школ[ауые]|университет[а-я]*|академи[яию]|институт[а-я]*))\b/u
    )?.[1] ?? undefined;

  if (/родил|born/i.test(sentence)) return 'Рождение';
  if (/дуэл/i.test(sentence) && /умер|погиб|скончал|died/i.test(sentence)) return 'Дуэль и смерть';
  if (/умер|скончал|погиб|died/i.test(sentence)) return 'Смерть';
  if (/женил|брак|свад/i.test(sentence)) return spouse ? `Брак с ${spouse}` : 'Брак';
  if (/под надзор/i.test(sentence)) return 'Полицейский надзор';
  if (/путешеств|поездк|поехал|отправился/i.test(sentence) && location) return `Поездка в ${location}`;
  if (/войн/i.test(sentence) && /отправился|поехал/i.test(sentence)) return 'Поездка на войну';
  if (/сослан|ссыл/i.test(sentence)) return location ? `Ссылка в ${location}` : 'Ссылка';
  if (/переех|эмигр|relocat|moved/i.test(sentence)) return location ? `Переезд в ${location}` : 'Переезд';
  if (/поступ/i.test(sentence) && institution) return `Поступление в ${institution}`;
  if (/(окончил|выпустил|выпуск)/i.test(sentence) && institution) return `Окончание ${institution}`;
  if (/лице|школ|универс|академ|институт|учил/i.test(sentence) && institution) return `Учёба в ${institution}`;
  if (/лице|школ|универс|академ|институт|учил/i.test(sentence)) return 'Учёба';
  if (/вступил в .*общество|арзамас|зел[её]ная лампа/i.test(sentence)) return 'Литературный круг';
  if (/элег|лирик/i.test(sentence)) return 'Литературный поворот';
  if (/предложени/i.test(sentence) && /гончаров/i.test(sentence)) return 'Предложение Наталье Гончаровой';
  if (/ссора/i.test(sentence) && /тёщ/i.test(sentence)) return 'Ссора с тёщей';
  if (workTitle && sphere === 'career') return `Публикация «${workTitle}»`;
  if (/заверш[а-я]+\s+.*борис[а-яё ]+годунов/i.test(sentence)) return 'Завершение «Бориса Годунова»';
  if (/начал работу/i.test(sentence) && workTitle) return `Начало работы над «${workTitle}»`;
  if (/опублик|издал|поэм|роман|стих|книг|произвед|published/i.test(sentence)) {
    return location ? `Публикация в ${location}` : 'Новая публикация';
  }
  if (/назнач|стал|служ|карьер|became|appointed/i.test(sentence)) return 'Новый карьерный этап';
  if (/долг|обязательств|финанс|денег|money|finance/i.test(sentence)) return 'Финансовое давление';
  if (/арест|тюрьм|prison|arrest/i.test(sentence)) return 'Арест';
  if (/цензур|запрет|censor/i.test(sentence)) return 'Цензурные ограничения';
  if (/наград|орден|award|prize/i.test(sentence)) return 'Награждение';
  if (/друж|кружок|общество|арзамас|лампа/i.test(sentence)) return 'Литературный круг';
  if (/ребён|сын|дочь|child|son|daughter/i.test(sentence)) return spouse ? `Рождение ребёнка` : 'Рождение ребёнка';

  // Try to extract a meaningful short phrase before truncating
  const cleaned = normalizeWhitespace(
    sentence
      .replace(/\([^)]*\)/g, '')
      .replace(/^(?:В|С|К|После|До|Около)\s+\d{4}\s+(?:году?|годах|годов),?\s*/u, '')
      .replace(/^\d{1,2}\s+[А-Яа-яЁё]+\s+\d{4}\s+года,?\s*/u, '')
      .replace(/^(?:В этот период|В это время|В том же году|Тогда же),?\s*/u, '')
  );

  // If cleaning produced something short enough, use it
  if (cleaned.length <= 50) return cleaned;

  // Try to extract a label from the first clause (before first comma or dash)
  const firstClause = cleaned.split(/[,;—–]/, 1)[0]?.trim();
  if (firstClause && firstClause.length >= 5 && firstClause.length <= 50) return firstClause;

  // Try to extract subject + verb phrase (first ~5 words)
  const words = cleaned.split(/\s+/);
  if (words.length > 7) {
    const shortPhrase = words.slice(0, 5).join(' ');
    if (shortPhrase.length <= 50) return shortPhrase;
  }

  return cleaned.length > 50 ? `${cleaned.slice(0, 47).trimEnd()}...` : cleaned;
}

function inferChronologicalEventsFromExtract(extract: string, birthYear?: number) {
  const sentences = splitBiographyExtractIntoSentences(extract);
  const events: BiographyTimelineEventPlan[] = [];

  sentences.forEach((sentence) => {
    if (!isLikelyTimelineEventSentence(sentence)) return;

    const years = extractYears(sentence);
    if (years.length === 0) return;

    const year = years[0];
    const age = birthYear ? year - birthYear : 0;
    if (birthYear && (age < 0 || age > 120)) return;

    const sphere = inferSphereFromSentence(sentence);
    const label = buildHeuristicLabel(sentence, sphere);
    const event = sanitizeTimelineEventPlan({
      age,
      label,
      notes: sentence,
      sphere,
      isDecision: inferDecisionFromSentence(sentence),
      iconId: inferIconFromSentence(sentence, sphere),
    });

    if (event) {
      events.push(event);
    }
  });

  const deduped = new Map<string, BiographyTimelineEventPlan>();
  events.forEach((event) => {
    const key = `${event.age}:${event.label}`;
    if (!deduped.has(key)) {
      deduped.set(key, event);
    }
  });

  return [...deduped.values()].sort((a, b) => a.age - b.age);
}

function selectEventsForLifeCoverage(events: BiographyTimelineEventPlan[]) {
  if (events.length <= 5) return events;

  const targetCount =
    events.length >= 20 ? 15 : events.length >= 16 ? 13 : events.length >= 12 ? 10 : Math.max(6, events.length);

  if (events.length <= targetCount) return events;

  const selectedIndexes = new Set<number>([0, events.length - 1]);
  const birthIndex = events.findIndex((event) => event.age === 0);
  const terminalIndex = events.findIndex((event) =>
    /(смерт|гибел|погиб|умер|дуэл|died|death|killed)/i.test(`${event.label} ${event.notes ?? ''}`)
  );

  if (birthIndex >= 0) selectedIndexes.add(birthIndex);
  if (terminalIndex >= 0) selectedIndexes.add(terminalIndex);

  while (selectedIndexes.size < targetCount) {
    const progress = selectedIndexes.size / Math.max(targetCount - 1, 1);
    const targetIndex = Math.round(progress * (events.length - 1));
    let offset = 0;

    while (offset < events.length) {
      const left = targetIndex - offset;
      const right = targetIndex + offset;
      if (left >= 0 && !selectedIndexes.has(left)) {
        selectedIndexes.add(left);
        break;
      }
      if (right < events.length && !selectedIndexes.has(right)) {
        selectedIndexes.add(right);
        break;
      }
      offset += 1;
    }
  }

  return [...selectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => events[index])
    .filter(Boolean);
}

export function buildHeuristicBiographyFacts(extract: string, articleTitle: string): BiographyTimelineFact[] {
  const subjectName = inferSubjectName(articleTitle);
  const { birthYear } = inferBirthDetailsFromExtract(extract);
  const events = inferChronologicalEventsFromExtract(extract, birthYear);

  return events.map((event) => {
    const normalizedText = `${event.label} ${event.notes ?? ''}`.toLowerCase();
    const category =
      event.age === 0
        ? 'birth'
        : /(смерт|гибел|погиб|умер|дуэл)/i.test(normalizedText)
          ? 'death'
          : /(поступ|учёб|лицей|универс|школ)/i.test(normalizedText)
            ? 'education'
            : /(переезд|ссыл|одесс|кишин|петербург|болдин|москв|крым|кавказ)/i.test(normalizedText)
              ? 'move'
              : /(брак|женить|венч|дочь|сын|семь)/i.test(normalizedText)
                ? 'family'
                : /(публик|поэм|роман|повест|трагед|журнал|произвед)/i.test(normalizedText)
                  ? 'publication'
                  : event.sphere ?? 'other';

    return {
      year: birthYear ? birthYear + Math.round(event.age) : undefined,
      age: event.age,
      sphere: event.sphere,
      category,
      labelHint: event.label,
      details: event.notes || event.label,
      importance:
        event.age === 0 || /(смерт|гибел|умер|дуэл|брак|поступ|публик)/i.test(normalizedText) ? 'high' : 'medium',
    };
  });
}

export function summarizeBiographyFacts(facts: BiographyTimelineFact[], articleTitle: string) {
  const subjectName = inferSubjectName(articleTitle);
  const birthYear = facts.find((fact) => fact.category === 'birth')?.year;
  const deathYear = facts.find((fact) => fact.category === 'death')?.year;
  const headerLines = [
    `SUBJECT\t${subjectName}`,
    `BIRTH_YEAR\t${birthYear ?? 'unknown'}`,
    `DEATH_YEAR\t${deathYear ?? 'unknown'}`,
  ];

  const factLines = facts.map((fact) =>
    [
      'FACT',
      fact.year ?? 'unknown',
      Number.isFinite(fact.age) ? fact.age : 'unknown',
      fact.category,
      fact.sphere ?? 'other',
      fact.importance,
      fact.labelHint,
      fact.details.replace(/\t+/g, ' ').trim(),
    ].join('\t')
  );

  return [...headerLines, ...factLines].join('\n');
}

function buildHeuristicBiographyPlan(params: {
  articleTitle: string;
  extract: string;
  fallbackCurrentAge: number;
}): BiographyTimelinePlan {
  const subjectName = inferSubjectName(params.articleTitle);
  const canvasName = inferCanvasName(subjectName);
  const { birthYear, birthDetails } = inferBirthDetailsFromExtract(params.extract);
  const deathYear = inferDeathYearFromExtract(params.extract);
  const inferredCurrentAge =
    birthYear && deathYear
      ? Math.max(0, Math.min(120, deathYear - birthYear))
      : birthYear
        ? Math.max(0, Math.min(120, new Date().getFullYear() - birthYear))
        : params.fallbackCurrentAge;

  const extractedEvents = inferChronologicalEventsFromExtract(params.extract, birthYear);
  const mainEvents = selectEventsForLifeCoverage(extractedEvents);
  const usedKeys = new Set(mainEvents.map((event) => buildEventFactKey(event)));
  const branchCandidates = extractedEvents.filter((event) => !usedKeys.has(buildEventFactKey(event)));
  const branchSourceEvents =
    branchCandidates.length > 0
      ? branchCandidates
      : mainEvents.filter((event) => event.age > 0 && (event.sphere ?? 'other') !== 'other');

  const branches = Object.entries(
    branchSourceEvents.reduce<Record<string, BiographyTimelineEventPlan[]>>((acc, event) => {
      const sphere = event.sphere ?? 'other';
      if (sphere === 'other') return acc;
      acc[sphere] ??= [];
      acc[sphere].push(event);
      return acc;
    }, {})
  )
    .map(([sphere, events]) => {
      const firstAge = events[0]?.age ?? 0;
      const sourceMainEventIndex = Math.max(
        0,
        mainEvents.findIndex((event, index) => {
          const nextAge = mainEvents[index + 1]?.age ?? Number.POSITIVE_INFINITY;
          return event.age <= firstAge && nextAge > firstAge;
        })
      );

      return {
        label: SPHERE_META[sphere as TimelineSphere]?.label ?? sphere,
        sphere: sphere as TimelineSphere,
        sourceMainEventIndex,
        events: selectEventsForLifeCoverage(events).slice(0, 5),
      };
    })
    .filter((branch) => branch.events.length >= 1)
    .slice(0, 4);

  if (birthYear && !mainEvents.some((event) => event.age === 0)) {
    mainEvents.unshift({
      age: 0,
      label: 'Рождение',
      notes: birthDetails.place ? `Родился(ась) в ${birthDetails.place}.` : 'Рождение',
      sphere: 'family',
      isDecision: false,
      iconId: 'baby-feet',
    });
  }

  if (birthYear && deathYear && !hasTerminalLifeEvent(mainEvents, inferredCurrentAge)) {
    const deathSentence = splitBiographyExtractIntoSentences(params.extract).find((sentence) =>
      /умер|скончал|погиб|смерт|дуэл|died|killed|death/i.test(sentence)
    );
    mainEvents.push({
      age: inferredCurrentAge,
      label: /дуэл/i.test(deathSentence || '') ? 'Дуэль и смерть' : 'Смерть',
      notes: deathSentence ? normalizeWhitespace(deathSentence) : 'Завершение жизненного пути.',
      sphere: 'health',
      isDecision: false,
      iconId: 'thermometer',
    });
  }

  mainEvents.sort((a, b) => a.age - b.age);

  return {
    subjectName,
    canvasName,
    currentAge: inferredCurrentAge,
    selectedPeriodization: 'erikson',
    birthDetails,
    mainEvents,
    branches,
  };
}

function countBranchEvents(branches: BiographyTimelineBranchPlan[]) {
  return branches.reduce((total, branch) => total + branch.events.length, 0);
}

export function getBiographyPlanReviewIssues(plan: BiographyTimelinePlan, extract: string) {
  const issues: string[] = [];
  const deathYear = inferDeathYearFromExtract(extract);
  const mainEvents = (plan.mainEvents || []).filter(Boolean);
  const branchFacts = (plan.branches || []).flatMap((branch) => branch.events || []);
  const mainFactKeys = new Set(mainEvents.map((event) => buildEventFactKey(event)));
  const duplicateBranchFacts = branchFacts.filter((event) => mainFactKeys.has(buildEventFactKey(event))).length;
  const genericLabels = mainEvents.filter((event) =>
    /^(Обучение|Публикация|Карьерный этап|Новый карьерный этап|Учёба|Ссылка|Переезд)$/i.test(event.label)
  ).length;
  const otherCount = mainEvents.filter((event) => (event.sphere ?? 'other') === 'other').length;
  const currentAge = Math.max(0, Math.min(120, Number(plan.currentAge) || 0));
  const lastAge = mainEvents.reduce((max, event) => Math.max(max, event.age), 0);

  if (mainEvents.length < 6) {
    issues.push('Слишком мало mainEvents для содержательной биографии; нужно покрыть жизнь плотнее.');
  }
  if (deathYear && !hasTerminalLifeEvent(mainEvents, currentAge || deathYear)) {
    issues.push('В mainEvents нет явного terminal event смерти/дуэли/гибели в конце жизни.');
  }
  if (currentAge > 0 && lastAge < currentAge - 3) {
    issues.push('Поздняя жизнь покрыта слабо: последние mainEvents заканчиваются слишком рано. Добавь события, ведущие к финалу жизни (конфликты, кризисы, причины развязки).');
  }
  const earlyLifeEvents = mainEvents.filter((event) => event.age > 0 && event.age <= 18).length;
  if (currentAge >= 30 && earlyLifeEvents < 2) {
    issues.push('Детство и юность покрыты слабо: нужно как минимум 2 события до 18 лет (учёба, семья, формирующие моменты).');
  }
  if (otherCount >= Math.max(2, Math.ceil(mainEvents.length / 3))) {
    issues.push('Слишком много событий со sphere=other; их нужно уточнить и разнести по осмысленным сферам.');
  }
  if (genericLabels > 0) {
    issues.push('Есть слишком generic labels; названия должны быть конкретными фактами, а не общими категориями.');
  }
  if (duplicateBranchFacts > 0) {
    issues.push('Ветки дублируют факты главной линии; нужно убрать повторы и оставить только раскрывающие события.');
  }
  const allEvents = [...mainEvents, ...branchFacts];
  const rawSentenceLabels = allEvents.filter((event) => event.label && event.label.length > 60).length;
  if (rawSentenceLabels > 0) {
    issues.push('Некоторые labels слишком длинные (>60 символов). label должен быть заголовком из 2-7 слов, а не предложением из статьи. Подробности идут в notes.');
  }
  const missingSphere = allEvents.filter((event) => !event.sphere).length;
  if (missingSphere > 0) {
    issues.push('Некоторые события не имеют sphere. Каждому событию нужно назначить сферу жизни.');
  }

  return issues;
}

function buildBiographyPlanDiagnostics(
  source: BiographyPlanDiagnostics['source'],
  plan: BiographyTimelinePlan
): BiographyPlanDiagnostics {
  return {
    source,
    mainEvents: plan.mainEvents.length,
    branches: plan.branches.length,
    branchEvents: countBranchEvents(plan.branches),
    hasBirthDate: Boolean(plan.birthDetails?.date),
    hasBirthPlace: Boolean(plan.birthDetails?.place),
  };
}

export function enrichBiographyPlan(params: {
  plan: BiographyTimelinePlan;
  articleTitle: string;
  extract: string;
}) {
  const heuristicPlan = buildHeuristicBiographyPlan({
    articleTitle: params.articleTitle,
    extract: params.extract,
    fallbackCurrentAge: Math.max(0, Math.min(120, Number(params.plan.currentAge) || 25)),
  });

  const inferredDeathYear = inferDeathYearFromExtract(params.extract);
  const inferredBirth = inferBirthDetailsFromExtract(params.extract);

  const sanitizedModelMainEvents = (params.plan.mainEvents || [])
    .map((event) => sanitizeTimelineEventPlan(event))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event));
  const dedupedMainEvents = new Map<string, BiographyTimelineEventPlan>();
  sanitizedModelMainEvents.forEach((event) => {
    const key = buildEventFactKey(event);
    if (!dedupedMainEvents.has(key)) {
      dedupedMainEvents.set(key, event);
    }
  });

  const normalizedMainEvents = [...dedupedMainEvents.values()].sort((a, b) => a.age - b.age);
  const mainEventKeys = new Set(normalizedMainEvents.map((event) => buildEventFactKey(event)));
  const sanitizedModelBranches = (params.plan.branches || [])
    .map((branch) => {
      const sphere = normalizeSphere(branch.sphere) ?? 'other';
      const label = normalizeText(branch.label, 120);
      const branchEventKeys = new Set<string>();
      const events = (branch.events || [])
        .map((event) => sanitizeTimelineEventPlan(event, sphere))
        .filter((event): event is BiographyTimelineEventPlan => Boolean(event));
      const normalizedEvents = events
        .map((event) => ({
          ...event,
          sphere,
        }))
        .filter((event) => {
          const factKey = buildEventFactKey(event);
          if (mainEventKeys.has(factKey) || branchEventKeys.has(factKey)) {
            return false;
          }
          branchEventKeys.add(factKey);
          return true;
        });
      if (!label || normalizedEvents.length === 0) return null;
      return {
        label,
        sphere,
        sourceMainEventIndex: Math.max(0, Number(branch.sourceMainEventIndex) || 0),
        events: normalizedEvents,
      };
    })
    .filter((branch) => branch !== null) as BiographyTimelineBranchPlan[];

  const modelCurrentAge = Math.max(0, Math.min(120, Number(params.plan.currentAge) || heuristicPlan.currentAge));
  const lateLifeCoverageThreshold = Math.max(heuristicPlan.currentAge - 4, 0);
  const hasLateLifeCoverage = normalizedMainEvents.some((event) => event.age >= lateLifeCoverageThreshold);
  const needsTerminalEvent = Boolean(inferredDeathYear && inferredBirth.birthYear);
  const hasTerminalEvent = hasTerminalLifeEvent(normalizedMainEvents, modelCurrentAge);
  const minimumMainEvents = heuristicPlan.mainEvents.length >= 8 ? 6 : Math.max(4, heuristicPlan.mainEvents.length);

  const tooFewModelEvents = normalizedMainEvents.length < minimumMainEvents;
  const useHeuristicMainEvents = tooFewModelEvents;
  const useHeuristicBranches = countBranchEvents(sanitizedModelBranches) === 0;

  // Start with model or heuristic events
  let finalMainEvents = useHeuristicMainEvents ? heuristicPlan.mainEvents : normalizedMainEvents;

  // Targeted injection: add missing birth event
  if (!finalMainEvents.some((event) => event.age === 0)) {
    const heuristicBirth = heuristicPlan.mainEvents.find((event) => event.age === 0);
    if (heuristicBirth) {
      finalMainEvents = [heuristicBirth, ...finalMainEvents];
    }
  }

  // Targeted injection: add missing terminal event (death/duel)
  if (needsTerminalEvent && !hasTerminalLifeEvent(finalMainEvents, modelCurrentAge)) {
    const heuristicDeath = heuristicPlan.mainEvents.find((event) =>
      /(смерт|гибел|погиб|умер|дуэл|died|death)/i.test(`${event.label} ${event.notes ?? ''}`)
    );
    if (heuristicDeath) {
      finalMainEvents = [...finalMainEvents, heuristicDeath];
    }
  }

  // Fill gaps: if model lacks late-life coverage, add heuristic events for that period
  if (!hasLateLifeCoverage && !useHeuristicMainEvents) {
    const modelAgeKeys = new Set(finalMainEvents.map((event) => buildEventFactKey(event)));
    const lateHeuristicEvents = heuristicPlan.mainEvents
      .filter((event) => event.age >= lateLifeCoverageThreshold && !modelAgeKeys.has(buildEventFactKey(event)));
    finalMainEvents = [...finalMainEvents, ...lateHeuristicEvents];
  }

  finalMainEvents.sort((a, b) => a.age - b.age);

  const mergedPlan: BiographyTimelinePlan = {
    subjectName: normalizeText(params.plan.subjectName, 120) || heuristicPlan.subjectName,
    canvasName: normalizeText(params.plan.canvasName, 80) || heuristicPlan.canvasName,
    currentAge: modelCurrentAge,
    selectedPeriodization:
      typeof params.plan.selectedPeriodization === 'string' &&
      TIMELINE_PERIODIZATION_IDS.includes(params.plan.selectedPeriodization)
        ? params.plan.selectedPeriodization
        : heuristicPlan.selectedPeriodization,
    birthDetails: {
      date: normalizeText(params.plan.birthDetails?.date, 100) || heuristicPlan.birthDetails?.date,
      place: normalizeText(params.plan.birthDetails?.place, 150) || heuristicPlan.birthDetails?.place,
      notes: normalizeText(params.plan.birthDetails?.notes, 400) || heuristicPlan.birthDetails?.notes,
    },
    mainEvents: finalMainEvents,
    branches: useHeuristicBranches ? heuristicPlan.branches : sanitizedModelBranches,
  };

  if (mergedPlan.mainEvents.length === 0) {
    throw new Error('Biography plan too sparse after normalization');
  }

  if (!mergedPlan.birthDetails?.date && !mergedPlan.birthDetails?.place && !mergedPlan.branches.length) {
    return {
      plan: heuristicPlan,
      diagnostics: buildBiographyPlanDiagnostics('heuristics-only', heuristicPlan),
    };
  }

  return {
    plan: mergedPlan,
    diagnostics: buildBiographyPlanDiagnostics(
      useHeuristicMainEvents || useHeuristicBranches ? 'merged-with-heuristics' : 'model',
      mergedPlan
    ),
  };
}

export function buildTimelineDataFromBiographyPlan(plan: BiographyTimelinePlan): BiographyTimelineData {
  const mainEvents = (plan.mainEvents || [])
    .map((event) => sanitizeTimelineEventPlan(event))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
    .sort((a, b) => a.age - b.age);

  const nodes: BiographyTimelineData['nodes'] = [];
  const edges: BiographyTimelineData['edges'] = [];
  const mainNodeIds: string[] = [];

  mainEvents.forEach((event) => {
    const nodeId = crypto.randomUUID();
    mainNodeIds.push(nodeId);
    nodes.push({
      id: nodeId,
      age: event.age,
      label: event.label,
      notes: event.notes,
      sphere: event.sphere,
      isDecision: event.isDecision,
      iconId: event.iconId,
    });
  });

  const occupiedLanes: OccupiedBranchLane[] = [];
  (plan.branches || []).forEach((branch) => {
    const sphere = normalizeSphere(branch.sphere) ?? 'other';
    const sourceNodeId = mainNodeIds[branch.sourceMainEventIndex];
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode) return;

    const branchEvents = (branch.events || [])
      .map((event) => sanitizeTimelineEventPlan(event, sphere))
      .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
      .filter((event) => event.age >= sourceNode.age)
      .sort((a, b) => a.age - b.age);

    if (branchEvents.length === 0) return;

    const highestAge = branchEvents[branchEvents.length - 1]?.age ?? sourceNode.age;
    const endAge = Math.max(sourceNode.age + DEFAULT_BRANCH_LENGTH, highestAge + 1);
    const x = pickBranchX(sphere, sourceNode.age, endAge, occupiedLanes);

    edges.push({
      id: crypto.randomUUID(),
      x,
      startAge: sourceNode.age,
      endAge,
      color: SPHERE_META[sphere].color,
      nodeId: sourceNode.id,
    });

    branchEvents.forEach((event) => {
      nodes.push({
        id: crypto.randomUUID(),
        age: event.age,
        x,
        parentX: x,
        label: event.label,
        notes: event.notes,
        sphere: event.sphere ?? sphere,
        isDecision: event.isDecision,
        iconId: event.iconId,
      });
    });
  });

  const maxNodeAge = nodes.reduce((max, node) => Math.max(max, node.age), 0);
  const maxEdgeAge = edges.reduce((max, edge) => Math.max(max, edge.endAge), 0);
  const computedCurrentAge = Math.max(0, Math.min(120, Number(plan.currentAge) || maxNodeAge || 25));
  const ageMax = Math.min(120, Math.max(Math.ceil((Math.max(computedCurrentAge, maxNodeAge, maxEdgeAge) + 3) / 5) * 5, 25));

  return {
    currentAge: computedCurrentAge,
    ageMax,
    nodes,
    edges,
    birthDetails: {
      date: normalizeText(plan.birthDetails?.date, 100),
      place: normalizeText(plan.birthDetails?.place, 150),
      notes: normalizeText(plan.birthDetails?.notes, 400),
    },
    selectedPeriodization:
      typeof plan.selectedPeriodization === 'string' &&
      TIMELINE_PERIODIZATION_IDS.includes(plan.selectedPeriodization)
        ? plan.selectedPeriodization
        : null,
  };
}

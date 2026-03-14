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

const BRANCH_SLOT_ORDER: Record<TimelineSphere, readonly number[]> = {
  education: [0, 2, 1, 3, 4, 5, 6, 7],
  career: [1, 3, 0, 2, 5, 4, 7, 6],
  family: [3, 1, 5, 0, 2, 4, 6, 7],
  health: [0, 1, 2, 3, 4, 5, 6, 7],
  friends: [2, 0, 1, 3, 4, 5, 6, 7],
  place: [4, 0, 2, 1, 3, 5, 6, 7],
  finance: [5, 1, 3, 0, 2, 4, 6, 7],
  hobby: [6, 2, 0, 1, 3, 4, 5, 7],
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

ЧТО НУЖНО СДЕЛАТЬ
1. Определи subjectName и canvasName.
2. Выдели дату и место рождения, если они есть.
3. Если человек умер, currentAge должен быть равен возрасту на момент смерти. Если жив, используй текущий возраст.
4. Выбери selectedPeriodization из списка [${TIMELINE_PERIODIZATION_IDS.join(', ')}] или null.
   Предпочитай "erikson" как универсальный вариант для целостной биографии, если это помогает.
5. Построй mainEvents:
   - 6-12 сильных опорных событий.
   - События на главной линии должны быть хронологическими и покрывать всю жизнь.
   - Это должны быть вехи: рождение, обучение, ключевые публикации/прорывы, ссылки/опалы, брак, переломы судьбы, смерть и т.д.
6. Построй branches:
   - 2-5 веток, только если они реально обоснованы текстом.
   - Каждая ветка должна быть в одной сфере.
   - sourceMainEventIndex должен ссылаться на индекс события mainEvents, из которого логично растёт эта тематическая линия.
   - Ветка должна показывать длительное развитие темы: например, образование, литературная карьера, семья, переезды, здоровье.
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
- Не возвращай markdown, только JSON по схеме.

ИСТОЧНИК
Статья: ${params.articleTitle}
URL: ${params.sourceUrl}

ТЕКСТ СТАТЬИ
${params.extract}`;
}

export function buildBiographyTimelineLinePrompt(params: {
  articleTitle: string;
  sourceUrl: string;
  extract: string;
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
- 6-12 строк MAIN.
- 2-5 веток BRANCH только если реально нужны.
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

ИСТОЧНИК
Статья: ${params.articleTitle}
URL: ${params.sourceUrl}

ТЕКСТ СТАТЬИ
${params.extract}`;
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

  const label = normalizeText(event.label, 120);
  if (!label) return null;

  return {
    age: Math.max(0, Math.min(120, Number(event.age))),
    label,
    notes: normalizeText(event.notes, 700),
    sphere: normalizeSphere(event.sphere) ?? fallbackSphere,
    isDecision: Boolean(event.isDecision),
    iconId: normalizeIcon(event.iconId),
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

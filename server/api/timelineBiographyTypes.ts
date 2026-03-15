export const TIMELINE_BIOGRAPHY_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'] as const;
export const TIMELINE_BIOGRAPHY_API_MAX_OUTPUT_TOKENS = 8192;
export const MAX_WIKIPEDIA_EXTRACT_CHARS = 32000;
export const LINE_X_POSITION = 2000;
export const DEFAULT_BRANCH_LENGTH = 6;
export const BRANCH_X_OFFSETS = [-500, 500, -900, 900, -1300, 1300, -1700, 1700] as const;
export const TIMELINE_PERIODIZATION_IDS = ['piaget', 'vygotsky', 'erikson', 'freud', 'montessori', 'gesell', 'kohlberg'] as const;
export const EVENT_ICON_IDS = [
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

export type TimelineSphere =
  | 'education'
  | 'career'
  | 'creativity'
  | 'family'
  | 'health'
  | 'friends'
  | 'place'
  | 'finance'
  | 'hobby'
  | 'other';

export type TimelineIconId = (typeof EVENT_ICON_IDS)[number];

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

export type WikipediaPageExtract = {
  title: string;
  extract: string;
  canonicalUrl: string;
};

export type OccupiedBranchLane = {
  x: number;
  startAge: number;
  endAge: number;
};

export type BiographyPlanDiagnostics = {
  source: 'model' | 'merged-with-heuristics' | 'heuristics-only' | 'facts-first' | 'facts-first-repaired';
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

export type BiographyEventType =
  | 'birth'
  | 'education'
  | 'move'
  | 'publication'
  | 'career'
  | 'family'
  | 'friends'
  | 'health'
  | 'conflict'
  | 'award'
  | 'project'
  | 'death'
  | 'other';

export type BiographyFactCandidate = BiographyTimelineFact & {
  eventType: BiographyEventType;
  evidence: string;
  section?: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'model' | 'heuristics';
};

export type BiographyLintIssueCode =
  | 'empty-notes'
  | 'generic-label'
  | 'truncated-label'
  | 'sentence-fragment-label'
  | 'duplicate-main-event'
  | 'birth-anchored-branch'
  | 'too-few-early-life-events'
  | 'empty-branch'
  | 'sparse-main-line';

export type BiographyLintIssue = {
  code: BiographyLintIssueCode;
  severity: 'warning' | 'error';
  message: string;
  branchLabel?: string;
  age?: number;
  label?: string;
};

export type BiographyCompositionStats = {
  facts: number;
  selectedMainEvents: number;
  selectedBranchEvents: number;
  discardedFacts: number;
  earlyLifeWindowsFilled: number;
};

export type BiographyGenerationStageDiagnostics = {
  facts: number;
  reviewApplied: boolean;
  reviewIssues: string[];
};

export const WIKIPEDIA_HOST_PATTERN = /(?:^|\.)wikipedia\.org$/i;

// Slot indices into BRANCH_X_OFFSETS: even=left, odd=right.
// Each sphere prefers a distinct starting side so parallel branches spread naturally.
export const BRANCH_SLOT_ORDER: Record<TimelineSphere, readonly number[]> = {
  education: [0, 2, 1, 3, 4, 5, 6, 7],
  career: [1, 3, 0, 2, 5, 4, 7, 6],
  creativity: [1, 0, 3, 2, 5, 4, 7, 6],
  family: [0, 2, 4, 1, 3, 5, 6, 7],
  health: [0, 1, 2, 3, 4, 5, 6, 7],
  friends: [2, 0, 1, 3, 4, 5, 6, 7],
  place: [3, 1, 5, 0, 2, 4, 6, 7],
  finance: [5, 1, 3, 0, 2, 4, 6, 7],
  hobby: [6, 2, 0, 1, 3, 4, 5, 7],
  other: [0, 1, 2, 3, 4, 5, 6, 7],
};

export const SPHERE_META: Record<TimelineSphere, { color: string; label: string; emoji: string }> = {
  education: { color: '#a5b4fc', label: 'Образование', emoji: '🎓' },
  career: { color: '#7dd3fc', label: 'Карьера', emoji: '💼' },
  creativity: { color: '#fdba74', label: 'Творчество', emoji: '✍️' },
  family: { color: '#fca5a5', label: 'Семья', emoji: '❤️' },
  health: { color: '#86efac', label: 'Здоровье', emoji: '💪' },
  friends: { color: '#fcd34d', label: 'Друзья', emoji: '🤝' },
  place: { color: '#c4b5fd', label: 'Место/переезд', emoji: '🏠' },
  finance: { color: '#6ee7b7', label: 'Финансы', emoji: '💰' },
  hobby: { color: '#f9a8d4', label: 'Хобби', emoji: '🎨' },
  other: { color: '#cbd5e1', label: 'Другое', emoji: '⭐' },
};

export const BIOGRAPHY_TIMELINE_FEW_SHOT_EXAMPLE = `{
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
    { "age": 7, "label": "Начало увлечения", "sphere": "education", "isDecision": false, "notes": "Формирующий опыт детства." },
    { "age": 11, "label": "Поступление в лицей", "sphere": "education", "isDecision": true, "iconId": "school-backpack", "notes": "Начал системное обучение." },
    { "age": 18, "label": "Переезд в столицу", "sphere": "place", "isDecision": true, "iconId": "passport", "notes": "Переехал ради учёбы и работы." },
    { "age": 22, "label": "Первые трудности", "sphere": "career", "isDecision": false, "notes": "Столкнулся с первым серьёзным вызовом." },
    { "age": 24, "label": "Профессиональный прорыв", "sphere": "career", "isDecision": true, "iconId": "briefcase", "notes": "Получил широкое признание." },
    { "age": 31, "label": "Брак", "sphere": "family", "isDecision": true, "iconId": "wedding-rings", "notes": "Создал семью." },
    { "age": 38, "label": "Смерть близкого человека", "sphere": "family", "isDecision": false, "notes": "Потеря повлияла на мировоззрение." },
    { "age": 43, "label": "Запуск главного проекта", "sphere": "career", "isDecision": true, "iconId": "idea-book", "notes": "Запустил проект зрелого периода." },
    { "age": 56, "label": "Смена жизненного этапа", "sphere": "career", "isDecision": true, "notes": "Перешёл к новому формату деятельности." },
    { "age": 65, "label": "Ухудшение здоровья", "sphere": "health", "isDecision": false, "notes": "Начало финального периода жизни." },
    { "age": 68, "label": "Смерть", "sphere": "health", "isDecision": false, "iconId": "thermometer", "notes": "Завершение жизненного пути." }
  ],
  "branches": [
    {
      "label": "Образование",
      "sphere": "education",
      "sourceMainEventIndex": 2,
      "events": [
        { "age": 13, "label": "Круг чтения и наставники", "sphere": "education", "isDecision": false, "notes": "Расширил круг идей и влияний." },
        { "age": 17, "label": "Первое публичное признание", "sphere": "education", "isDecision": false, "notes": "Получил заметную оценку способностей." }
      ]
    },
    {
      "label": "Карьера",
      "sphere": "career",
      "sourceMainEventIndex": 5,
      "events": [
        { "age": 27, "label": "Первое крупное произведение", "sphere": "career", "isDecision": true, "iconId": "idea-book", "notes": "Укрепил профессиональную репутацию." },
        { "age": 44, "label": "Расширение влияния", "sphere": "career", "isDecision": false, "notes": "Стал заметной фигурой в своей области." },
        { "age": 60, "label": "Поздний зрелый вклад", "sphere": "career", "isDecision": false, "notes": "Сохранил значение в позднем периоде жизни." }
      ]
    },
    {
      "label": "Семья",
      "sphere": "family",
      "sourceMainEventIndex": 6,
      "events": [
        { "age": 33, "label": "Рождение первого ребёнка", "sphere": "family", "isDecision": false, "iconId": "baby-stroller", "notes": "Семейная линия стала самостоятельной темой." },
        { "age": 58, "label": "Семейное напряжение", "sphere": "family", "isDecision": false, "notes": "Семья оставалась важной частью поздней жизни." }
      ]
    },
    {
      "label": "Окружение",
      "sphere": "friends",
      "sourceMainEventIndex": 2,
      "events": [
        { "age": 14, "label": "Круг единомышленников", "sphere": "friends", "isDecision": false, "notes": "Сформировал связи, определившие дальнейший путь." },
        { "age": 25, "label": "Конфликт с окружением", "sphere": "friends", "isDecision": false, "notes": "Разрыв с частью прежнего круга." }
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

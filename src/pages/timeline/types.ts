import type { EventIconId } from '../../components/Icon';

/**
 * Период в периодизации развития
 */
export type Period = {
  startAge: number;
  endAge: number;
  name: string;
  description: string;
  color: string;
};

/**
 * Периодизация развития от психолога/педагога
 */
export type Periodization = {
  id: string;
  name: string;
  author: string;
  wikiUrl: string;
  criterion: string;
  periods: Period[];
  flexibleBoundaries?: boolean; // Если true, границы между периодами не строгие
  boundaryNote?: string; // Примечание о гибкости границ
};

/**
 * Сфера жизни для события
 */
export type Sphere =
  | 'education' // Образование
  | 'career' // Карьера
  | 'family' // Семья
  | 'health' // Здоровье
  | 'friends' // Друзья
  | 'place' // Место/переезд
  | 'finance' // Финансы
  | 'hobby' // Хобби
  | 'other'; // Другое

/**
 * Событие на таймлайне
 */
export type NodeT = {
  id: string;
  age: number;
  x?: number; // X-координата для перемещения влево/вправо от линии жизни
  parentX?: number; // X-координата родительской линии (от которой была создана горизонталь)
  label: string;
  notes?: string;
  sphere?: Sphere;
  isDecision: boolean;
  iconId?: EventIconId;
};

/**
 * Детали рождения пользователя
 */
export type BirthDetails = {
  date?: string;
  place?: string;
  notes?: string;
};

/**
 * Ветка (альтернативная линия жизни)
 */
export type EdgeT = {
  id: string;
  x: number; // X-координата ветки
  startAge: number; // Возраст начала (где событие)
  endAge: number; // Возраст конца
  color: string; // Цвет (от сферы события)
  nodeId: string; // ID события, от которого идёт ветка
};

/**
 * Полные данные таймлайна
 */
export type TimelineData = {
  currentAge: number;
  ageMax: number;
  nodes: NodeT[];
  edges: EdgeT[];
  birthDetails?: BirthDetails;
  selectedPeriodization?: string | null; // ID выбранной периодизации или null
};

/**
 * Состояние для истории undo/redo
 */
export type HistoryState = {
  nodes: NodeT[];
  edges: EdgeT[];
  birth: BirthDetails;
};

/**
 * Статус сохранения данных
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Трансформация SVG-холста (pan/zoom)
 */
export type Transform = {
  x: number;
  y: number;
  k: number; // scale
};

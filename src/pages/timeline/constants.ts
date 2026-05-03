import type { Sphere } from './types';

/**
 * Пиксели на год по вертикали
 */
export const YEAR_PX = 80;

/**
 * Максимальный возраст на таймлайне
 */
export const DEFAULT_AGE_MAX = 100;

/**
 * Текущий возраст по умолчанию
 */
export const DEFAULT_CURRENT_AGE = 25;

/**
 * X-координата основной линии жизни (центр холста)
 */
export const LINE_X_POSITION = 2000;

/**
 * Радиус кружка события
 */
export const NODE_RADIUS = 20;

/**
 * Базовый радиус кружка события (адаптивный)
 */
export const BASE_NODE_RADIUS = 15;

/**
 * Минимальный радиус кружка события при зуме
 */
export const MIN_NODE_RADIUS = 9;

/**
 * Максимальный радиус кружка события при зуме
 */
export const MAX_NODE_RADIUS = 38;

/**
 * Ширина толстой линии для клика по ветке
 */
export const BRANCH_CLICK_WIDTH = 24;

/**
 * Ширина обычной линии для клика по ветке (не выбрана)
 */
export const BRANCH_CLICK_WIDTH_UNSELECTED = 12;

/**
 * Минимальный масштаб холста
 */
export const MIN_SCALE = 0.2;

/**
 * Максимальный масштаб холста
 */
export const MAX_SCALE = 3;

/**
 * Максимальная глубина истории undo/redo
 */
export const MAX_HISTORY_LENGTH = 50;

/**
 * Задержка перед автосохранением (мс)
 */
export const SAVE_DEBOUNCE_MS = 10000;

/**
 * Метаданные для сфер жизни (цвета, названия, эмодзи)
 */
export const SPHERE_META: Record<Sphere, { color: string; label: string; emoji: string }> = {
  education: { color: '#a5b4fc', label: 'Образование', emoji: '🎓' }, // Пастельный индиго
  career: { color: '#7dd3fc', label: 'Карьера', emoji: '💼' }, // Пастельный голубой
  creativity: { color: '#fdba74', label: 'Творчество', emoji: '✍️' }, // Пастельный оранжевый
  family: { color: '#fca5a5', label: 'Семья', emoji: '❤️' }, // Пастельный красный
  health: { color: '#86efac', label: 'Здоровье', emoji: '💪' }, // Пастельный зелёный
  friends: { color: '#fcd34d', label: 'Друзья', emoji: '🤝' }, // Пастельный оранжевый
  place: { color: '#c4b5fd', label: 'Место/переезд', emoji: '🏠' }, // Пастельный фиолетовый
  finance: { color: '#6ee7b7', label: 'Финансы', emoji: '💰' }, // Пастельный изумрудный
  hobby: { color: '#f9a8d4', label: 'Хобби', emoji: '🎨' }, // Пастельный розовый
  other: { color: '#cbd5e1', label: 'Другое', emoji: '⭐' }, // Пастельный серый
};

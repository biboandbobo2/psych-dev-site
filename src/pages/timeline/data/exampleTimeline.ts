import { LINE_X_POSITION, SPHERE_META } from '../constants';
import type { TimelineData } from '../types';

/**
 * Пример «линии жизни» для стартового экрана пустого холста: показывает
 * события на главной линии, решения и две ветки с событиями. Данные
 * валидны по инвариантам подсистемы (см. exampleTimeline.test.ts).
 */
export const EXAMPLE_TIMELINE_NAME = 'Пример: линия жизни';

export const EXAMPLE_TIMELINE: TimelineData = {
  currentAge: 28,
  ageMax: 100,
  birthDetails: { place: 'Родной город' },
  selectedPeriodization: null,
  nodes: [
    { id: 'ex-sad', age: 3, x: LINE_X_POSITION, label: 'Детский сад', isDecision: false, sphere: 'education' },
    { id: 'ex-school', age: 7, x: LINE_X_POSITION, label: 'Первый класс', isDecision: false, sphere: 'education' },
    { id: 'ex-art', age: 10, x: LINE_X_POSITION, label: 'Кружок рисования', isDecision: false, sphere: 'creativity', notes: 'Первое большое увлечение' },
    { id: 'ex-friend', age: 13, x: LINE_X_POSITION, label: 'Лучший друг', isDecision: false, sphere: 'friends' },
    {
      id: 'ex-uni',
      age: 17,
      x: 2300,
      label: 'Выбор: университет',
      isDecision: true,
      sphere: 'education',
      notes: 'Решение, от которого выросла отдельная ветка',
    },
    { id: 'ex-study', age: 18, x: 2400, parentX: 2400, branchId: 'ex-branch-uni', label: 'Учёба в другом городе', isDecision: false, sphere: 'education' },
    { id: 'ex-diploma', age: 22, x: 2400, parentX: 2400, branchId: 'ex-branch-uni', label: 'Диплом', isDecision: false, sphere: 'education' },
    {
      id: 'ex-move',
      age: 24,
      x: 1700,
      label: 'Решение: переезд',
      isDecision: true,
      sphere: 'place',
    },
    { id: 'ex-city', age: 25, x: 1600, parentX: 1600, branchId: 'ex-branch-move', label: 'Новый город', isDecision: false, sphere: 'place' },
    { id: 'ex-job', age: 26, x: LINE_X_POSITION, label: 'Первая серьёзная работа', isDecision: false, sphere: 'career' },
  ],
  edges: [
    {
      id: 'ex-branch-uni',
      x: 2400,
      startAge: 17,
      endAge: 23,
      color: SPHERE_META.education.color,
      nodeId: 'ex-uni',
    },
    {
      id: 'ex-branch-move',
      x: 1600,
      startAge: 24,
      endAge: 30,
      color: SPHERE_META.place.color,
      nodeId: 'ex-move',
    },
  ],
};

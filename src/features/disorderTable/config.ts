import type { DisorderTableColumn, DisorderTableColumnGroup, DisorderTableRow } from './types';

export const DISORDER_TABLE_COURSE_IDS = ['clinical'] as const;

export const DISORDER_TABLE_COLUMN_GROUPS: DisorderTableColumnGroup[] = [
  { id: 'schizophrenic-spectrum', label: 'Расстройства шизофренического спектра' },
  { id: 'organic', label: 'Органические расстройства' },
  { id: 'affective', label: 'Аффективные расстройства' },
  { id: 'dissociative', label: 'Диссоциативные расстройства' },
  { id: 'personality', label: 'Расстройства личности' },
];

export const DISORDER_TABLE_COLUMNS: DisorderTableColumn[] = [
  { id: 'schizophrenic-spectrum', label: 'Расстройства шизофренического спектра', groupId: 'schizophrenic-spectrum' },
  { id: 'epilepsy', label: 'Эпилепсия', groupId: 'organic' },
  { id: 'alcoholism', label: 'Алкоголизм', groupId: 'organic' },
  { id: 'dementia', label: 'Деменции', groupId: 'organic' },
  { id: 'frontal-syndrome', label: 'Лобный синдром', groupId: 'organic' },
  { id: 'depression', label: 'Депрессия', groupId: 'affective' },
  { id: 'mania-bipolar', label: 'Мания (при БАР)', groupId: 'affective' },
  { id: 'anxiety', label: 'Тревожные расстройства', groupId: 'affective' },
  { id: 'dissociative-disorders', label: 'Диссоциативные расстройства', groupId: 'dissociative' },
  { id: 'personality-disorders', label: 'Расстройства личности', groupId: 'personality' },
];

export const DISORDER_TABLE_ROWS: DisorderTableRow[] = [
  { id: 'perception', label: 'Нарушения восприятия' },
  { id: 'attention', label: 'Нарушения внимания' },
  { id: 'memory', label: 'Нарушения памяти' },
  { id: 'thinking', label: 'Нарушения мышления' },
  { id: 'consciousness', label: 'Нарушения сознания' },
  { id: 'work-capacity', label: 'Работоспособность' },
  { id: 'emotional-personality', label: 'Нарушения эмоционально-личностной сферы' },
  { id: 'behavior', label: 'Наблюдаемые поведенческие особенности' },
];

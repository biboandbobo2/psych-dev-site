import type { Sphere } from '../types';
import { ageToRange } from './ageToRange';
import { SPHERE_META } from '../constants';
import { AGE_RANGE_LABELS, type AgeRange } from '../../../types/notes';

export type FormatEventAsNoteResult = {
  title: string;
  content: string;
  ageRange: AgeRange | null;
};

export type EventForNote = {
  age: number;
  title: string;
  notes?: string;
  sphere?: Sphere;
};

export function formatEventAsNote(event: EventForNote): FormatEventAsNoteResult {
  const ageRange = ageToRange(event.age);
  const ageRangeLabel = ageRange ? AGE_RANGE_LABELS[ageRange] : 'Возраст не определён';
  const sphereLabel = event.sphere ? SPHERE_META[event.sphere].label : 'Не указано';

  const lines = [
    `**Возраст:** ${event.age} лет`,
    `**Период:** ${ageRangeLabel}`,
    `**Сфера жизни:** ${sphereLabel}`,
  ];

  if (event.notes && event.notes.trim().length > 0) {
    lines.push('**Подробности:**', event.notes.trim());
  }

  return {
    title: event.title,
    content: lines.join('\n'),
    ageRange,
  };
}

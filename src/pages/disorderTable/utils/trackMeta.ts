import type { DisorderTableEntryTrack } from '../../../features/disorderTable';

export type OptionalTrack = DisorderTableEntryTrack | null;

export const TRACK_META: Record<DisorderTableEntryTrack, { label: string; chipClass: string }> = {
  patopsychology: {
    label: 'Патопсихология',
    chipClass: 'bg-sky-100 text-sky-800',
  },
  psychiatry: {
    label: 'Психиатрия',
    chipClass: 'bg-fuchsia-100 text-fuchsia-800',
  },
};

export const TRACK_OPTIONS: Array<{ value: OptionalTrack; label: string }> = [
  { value: null, label: 'Без доп. цвета' },
  { value: 'patopsychology', label: 'Патопсихология' },
  { value: 'psychiatry', label: 'Психиатрия' },
];

import type { ThemePreset } from '../types/themes';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'pastel-sky',
    name: 'Pastel Sky',
    mood: 'pastel',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#F5F2FF', position: 0 },
        { color: '#E6F3FF', position: 100 },
      ],
    },
    primary: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#6A7BFF', position: 0 },
        { color: '#4B8BFF', position: 100 },
      ],
    },
  },
  {
    id: 'fresh-mint',
    name: 'Fresh Mint',
    mood: 'calm',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#F2FFF8', position: 0 },
        { color: '#E8FFF1', position: 100 },
      ],
    },
    primary: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#12C48B', position: 0 },
        { color: '#00A87A', position: 100 },
      ],
    },
  },
  {
    id: 'peach-sunset',
    name: 'Peach Sunset',
    mood: 'pastel',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#FFF4EE', position: 0 },
        { color: '#FFE9F0', position: 100 },
      ],
    },
    primary: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#FF8A5B', position: 0 },
        { color: '#FF5E7E', position: 100 },
      ],
    },
  },
  {
    id: 'lavender-calm',
    name: 'Lavender Calm',
    mood: 'calm',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#F7F4FF', position: 0 },
        { color: '#F0F5FF', position: 100 },
      ],
    },
    primary: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#7B61FF', position: 0 },
        { color: '#A35BFF', position: 100 },
      ],
    },
  },
  {
    id: 'coral-pop',
    name: 'Coral Pop',
    mood: 'bright',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#FFF9F2', position: 0 },
        { color: '#FFF0F2', position: 100 },
      ],
    },
    primary: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#FF6B6B', position: 0 },
        { color: '#FF8E53', position: 100 },
      ],
    },
  },
  {
    id: 'neutral-slate',
    name: 'Neutral Slate',
    mood: 'neutral',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#FAFBFF', position: 0 },
        { color: '#F2F4F8', position: 100 },
      ],
    },
    primary: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#5563DD', position: 0 },
        { color: '#3A4ABC', position: 100 },
      ],
    },
  },
];

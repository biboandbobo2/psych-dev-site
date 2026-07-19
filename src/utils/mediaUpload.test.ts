import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/firebase', () => ({ storage: {} }));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

import {
  extractYouTubeVideoId,
  extractYouTubeStartSeconds,
  getYouTubeEmbedUrl,
} from './mediaUpload';

describe('extractYouTubeStartSeconds', () => {
  it('извлекает секунды из ?t=95', () => {
    expect(extractYouTubeStartSeconds('https://youtu.be/0q4AZ3WsAAc?t=95')).toBe(95);
  });

  it('извлекает секунды из &t= после v=', () => {
    expect(
      extractYouTubeStartSeconds('https://www.youtube.com/watch?v=0q4AZ3WsAAc&t=390')
    ).toBe(390);
  });

  it('поддерживает формат 1h2m3s', () => {
    expect(extractYouTubeStartSeconds('https://youtu.be/0q4AZ3WsAAc?t=1h2m3s')).toBe(3723);
    expect(extractYouTubeStartSeconds('https://youtu.be/0q4AZ3WsAAc?t=2m5s')).toBe(125);
  });

  it('поддерживает ?start=', () => {
    expect(
      extractYouTubeStartSeconds('https://www.youtube.com/watch?v=0q4AZ3WsAAc&start=42')
    ).toBe(42);
  });

  it('возвращает null без таймкода и для t=0', () => {
    expect(extractYouTubeStartSeconds('https://youtu.be/0q4AZ3WsAAc')).toBeNull();
    expect(extractYouTubeStartSeconds('https://youtu.be/0q4AZ3WsAAc?t=0')).toBeNull();
  });
});

describe('getYouTubeEmbedUrl', () => {
  it('строит embed без старта', () => {
    expect(getYouTubeEmbedUrl('https://youtu.be/0q4AZ3WsAAc')).toBe(
      'https://www.youtube-nocookie.com/embed/0q4AZ3WsAAc'
    );
  });

  it('переносит таймкод в ?start=', () => {
    expect(getYouTubeEmbedUrl('https://youtu.be/0q4AZ3WsAAc?t=390')).toBe(
      'https://www.youtube-nocookie.com/embed/0q4AZ3WsAAc?start=390'
    );
    expect(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=0q4AZ3WsAAc&t=2m5s')).toBe(
      'https://www.youtube-nocookie.com/embed/0q4AZ3WsAAc?start=125'
    );
  });

  it('не ломает извлечение ID при наличии параметров', () => {
    expect(extractYouTubeVideoId('https://youtu.be/0q4AZ3WsAAc?t=390')).toBe('0q4AZ3WsAAc');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=0q4AZ3WsAAc&t=390')).toBe(
      '0q4AZ3WsAAc'
    );
  });

  it('возвращает null для невалидного URL', () => {
    expect(getYouTubeEmbedUrl('https://example.com/video')).toBeNull();
  });
});

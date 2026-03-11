import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LectureAnswer } from './LectureAnswer';

describe('LectureAnswer', () => {
  it('группирует citations одной лекции и показывает все таймкоды', () => {
    render(
      <LectureAnswer
        answer="Это ответ по лекции."
        tookMs={1400}
        citations={[
          {
            chunkId: 'general::intro::video-1::0',
            lectureKey: 'general::intro::video-1',
            lectureTitle: 'Введение в общую психологию',
            courseId: 'general',
            periodId: 'general-1',
            periodTitle: 'Введение',
            youtubeVideoId: 'video-1',
            startMs: 125000,
            timestampLabel: '02:05',
            excerpt: 'Фрагмент транскрипта с ключевой мыслью.',
            claim: 'Определение предмета общей психологии',
            path: '/general/1?study=1&panel=transcript&t=125&video=video-1',
          },
          {
            chunkId: 'general::intro::video-1::1',
            lectureKey: 'general::intro::video-1',
            lectureTitle: 'Введение в общую психологию',
            courseId: 'general',
            periodId: 'general-1',
            periodTitle: 'Введение',
            youtubeVideoId: 'video-1',
            startMs: 225000,
            timestampLabel: '03:45',
            excerpt: 'Второй фрагмент по той же лекции.',
            claim: 'Ещё одно важное утверждение',
            path: '/general/1?study=1&panel=transcript&t=225&video=video-1',
          },
        ]}
      />
    );

    expect(screen.getByText('Это ответ по лекции.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '02:05' })).toHaveAttribute(
      'href',
      '/general/1?study=1&panel=transcript&t=125&video=video-1'
    );
    expect(screen.getByRole('link', { name: '03:45' })).toHaveAttribute(
      'href',
      '/general/1?study=1&panel=transcript&t=225&video=video-1'
    );
    expect(screen.getByRole('link', { name: 'Открыть лекцию' })).toBeInTheDocument();
    expect(screen.getByText('Фрагмент транскрипта с ключевой мыслью.')).toBeInTheDocument();
    expect(screen.getByText('«Определение предмета общей психологии»')).toBeInTheDocument();
    expect(screen.getByText('«Ещё одно важное утверждение»')).toBeInTheDocument();
    expect(screen.getAllByText('Введение в общую психологию')).toHaveLength(1);
  });
});

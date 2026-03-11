import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LectureAnswer } from './LectureAnswer';

describe('LectureAnswer', () => {
  it('показывает усиленные citations с таймкодом и ссылкой на лекцию', () => {
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
        ]}
      />
    );

    expect(screen.getByText('Это ответ по лекции.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '02:05' })).toHaveAttribute(
      'href',
      '/general/1?study=1&panel=transcript&t=125&video=video-1'
    );
    expect(screen.getByRole('link', { name: 'Открыть лекцию' })).toBeInTheDocument();
    expect(screen.getByText('Фрагмент транскрипта с ключевой мыслью.')).toBeInTheDocument();
    expect(screen.getByText('«Определение предмета общей психологии»')).toBeInTheDocument();
  });
});

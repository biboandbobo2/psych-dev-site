import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NoteModal } from '../NoteModal';

vi.mock('../../hooks/useTimeline', () => ({
  useTimeline: () => ({ addEventToTimeline: vi.fn() }),
}));

describe('NoteModal для конспекта лекции', () => {
  it('позволяет изменить заголовок, сохраняя контекст и ссылку на занятие', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <NoteModal
          isOpen
          noteId="note-1"
          lecture={{ lessonPath: '/lesson?study=1' }}
          initialTitle="Старое название"
          initialContent="Текст"
          initialCourseId="course-1"
          initialPeriodId="lesson-1"
          initialPeriodTitle="Занятие 1"
          onClose={vi.fn()}
          onSave={onSave}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Занятие 1/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть в лекции' })).toHaveAttribute('href', '/lesson?study=1');
    expect(screen.queryByLabelText('Курс')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Занятие')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Заголовок заметки'), { target: { value: 'Новое название' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Новое название', content: 'Текст', courseId: 'course-1', periodId: 'lesson-1', periodTitle: 'Занятие 1',
    })));
  });
});

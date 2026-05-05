import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { ExamMonthGrid } from '../ExamMonthGrid';
import type { Exam, ExamSlot } from '../../../../types/exam';

const exam: Exam = {
  id: 'e1',
  title: 'Зачёт',
  courseId: 'general',
  groupIds: ['g1', 'g2'],
  slotDurationMinutes: 40,
  essayMinChars: 1000,
  essayMaxChars: 3500,
  cancelLeadTimeHours: 48,
  timezone: 'Asia/Tbilisi',
  status: 'active',
  announcement: { title: '', body: '' },
  createdAt: null,
  createdBy: 'admin',
  updatedAt: null,
};

function makeSlot(id: string, dayOffset: number, bookings: ExamSlot['bookings']): ExamSlot {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(14, 0, 0, 0);
  return {
    id,
    startAt: Timestamp.fromMillis(start.getTime()),
    endAt: Timestamp.fromMillis(start.getTime() + 40 * 60_000),
    bookings,
    createdAt: null,
    createdBy: 'admin',
  };
}

describe('ExamMonthGrid', () => {
  it('admin: рисует бейдж со счётчиком N/M', () => {
    const slot = makeSlot('s1', 1, { g1: { bookedAt: Timestamp.now() }, g2: null });
    render(
      <ExamMonthGrid
        monthDate={new Date()}
        exam={exam}
        slots={[slot]}
        mode="admin"
        onCreateSlot={() => {}}
        onSlotClick={() => {}}
      />
    );
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('student: счётчик N/M скрыт', () => {
    const slot = makeSlot('s1', 1, { g1: { bookedAt: Timestamp.now() }, g2: null });
    render(
      <ExamMonthGrid
        monthDate={new Date()}
        exam={exam}
        slots={[slot]}
        mode="student"
        myGroupId="g2"
        onSlotClick={() => {}}
      />
    );
    expect(screen.queryByText('1/2')).not.toBeInTheDocument();
  });

  it('student: бейдж недоступен, если в моей группе занято', () => {
    const slot = makeSlot('s1', 1, { g1: { bookedAt: Timestamp.now() }, g2: null });
    const onSlotClick = vi.fn();
    render(
      <ExamMonthGrid
        monthDate={new Date()}
        exam={exam}
        slots={[slot]}
        mode="student"
        myGroupId="g1"
        onSlotClick={onSlotClick}
      />
    );
    const btn = screen.getByRole('button', { name: /14:00/ });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onSlotClick).not.toHaveBeenCalled();
  });

  it('student: бейдж доступен, если занято только в чужой группе', () => {
    const slot = makeSlot('s1', 1, { g1: { bookedAt: Timestamp.now() }, g2: null });
    const onSlotClick = vi.fn();
    render(
      <ExamMonthGrid
        monthDate={new Date()}
        exam={exam}
        slots={[slot]}
        mode="student"
        myGroupId="g2"
        onSlotClick={onSlotClick}
      />
    );
    const btn = screen.getByRole('button', { name: /14:00/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onSlotClick).toHaveBeenCalledTimes(1);
  });

  it('student: моя бронь — иконка ✅', () => {
    const slot = makeSlot('s1', 1, { g1: { bookedAt: Timestamp.now() }, g2: null });
    render(
      <ExamMonthGrid
        monthDate={new Date()}
        exam={exam}
        slots={[slot]}
        mode="student"
        myGroupId="g1"
        myBookedSlotId="s1"
        onSlotClick={() => {}}
      />
    );
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('admin: пустой день имеет невидимую кнопку «Создать слот»', () => {
    const onCreateSlot = vi.fn();
    render(
      <ExamMonthGrid
        monthDate={new Date()}
        exam={exam}
        slots={[]}
        mode="admin"
        onCreateSlot={onCreateSlot}
        onSlotClick={() => {}}
      />
    );
    // Должны быть много кнопок «Создать слот на YYYY-MM-DD»
    const buttons = screen.getAllByRole('button', { name: /Создать слот на/ });
    expect(buttons.length).toBeGreaterThan(20); // 6×7=42 ячейки минимум
  });
});

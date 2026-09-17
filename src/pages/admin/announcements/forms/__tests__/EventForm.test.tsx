import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventForm, type EventFormValue } from '../EventForm';
import { buildEventOccurrences } from '../formHelpers';

const baseStartMs = Date.UTC(2026, 4, 15, 9, 0);

const sampleValue: EventFormValue = {
  text: 'Семинар',
  startAtMs: baseStartMs,
  endAtMs: baseStartMs + 60 * 60 * 1000,
  isAllDay: false,
  zoomLink: 'https://zoom.us/j/abc',
  siteLink: '',
};

describe('EventForm', () => {
  it('рендерит initialValue в полях формы', () => {
    render(
      <EventForm
        initialValue={sampleValue}
        saving={false}
        errorMessage={null}
        submitLabel="Сохранить"
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText('Описание события')).toHaveValue('Семинар');
    expect(screen.getByPlaceholderText('Zoom-ссылка (опционально)')).toHaveValue(
      'https://zoom.us/j/abc'
    );
  });

  it('submit прокидывает trim-нутые значения и числовые startAt/endAt', () => {
    const onSubmit = vi.fn();
    render(
      <EventForm
        initialValue={{ ...sampleValue, text: '  Семинар  ' }}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.text).toBe('Семинар');
    expect(typeof payload.startAtMs).toBe('number');
    expect(payload.endAtMs).toBeGreaterThan(payload.startAtMs);
    expect(payload.zoomLink).toBe('https://zoom.us/j/abc');
    expect(payload.repeatIntervalWeeks).toBe(0);
  });

  it('без allowRepeat блок повтора не рендерится', () => {
    render(
      <EventForm
        initialValue={sampleValue}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Повтор')).toBeNull();
  });

  it('серия прокидывает шаг и количество занятий', () => {
    const onSubmit = vi.fn();
    render(
      <EventForm
        initialValue={sampleValue}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        allowRepeat
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText('Повтор'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Количество занятий'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.repeatIntervalWeeks).toBe(1);
    expect(payload.repeatCount).toBe(5);
  });

  it('серия короче двух занятий не сохраняется', () => {
    const onSubmit = vi.fn();
    render(
      <EventForm
        initialValue={sampleValue}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        allowRepeat
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText('Повтор'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Количество занятий'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    // min=2 на input'е — форма не проходит constraint validation браузера.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('показывает validation error если end <= start', () => {
    const onSubmit = vi.fn();
    render(
      <EventForm
        initialValue={{ ...sampleValue, endAtMs: sampleValue.startAtMs }}
        saving={false}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/окончания/i)).toBeInTheDocument();
  });

  it('показывает errorMessage из пропсов', () => {
    render(
      <EventForm
        initialValue={sampleValue}
        saving={false}
        errorMessage="Сетевая ошибка"
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Сетевая ошибка')).toBeInTheDocument();
  });

  it('disabled submit при saving=true', () => {
    render(
      <EventForm
        initialValue={sampleValue}
        saving={true}
        errorMessage={null}
        submitLabel="OK"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Сохраняем|OK/ })).toBeDisabled();
  });
});

describe('buildEventOccurrences', () => {
  const start = new Date(2026, 8, 17, 19, 30).getTime();
  const end = start + 90 * 60 * 1000;

  it('без повтора возвращает одно занятие', () => {
    expect(buildEventOccurrences(start, end, 0, 8)).toEqual([{ startAtMs: start, endAtMs: end }]);
  });

  it('еженедельная серия сдвигает каждое занятие на 7 дней', () => {
    const occurrences = buildEventOccurrences(start, end, 1, 3);
    expect(occurrences).toHaveLength(3);
    expect(new Date(occurrences[1].startAtMs).getDate()).toBe(24);
    expect(new Date(occurrences[2].startAtMs).getDate()).toBe(1);
    expect(occurrences[2].endAtMs - occurrences[2].startAtMs).toBe(end - start);
  });

  it('время начала переживает перевод часов', () => {
    // 22.03.2026 — в зонах с летним временем часы уже переведены.
    const beforeDst = new Date(2026, 2, 22, 19, 30).getTime();
    const occurrences = buildEventOccurrences(beforeDst, beforeDst + 3600_000, 1, 3);
    for (const occurrence of occurrences) {
      expect(new Date(occurrence.startAtMs).getHours()).toBe(19);
      expect(new Date(occurrence.startAtMs).getMinutes()).toBe(30);
    }
  });

  it('количество ограничено 30 занятиями', () => {
    expect(buildEventOccurrences(start, end, 1, 99)).toHaveLength(30);
  });
});

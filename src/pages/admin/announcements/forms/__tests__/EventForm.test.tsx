import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventForm, type EventFormValue } from '../EventForm';

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

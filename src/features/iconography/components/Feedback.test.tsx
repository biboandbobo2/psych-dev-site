import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Feedback } from './Feedback';
const { submit } = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock('../../../lib/feedback', () => ({ submitFeedback: submit }));
let now = 100_000;
beforeEach(() => { now = 100_000; submit.mockReset(); vi.spyOn(Date, 'now').mockImplementation(() => now); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('shared Telegram feedback form', () => {
  it('sends icon context through the existing callable and displays confirmed success', async () => {
    submit.mockResolvedValue(undefined);
    render(<Feedback iconId="cma-168322" />); now += 3000;
    fireEvent.change(screen.getByRole('textbox', { name: 'Ваш комментарий' }), { target: { value: 'Проверьте дату по каталогу' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить комментарий' }));
    expect(await screen.findByText('Спасибо, сообщение отправлено.')).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ iconId: 'cma-168322', pageUrl: window.location.href, message: expect.stringContaining('cma-168322') }));
  });
  it('retains the message on failure and permits retry without claiming delivery', async () => {
    submit.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    render(<Feedback />); now += 3000;
    fireEvent.change(screen.getByRole('textbox', { name: 'Ваш комментарий' }), { target: { value: 'Важная поправка' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить комментарий' }));
    expect(await screen.findByText(/Сообщение не отправлено/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Ваш комментарий' })).toHaveValue('Важная поправка');
    fireEvent.click(screen.getByRole('button', { name: 'Отправить комментарий' }));
    expect(await screen.findByText('Спасибо, сообщение отправлено.')).toBeInTheDocument();
  });
  it('blocks an immediate automated submission', async () => {
    render(<Feedback />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Ваш комментарий' }), { target: { value: 'automated message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить комментарий' }));
    expect(await screen.findByText(/Подождите немного/)).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});

import { useRef, useState, type FormEvent } from 'react';
import { submitFeedback } from '../../../lib/feedback';
export function Feedback({ iconId }: { iconId?: string }) {
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const started = useRef(Date.now());
  const sentAt = useRef(0);
  const inFlight = useRef(false);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const body = message.trim();
    if (body.length < 3 || body.length > 1700) {
      setError('Напишите от 3 до 1700 символов.'); setState('error'); return;
    }
    if (website || Date.now() - started.current < 2000 || Date.now() - sentAt.current < 60000) {
      setError('Подождите немного перед отправкой сообщения.'); setState('error'); return;
    }
    inFlight.current = true;
    setState('sending'); setError('');
    try {
      await submitFeedback({ type: 'idea',
        // Prefix remains compatible with the currently deployed callable.
        message: `Иконография${iconId ? ` · ${iconId}` : ''}\n${body}`,
        pageUrl: window.location.href, iconId, website });
      sentAt.current = Date.now(); setState('success'); setMessage('');
    } catch (caught: unknown) {
      const code = caught && typeof caught === 'object' && 'code' in caught ? caught.code : '';
      setError(code === 'functions/resource-exhausted' ? 'Слишком много сообщений. Попробуйте через 10 минут.' : 'Сообщение не отправлено. Текст сохранён в форме — попробуйте ещё раз.');
      setState('error');
    } finally { inFlight.current = false; }
  }
  return <section className="ico-feedback"><p className="ico-eyebrow">Открытый разговор</p><h2>Есть наблюдение или поправка?</h2>
    <p>Если заметили неточность, добавьте ссылку на источник. Сообщение получит команда Академии в Telegram.</p>
    {state === 'success' ? <div role="status" className="ico-notice"><strong>Спасибо, сообщение отправлено.</strong><p>Мы прочитаем его. Комментарий не публикуется на сайте.</p>
      <button className="ico-link" onClick={() => setState('idle')}>Написать ещё</button></div>
      : <form onSubmit={(event) => { void send(event); }}>
        <label htmlFor="ico-comment">Ваш комментарий</label>
        <textarea id="ico-comment" rows={4} minLength={3} maxLength={1700} required value={message}
          disabled={state === 'sending'} onChange={(e) => setMessage(e.target.value)} aria-describedby="ico-feedback-privacy ico-feedback-error" />
        <div className="ico-honeypot" aria-hidden="true"><label>Сайт<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
        <p className="ico-small" id="ico-feedback-privacy">При отправке передаются текст, адрес страницы{iconId ? ' и идентификатор иконы' : ''}. Не включайте конфиденциальные сведения. Ответ на сайте не предусмотрен.</p>
        <p id="ico-feedback-error" role="alert">{error}</p>
        <button className="ico-button" disabled={state === 'sending'}>{state === 'sending' ? 'Отправляем…' : 'Отправить комментарий'}</button>
      </form>}
  </section>;
}

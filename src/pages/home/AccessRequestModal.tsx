/**
 * Заявка на доступ к курсу (AC-2). Раньше форма уходила только в Telegram
 * через `FeedbackModal`, и в админке её не существовало. Теперь заявка
 * сохраняется в `accessRequests`, а Telegram остаётся каналом уведомления:
 * его ошибка не должна отменять уже сохранённую заявку.
 */
import { useEffect, useState } from 'react';
import { addDoc, collection, serverTimestamp, type WithFieldValue } from 'firebase/firestore';
import { BaseModal, ModalCancelButton, ModalSaveButton } from '../../components/ui/BaseModal';
import { useAuth } from '../../auth/AuthProvider';
import { db } from '../../lib/firebase';
import { submitFeedback } from '../../lib/feedback';
import { reportAppError } from '../../lib/errorHandler';
import { ACCESS_REQUESTS_COLLECTION } from '../../hooks/useAccessRequests';
import type { CourseOption } from '../../hooks/useCourses';
import type { AccessRequestData } from '../../types/accessRequests';

const MESSAGE_LIMIT = 1000;
const NO_COURSE = '';

interface AccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Закрытые пользователю курсы — варианты селекта. */
  courses: CourseOption[];
}

export function AccessRequestModal({ isOpen, onClose, courses }: AccessRequestModalProps) {
  const { user } = useAuth();
  const [courseId, setCourseId] = useState(NO_COURSE);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Заявка «без курса» осмысленна сама по себе, но пустой она быть не должна.
  const canSubmit = courseId !== NO_COURSE || message.trim().length >= 3;

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [success, onClose]);

  const close = () => {
    if (sending) return;
    setMessage('');
    setCourseId(NO_COURSE);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const notifyTelegram = async (text: string, courseName: string) => {
    try {
      await submitFeedback({
        type: 'idea',
        message: `🔓 Запрос доступа к курсу\n\nКурс: ${courseName}\n\n${text}`,
        userEmail: user?.email || undefined,
        userName: user?.displayName || undefined,
        pageUrl: window.location.href,
      });
    } catch (err) {
      // Заявка уже в Firestore и видна в админке — уведомление best effort.
      reportAppError({
        message: 'Заявка сохранена, но уведомление в Telegram не ушло',
        error: err,
        context: 'AccessRequestModal.telegram',
      });
    }
  };

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    setError(null);
    try {
      const text = message.trim();
      const request: WithFieldValue<AccessRequestData> = {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        courseId: courseId === NO_COURSE ? null : courseId,
        message: text,
        status: 'new',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, ACCESS_REQUESTS_COLLECTION), request);
      const courseName =
        courses.find((course) => course.id === courseId)?.name ?? 'не выбран (не знаю / несколько)';
      await notifyTelegram(text, courseName);
      setMessage('');
      setSuccess(true);
    } catch (err) {
      reportAppError({
        message: 'Не удалось отправить заявку на доступ',
        error: err,
        context: 'AccessRequestModal.submit',
      });
      setError('Не удалось отправить заявку. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <BaseModal isOpen={isOpen} onClose={close} title="Запрос доступа к курсу" maxWidth="md">
        <div className="py-8 text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h3 className="mb-2 text-xl font-bold text-fg">Спасибо!</h3>
          <p className="text-muted">Заявка отправлена, мы ответим в ближайшее время.</p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={close}
      title="Запрос доступа к курсу"
      maxWidth="md"
      disabled={sending}
      footer={
        <>
          <ModalCancelButton onClick={close} disabled={sending}>
            Закрыть
          </ModalCancelButton>
          <ModalSaveButton onClick={handleSend} disabled={!canSubmit} loading={sending}>
            Отправить
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          Расскажите, к какому курсу нужен доступ и кратко о себе. Мы ответим в ближайшее время.
        </p>

        <div>
          <label htmlFor="access-request-course" className="mb-2 block text-sm font-medium text-fg">
            Курс
          </label>
          <select
            id="access-request-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg"
          >
            <option value={NO_COURSE}>Не знаю / несколько курсов</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="access-request-message" className="mb-2 block text-sm font-medium text-fg">
            Какой курс вам нужен и контекст
          </label>
          <textarea
            id="access-request-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Например: «Хочу доступ к курсу ‘Психология развития’, меня интересует подростковый возраст»"
            rows={4}
            maxLength={MESSAGE_LIMIT}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg"
          />
          <div className="mt-1 text-right text-xs text-muted">
            {message.length} / {MESSAGE_LIMIT}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-pastel-terracotta bg-card2 px-3 py-2 text-sm text-ink">
            {error}
          </p>
        )}
      </div>
    </BaseModal>
  );
}

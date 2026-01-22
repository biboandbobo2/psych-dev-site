import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { BaseModal, ModalCancelButton, ModalSaveButton } from './ui/BaseModal';
import { useAuth } from '../auth/AuthProvider';

type FeedbackType = 'bug' | 'idea' | 'thanks';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEEDBACK_OPTIONS: Array<{ type: FeedbackType; emoji: string; label: string; color: string }> = [
  { type: 'bug', emoji: '🐛', label: 'Баг', color: 'border-red-300 bg-red-50 text-red-700' },
  { type: 'idea', emoji: '💡', label: 'Идея', color: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
  { type: 'thanks', emoji: '🙏', label: 'Благодарность', color: 'border-green-300 bg-green-50 text-green-700' },
];

const ROLE_LABELS: Record<string, string> = {
  'guest': 'Гость',
  'student': 'Студент',
  'admin': 'Администратор',
  'super-admin': 'Супер-админ',
};

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user, userRole } = useAuth();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('idea');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (sending) return;
    setMessage('');
    setFeedbackType('idea');
    setSuccess(false);
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    if (!message.trim() || message.trim().length < 3) {
      setError('Сообщение должно содержать минимум 3 символа');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const sendFeedback = httpsCallable(functions, 'sendFeedback');
      await sendFeedback({
        type: feedbackType,
        message: message.trim(),
        userEmail: user?.email || undefined,
        userName: user?.displayName || undefined,
        userRole: userRole ? ROLE_LABELS[userRole] || userRole : undefined,
        pageUrl: window.location.href,
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <BaseModal isOpen={isOpen} onClose={handleClose} title="Обратная связь" maxWidth="md">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Спасибо!</h3>
          <p className="text-gray-600">Ваше сообщение отправлено</p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Обратная связь"
      maxWidth="md"
      disabled={sending}
      footer={
        <>
          <ModalCancelButton onClick={handleClose} disabled={sending}>
            Отмена
          </ModalCancelButton>
          <ModalSaveButton
            onClick={handleSend}
            disabled={!message.trim() || message.trim().length < 3}
            loading={sending}
          >
            Отправить
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Тип сообщения */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Тип сообщения</label>
          <div className="flex gap-2">
            {FEEDBACK_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setFeedbackType(option.type)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                  feedbackType === option.type
                    ? option.color + ' border-current'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{option.emoji}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Сообщение */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Сообщение</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              feedbackType === 'bug'
                ? 'Опишите проблему: что произошло, на какой странице, какие действия выполняли...'
                : feedbackType === 'idea'
                ? 'Расскажите о вашей идее...'
                : 'Напишите что вам понравилось...'
            }
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <div className="mt-1 text-xs text-gray-500 text-right">{message.length} / 2000</div>
        </div>

        {/* Информация о пользователе */}
        {user && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">👤</span>
              <span>{user.displayName || user.email}</span>
              {userRole && (
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                  {ROLE_LABELS[userRole] || userRole}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

interface FeedbackButtonProps {
  variant?: 'header' | 'profile' | 'mobile';
  className?: string;
}

/**
 * Кнопка обратной связи
 * - variant="header" — для header (студенты)
 * - variant="profile" — для страницы профиля
 * - variant="mobile" — для мобильного меню
 */
export function FeedbackButton({ variant = 'header', className = '' }: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === 'profile') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`w-full text-left bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow ${className}`}
        >
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4 sm:px-8 sm:py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">💬</span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Обратная связь</h3>
                  <p className="text-sm text-white/80 hidden sm:block">
                    Сообщить о баге, предложить идею или оставить благодарность
                  </p>
                </div>
              </div>
              <svg
                className="w-6 h-6 text-white/80"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
        <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (variant === 'mobile') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 ${className}`}
        >
          <span aria-hidden>💬</span>
          Обратная связь
        </button>
        <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // variant === 'header'
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 rounded-lg bg-teal-100 px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-200 ${className}`}
      >
        <span aria-hidden className="text-base">💬</span>
        <span>Обратная связь</span>
      </button>
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

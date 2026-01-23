import { type ReactNode } from 'react';

interface BaseModalProps {
  /** Флаг открытия модального окна */
  isOpen: boolean;
  /** Callback закрытия */
  onClose: () => void;
  /** Заголовок модального окна */
  title: string;
  /** Контент модального окна */
  children: ReactNode;
  /** Контент футера (кнопки действий) */
  footer?: ReactNode;
  /** Блокировка закрытия (например, во время сохранения) */
  disabled?: boolean;
  /** Дополнительный класс для контейнера */
  className?: string;
  /** Максимальная ширина (по умолчанию max-w-3xl) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

/**
 * Базовый компонент модального окна
 * Предоставляет общую структуру: overlay, header с кнопкой закрытия, контент и footer
 *
 * @example
 * <BaseModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Создать запись"
 *   footer={<button onClick={handleSave}>Сохранить</button>}
 * >
 *   <form>...</form>
 * </BaseModal>
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  disabled = false,
  className = '',
  maxWidth = '3xl',
}: BaseModalProps) {
  if (!isOpen) return null;

  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth] || MAX_WIDTH_CLASSES['3xl'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-2xl ${maxWidthClass} ${className}`}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            disabled={disabled}
            className="text-2xl text-gray-400 transition hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Закрыть"
            type="button"
          >
            &times;
          </button>
        </header>

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/**
 * Компонент кнопки отмены для модальных окон
 */
export function ModalCancelButton({
  onClick,
  disabled = false,
  children = 'Отмена',
}: {
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-gray-300 px-4 py-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Компонент кнопки сохранения для модальных окон
 */
export function ModalSaveButton({
  onClick,
  disabled = false,
  loading = false,
  children = 'Сохранить',
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {loading ? (
        <>
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Сохранение...
        </>
      ) : (
        children
      )}
    </button>
  );
}

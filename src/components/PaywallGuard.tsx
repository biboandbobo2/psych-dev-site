import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import type { CourseType } from '../types/tests';
import { Section } from './ui/Section';

interface PaywallGuardProps {
  /** Тип курса для проверки доступа */
  courseType: CourseType;
  /** Контент, который показывается при наличии доступа */
  children: ReactNode;
  /** Кастомное сообщение для заглушки */
  message?: string;
  /** Заголовок секции (если нужно обернуть в Section) */
  sectionTitle?: string;
  /** Публичный контент, показывается пользователям без доступа (например, публичные видео) */
  publicContent?: ReactNode;
}

/**
 * Компонент для защиты видео-контента от пользователей без оплаты.
 *
 * Логика доступа:
 * - student, admin, super-admin → полный доступ
 * - guest → проверяется courseAccess[courseType]
 * - неавторизованный → заглушка
 *
 * @example
 * ```tsx
 * <PaywallGuard courseType="development">
 *   <VideoSection ... />
 * </PaywallGuard>
 * ```
 */
export function PaywallGuard({
  courseType,
  children,
  message = 'Доступно при оплате курса',
  sectionTitle,
  publicContent,
}: PaywallGuardProps) {
  const hasCourseAccess = useAuthStore((state) => state.hasCourseAccess);
  const user = useAuthStore((state) => state.user);

  // Проверяем доступ
  const hasAccess = hasCourseAccess(courseType);

  // Если есть доступ — показываем контент
  if (hasAccess) {
    return <>{children}</>;
  }

  // Если есть публичный контент — показываем его
  if (publicContent) {
    return <>{publicContent}</>;
  }

  // Иначе показываем заглушку
  const placeholder = (
    <PaywallPlaceholder message={message} isLoggedIn={!!user} />
  );

  // Если указан заголовок секции, оборачиваем в Section
  if (sectionTitle) {
    return (
      <Section title={sectionTitle}>
        {placeholder}
      </Section>
    );
  }

  return placeholder;
}

interface PaywallPlaceholderProps {
  message: string;
  isLoggedIn: boolean;
}

/**
 * Заглушка для защищённого контента
 */
function PaywallPlaceholder({ message, isLoggedIn }: PaywallPlaceholderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-gray-50 to-gray-100 p-8 shadow-sm">
      {/* Декоративный замок */}
      <div className="absolute right-4 top-4 text-4xl opacity-20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-400"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-600"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            Видео-лекция
          </h3>
        </div>

        <p className="text-base text-gray-600">
          {message}
        </p>

        {!isLoggedIn && (
          <p className="text-sm text-gray-500">
            Войдите в аккаунт, чтобы проверить доступ.
          </p>
        )}
      </div>

      {/* Декоративная полоска */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
    </div>
  );
}

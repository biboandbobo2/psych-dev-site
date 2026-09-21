/**
 * Панель «Заявки на доступ» (AC-2) — одна на два экрана: `/admin/users`
 * (все новые заявки, их видят супер-админ и со-админ) и «Студенты курса»
 * (`courseId` сужает выдачу до своего курса — чужие заявки админу курса
 * не отдают firestore.rules).
 *
 * «Открыть курс» = `bulkEnrollStudents` + закрытие заявки; без курса в заявке
 * открывать нечего, поэтому вместо него — ссылка на карточку пользователя.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { bulkEnrollStudents } from '../../lib/adminFunctions';
import { reportAppError } from '../../lib/errorHandler';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCourses } from '../../hooks/useCourses';
import { ACCESS_REQUESTS_COLLECTION, useAccessRequests } from '../../hooks/useAccessRequests';
import { ConfirmAction } from '../../pages/admin/users/components/drawer/controls';
import {
  accessRequestDate,
  accessRequestInitials,
  accessRequestLabel,
  formatAccessRequestDate,
  type AccessRequest,
} from '../../types/accessRequests';

const BUTTON = 'h-8 rounded-lg px-3 text-[13px] font-semibold transition disabled:opacity-60';

interface AccessRequestsPanelProps {
  /** Курс страницы: без него панель показывает все новые заявки. */
  courseId?: string;
  /** Дёргается после «Открыть курс» — страница перечитывает свои списки. */
  onResolved?: () => void;
}

function RequestIdentity({ request }: { request: AccessRequest }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pastel-plain text-[13px] font-semibold text-ink"
        aria-hidden="true"
      >
        {accessRequestInitials(request)}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-fg">
          {accessRequestLabel(request)}
        </span>
        {request.email && (
          <span className="truncate text-[13px] text-muted">{request.email}</span>
        )}
      </div>
    </div>
  );
}

function AccessRequestRow({
  request,
  courseName,
  onApprove,
  onDecline,
}: {
  request: AccessRequest;
  courseName: string;
  onApprove: (request: AccessRequest) => Promise<void>;
  onDecline: (request: AccessRequest) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const date = formatAccessRequestDate(accessRequestDate(request));
  // Без курса открывать нечего, без почты некого записывать — обе кнопки
  // ведут в карточку, где доступ выдают руками.
  const canEnroll = Boolean(request.courseId && request.email);

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card2 p-3 md:flex-row md:items-start md:justify-between md:gap-4">
      <div className="min-w-0 space-y-2">
        <RequestIdentity request={request} />
        <p className="text-[13px] text-muted">
          {courseName}
          {date && ` · ${date}`}
        </p>
        {request.message && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className={`block w-full text-left text-sm text-fg ${expanded ? '' : 'line-clamp-3'}`}
          >
            {request.message}
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {canEnroll ? (
          <button
            type="button"
            disabled={enrolling}
            onClick={async () => {
              setEnrolling(true);
              try {
                await onApprove(request);
              } finally {
                setEnrolling(false);
              }
            }}
            className={`${BUTTON} bg-accent text-white hover:opacity-90`}
          >
            {enrolling ? 'Открываем…' : 'Открыть курс'}
          </button>
        ) : (
          <Link
            to={`/admin/users?user=${request.uid}`}
            className={`${BUTTON} inline-flex items-center border border-border bg-card text-fg no-underline hover:bg-card2`}
          >
            Открыть карточку
          </Link>
        )}
        <ConfirmAction
          label="Отклонить"
          question="Отклонить заявку?"
          confirmLabel="Да"
          danger
          onConfirm={() => onDecline(request)}
        />
      </div>
    </li>
  );
}

export function AccessRequestsPanel({ courseId, onResolved }: AccessRequestsPanelProps) {
  const { requests } = useAccessRequests({ courseId });
  const { courseMap } = useCourses({ includeUnpublished: true });
  const currentUid = useAuthStore((state) => state.user?.uid);
  const [error, setError] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const resolve = async (request: AccessRequest, status: 'approved' | 'declined') => {
    await updateDoc(doc(db, ACCESS_REQUESTS_COLLECTION, request.id), {
      status,
      resolvedAt: serverTimestamp(),
      resolvedBy: currentUid ?? null,
    });
  };

  const run = async (fallback: string, action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (err) {
      reportAppError({ message: fallback, error: err, context: 'AccessRequestsPanel' });
      setError(err instanceof Error ? err.message : fallback);
    }
  };

  const approve = (request: AccessRequest) =>
    run('Не удалось открыть курс по заявке', async () => {
      await bulkEnrollStudents({
        emails: [request.email as string],
        courseIds: [request.courseId as string],
      });
      await resolve(request, 'approved');
      onResolved?.();
    });

  const decline = (request: AccessRequest) =>
    run('Не удалось отклонить заявку', () => resolve(request, 'declined'));

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-brand md:p-5">
      <h2 className="text-base font-bold text-fg">Заявки на доступ · {requests.length}</h2>
      {error && (
        <p className="rounded-xl border border-pastel-terracotta bg-card2 px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {requests.map((request) => (
          <AccessRequestRow
            key={request.id}
            request={request}
            courseName={
              request.courseId
                ? (courseMap.get(request.courseId)?.name ?? request.courseId)
                : 'курс не указан'
            }
            onApprove={approve}
            onDecline={decline}
          />
        ))}
      </ul>
    </section>
  );
}

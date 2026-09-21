import type { Timestamp } from 'firebase/firestore';

/**
 * Заявка на доступ к курсу с сайта (AC-2). Гость отправляет её с `/home`,
 * закрывают супер-админ, со-админ и администратор курса из `courseId`.
 * Telegram остаётся каналом уведомления, хранилище — эта коллекция.
 *
 * Запросы к `accessRequests` — только equality-фильтры (`status`, `courseId`,
 * `uid`) без `orderBy`: composite-индексы в проекте не деплоятся (MR-5),
 * поэтому порядок задаёт клиент — `sortAccessRequests`.
 */
export type AccessRequestStatus = 'new' | 'approved' | 'declined';

/**
 * Поля документа `accessRequests/{id}` — ровно тот набор ключей, который
 * пропускают firestore.rules (`hasOnly`). `id` здесь намеренно отсутствует:
 * он живёт только в имени документа, а лишнее поле в payload отклонит create.
 */
export interface AccessRequestData {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** Выбранный курс или null — «не знаю / несколько курсов». */
  courseId: string | null;
  /** До 1000 символов, может быть пустым. */
  message: string;
  status: AccessRequestStatus;
  createdAt: Timestamp | null;
  resolvedAt?: Timestamp | null;
  resolvedBy?: string | null;
}

/** Заявка с id документа — то, с чем работают хуки и UI. */
export interface AccessRequest extends AccessRequestData {
  id: string;
}

/**
 * Timestamp → Date. Пока serverTimestamp не подтверждён сервером, локальный
 * снапшот отдаёт null — дата в UI просто не показывается.
 */
export function accessRequestDate(request: AccessRequest): Date | null {
  const value = request.createdAt;
  if (!value || typeof value.toDate !== 'function') return null;
  try {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

/** Кто просит доступ: имя → почта → uid. */
export function accessRequestLabel(request: AccessRequest): string {
  return request.displayName?.trim() || request.email || request.uid;
}

/** Инициалы для аватара-заглушки: до двух букв из имени или почты. */
export function accessRequestInitials(request: AccessRequest): string {
  const source = accessRequestLabel(request).replace(/[^\p{L}\p{N}\s]+/gu, ' ');
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part[0]).join('');
  return (initials || '?').toUpperCase();
}

/**
 * Свежие сверху. Сортировка на клиенте, потому что запрос к Firestore не
 * может добавить `orderBy('createdAt')` к фильтрам по `status`/`courseId`
 * без composite-индекса. Заявки без подтверждённой даты — в начало: это
 * только что отправленные, их серверная метка ещё в пути.
 */
export function sortAccessRequests(requests: AccessRequest[]): AccessRequest[] {
  const ms = (request: AccessRequest) => accessRequestDate(request)?.getTime() ?? Infinity;
  return [...requests].sort((a, b) => ms(b) - ms(a));
}

/** `dd.mm.yyyy` (или `dd.mm` при `withYear = false`); без даты — пустая строка. */
export function formatAccessRequestDate(date: Date | null, withYear = true): string {
  if (!date) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  const head = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
  return withYear ? `${head}.${date.getFullYear()}` : head;
}

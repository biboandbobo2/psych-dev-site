/**
 * Системная broadcast-группа «Все».
 *
 * - Документ `groups/everyone` создаётся один раз миграционным скриптом
 *   `scripts/ensure-everyone-group.ts`.
 * - Каждый новый пользователь автоматически попадает в эту группу через
 *   Cloud Function `onUserCreate`.
 * - В админке помечается как системная: нельзя удалить/переименовать/
 *   вручную поменять состав участников.
 *
 * Источник правды по id — этот модуль. Используется и в клиенте (Vite),
 * и в Cloud Functions (NodeNext, импортируется с расширением `.js`).
 */

export const EVERYONE_GROUP_ID = 'everyone';
export const EVERYONE_GROUP_NAME = 'Все';

export function isEveryoneGroup(groupId: string | null | undefined): boolean {
  return groupId === EVERYONE_GROUP_ID;
}

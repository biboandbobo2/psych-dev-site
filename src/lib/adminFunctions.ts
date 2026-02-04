import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { CourseAccessMap, UpdateCourseAccessParams } from "../types/user";

export interface MakeAdminParams {
  targetUid?: string;
  targetEmail?: string;
}

interface AdminActionResponse {
  success: boolean;
  message: string;
}

interface UpdateCourseAccessResponse {
  success: boolean;
  targetUid: string;
  targetEmail: string | null;
  courseAccess: CourseAccessMap;
  message: string;
}

export interface StudentEmailList {
  id: string;
  name: string;
  emails: string[];
  emailCount: number;
  updatedAtMs: number | null;
}

interface GetStudentEmailListsResponse {
  lists: StudentEmailList[];
}

export interface SaveStudentEmailListParams {
  name: string;
  emails: string[];
}

interface SaveStudentEmailListResponse {
  success: boolean;
  listId: string;
}

export interface BulkEnrollStudentsParams {
  emails: string[];
  courseIds: string[];
  saveList?: {
    enabled: boolean;
    name?: string;
  };
}

interface BulkEnrollStudentsResponse {
  success: boolean;
  updatedExisting: number;
  createdPending: number;
  totalProcessed: number;
  savedListId: string | null;
}

export async function makeUserAdmin(params: MakeAdminParams) {
  const makeAdmin = httpsCallable<MakeAdminParams, AdminActionResponse>(functions, "makeUserAdmin");
  const result = await makeAdmin(params);
  return result.data;
}

export async function removeAdmin(targetUid: string) {
  const remove = httpsCallable<{ targetUid: string }, AdminActionResponse>(functions, "removeAdmin");
  const result = await remove({ targetUid });
  return result.data;
}

/**
 * Обновляет доступ пользователя к курсам.
 * Только super-admin может вызывать эту функцию.
 *
 * @param params - параметры обновления (targetUid и courseAccess)
 * @returns результат операции
 */
export async function updateCourseAccess(params: UpdateCourseAccessParams) {
  const update = httpsCallable<UpdateCourseAccessParams, UpdateCourseAccessResponse>(
    functions,
    "updateCourseAccess"
  );
  const result = await update(params);
  return result.data;
}

export async function getStudentEmailLists() {
  const fn = httpsCallable<Record<string, never>, GetStudentEmailListsResponse>(
    functions,
    "getStudentEmailLists"
  );
  const result = await fn({});
  return result.data;
}

export async function saveStudentEmailList(params: SaveStudentEmailListParams) {
  const fn = httpsCallable<SaveStudentEmailListParams, SaveStudentEmailListResponse>(
    functions,
    "saveStudentEmailList"
  );
  const result = await fn(params);
  return result.data;
}

export async function bulkEnrollStudents(params: BulkEnrollStudentsParams) {
  const fn = httpsCallable<BulkEnrollStudentsParams, BulkEnrollStudentsResponse>(
    functions,
    "bulkEnrollStudents"
  );
  const result = await fn(params);
  return result.data;
}

export interface SetUserRoleParams {
  targetUid: string;
  role: "guest" | "student";
}

interface SetUserRoleResponse {
  success: boolean;
  targetUid: string;
  targetEmail: string | null;
  previousRole: string;
  newRole: string;
  message: string;
}

/**
 * Меняет роль пользователя между guest и student.
 * Только super-admin может вызывать эту функцию.
 *
 * @param params - параметры: targetUid и role
 * @returns результат операции
 */
export async function setUserRole(params: SetUserRoleParams) {
  const setRole = httpsCallable<SetUserRoleParams, SetUserRoleResponse>(
    functions,
    "setUserRole"
  );
  const result = await setRole(params);
  return result.data;
}

export interface ToggleUserDisabledParams {
  targetUid: string;
  disabled: boolean;
}

interface ToggleUserDisabledResponse {
  success: boolean;
  targetUid: string;
  targetEmail: string;
  disabled: boolean;
  message: string;
}

/**
 * Отключает или включает пользователя.
 * Отключённый пользователь не может войти, но все его данные сохраняются.
 * Только super-admin может вызывать эту функцию.
 *
 * @param params - параметры: targetUid и disabled (true = отключить)
 * @returns результат операции
 */
export async function toggleUserDisabled(params: ToggleUserDisabledParams) {
  const toggle = httpsCallable<ToggleUserDisabledParams, ToggleUserDisabledResponse>(
    functions,
    "toggleUserDisabled"
  );
  const result = await toggle(params);
  return result.data;
}

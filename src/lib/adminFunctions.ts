import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { CourseAccessMap, UpdateCourseAccessParams } from "../types/user";

export interface MakeAdminParams {
  targetUid?: string;
  targetEmail?: string;
  editableCourses: string[];
}

export interface SetAdminEditableCoursesParams {
  targetUid: string;
  editableCourses: string[];
}

interface SetAdminEditableCoursesResponse {
  success: boolean;
  editableCourses: string[];
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
 * Обновить список курсов, которые admin может редактировать.
 * Только super-admin, список не должен быть пустым.
 */
export async function setAdminEditableCourses(params: SetAdminEditableCoursesParams) {
  const call = httpsCallable<SetAdminEditableCoursesParams, SetAdminEditableCoursesResponse>(
    functions,
    "setAdminEditableCourses"
  );
  const result = await call(params);
  return result.data;
}

// === Группы ===

export interface CreateGroupParams {
  name: string;
  description?: string;
  memberIds?: string[];
  grantedCourses?: string[];
  announcementAdminIds?: string[];
}
export interface UpdateGroupParams {
  groupId: string;
  name?: string;
  description?: string;
  grantedCourses?: string[];
  announcementAdminIds?: string[];
}
export interface SetGroupMembersParams {
  groupId: string;
  memberIds: string[];
}

export async function createGroup(params: CreateGroupParams) {
  const call = httpsCallable<CreateGroupParams, { success: true; groupId: string }>(
    functions,
    "createGroup"
  );
  const result = await call(params);
  return result.data;
}

export async function updateGroup(params: UpdateGroupParams) {
  const call = httpsCallable<UpdateGroupParams, { success: true }>(functions, "updateGroup");
  const result = await call(params);
  return result.data;
}

export async function setGroupMembers(params: SetGroupMembersParams) {
  const call = httpsCallable<SetGroupMembersParams, { success: true; count: number }>(
    functions,
    "setGroupMembers"
  );
  const result = await call(params);
  return result.data;
}

export async function deleteGroup(groupId: string) {
  const call = httpsCallable<{ groupId: string }, { success: true }>(functions, "deleteGroup");
  const result = await call({ groupId });
  return result.data;
}

export interface SetGroupFeaturedCoursesParams {
  groupId: string;
  courseIds: string[];
}

interface SetFeaturedCoursesResponse {
  success: true;
  courseIds: string[];
}

/**
 * Записать «актуальные курсы» группы. Только super-admin или админ,
 * указанный в announcementAdminIds группы. Максимум 3 курса.
 */
export async function setGroupFeaturedCourses(params: SetGroupFeaturedCoursesParams) {
  const call = httpsCallable<SetGroupFeaturedCoursesParams, SetFeaturedCoursesResponse>(
    functions,
    "setGroupFeaturedCourses"
  );
  const result = await call(params);
  return result.data;
}

export interface SetMyFeaturedCoursesParams {
  courseIds: string[];
  /** Только super-admin может менять чужие. По умолчанию — собственный uid. */
  targetUid?: string;
}

/**
 * Записать личные «актуальные курсы» текущего пользователя. Максимум 3 курса.
 */
export async function setMyFeaturedCourses(params: SetMyFeaturedCoursesParams) {
  const call = httpsCallable<SetMyFeaturedCoursesParams, SetFeaturedCoursesResponse>(
    functions,
    "setMyFeaturedCourses"
  );
  const result = await call(params);
  return result.data;
}

export interface AddGroupMembersByEmailResponse {
  success: true;
  resolvedExisting: number;
  createdPending: number;
  uids: string[];
}

export async function addGroupMembersByEmail(params: { groupId: string; emails: string[] }) {
  const call = httpsCallable<
    { groupId: string; emails: string[] },
    AddGroupMembersByEmailResponse
  >(functions, "addGroupMembersByEmail");
  const result = await call(params);
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

export interface BillingSummarySku {
  sku: string;
  costUsd: number;
}

export interface BillingSummaryService {
  service: string;
  costUsd: number;
  skus: BillingSummarySku[];
}

export interface BillingSummaryData {
  projectId: string;
  month: string;
  monthLabel: string;
  totalCostUsd: number;
  lastUsageEnd: string | null;
  recentDays: Array<{ date: string; costUsd: number }>;
  services: BillingSummaryService[];
  tableRef: string;
  dataSource: "bigquery";
}

export type BillingSummaryResponse =
  | { ok: true; configured: true; summary: BillingSummaryData }
  | { ok: false; configured: false; error: string; diagnostics?: string[] };

export async function getBillingSummary() {
  const fn = httpsCallable<Record<string, never>, BillingSummaryResponse>(
    functions,
    "getBillingSummary"
  );
  const result = await fn({});
  return result.data;
}

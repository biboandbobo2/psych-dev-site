import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { isSuperAdmin } from "../lib/shared.js";
import type { AttendanceGroup } from "./model.js";

export function documentId(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 200 ||
    value.includes("/") ||
    value === "." ||
    value === ".."
  )
    throw new HttpsError("invalid-argument", `Некорректное поле ${field}.`);
  return value;
}

export async function requireGroup(
  request: Pick<CallableRequest, "auth">,
  groupId: string,
  memberOnly = false,
): Promise<AttendanceGroup> {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Войдите на сайт.");
  const snap = await getFirestore().collection("groups").doc(groupId).get();
  if (!snap.exists || snap.data()?.isSystem)
    throw new HttpsError("not-found", "Группа не найдена.");
  const group = snap.data() as AttendanceGroup;
  const allowed = memberOnly
    ? group.memberIds?.includes(request.auth.uid)
    : isSuperAdmin(request) ||
      (request.auth.token.role === "admin" &&
        group.announcementAdminIds?.includes(request.auth.uid));
  if (!allowed)
    throw new HttpsError(
      "permission-denied",
      "Нет доступа к посещаемости этой группы.",
    );
  return group;
}

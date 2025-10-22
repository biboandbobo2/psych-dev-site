import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export interface MakeAdminParams {
  targetUid?: string;
  targetEmail?: string;
}

interface AdminActionResponse {
  success: boolean;
  message: string;
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

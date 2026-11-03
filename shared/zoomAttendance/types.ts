/** Public callable contracts. Credentials and raw Zoom identifiers stay on the server. */
export interface ZoomAttendanceAccount {
  key: string;
  label: string;
}

export interface ZoomAttendanceSettings {
  accountKey: string | null;
  minPercent: number;
}

export type ZoomAttendanceStatus = "pending" | "ready" | "error";

export interface ZoomAttendanceEvent {
  id: string;
  title: string;
  startAtMs: number;
  endAtMs: number;
  status: ZoomAttendanceStatus;
  message: string | null;
  syncedAtMs: number | null;
}

export interface ZoomAttendanceStudent {
  uid: string;
  displayName: string;
  email: string;
}

export interface ZoomAttendanceParticipant {
  key: string;
  name: string;
  email: string | null;
  minutes: number;
  studentId: string | null;
  matchSource: "email" | "saved" | "manual" | "name" | null;
  canRemember: boolean;
  canRememberByName?: boolean;
  nameMatchingIssue?: "generic" | "ambiguous" | null;
}

export interface ZoomStudentAttendance {
  uid: string;
  minutes: number;
  percent: number;
  present: boolean;
}

export interface ZoomAttendanceResponse {
  settings: ZoomAttendanceSettings;
  accounts: ZoomAttendanceAccount[];
  accountsConfigured: boolean;
  canConfigure: boolean;
  events: ZoomAttendanceEvent[];
  students: ZoomAttendanceStudent[];
  participants: ZoomAttendanceParticipant[];
  attendance: ZoomStudentAttendance[];
}

export interface ZoomAttendanceQuery {
  groupId: string;
  eventId?: string;
}

export interface SetZoomAttendanceConnection extends ZoomAttendanceSettings {
  groupId: string;
}

export interface MatchZoomAttendanceParticipant {
  groupId: string;
  eventId: string;
  participantKey: string;
  studentId: string | null;
  remember: boolean;
  rememberName?: boolean;
}

export interface MyZoomAttendanceResponse {
  enabled: boolean;
  status: ZoomAttendanceStatus;
  minutes: number | null;
  percent: number | null;
  present: boolean | null;
}

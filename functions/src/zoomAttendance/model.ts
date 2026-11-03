import type {
  ZoomAttendanceSettings,
  ZoomAttendanceStatus,
} from "../../../shared/zoomAttendance/types.js";

export interface AttendanceGroup {
  memberIds?: string[];
  announcementAdminIds?: string[];
  isSystem?: boolean;
}

export interface AttendanceEvent {
  id: string;
  title: string;
  meetingId: string;
  startAtMs: number;
  endAtMs: number;
}

export interface AttendanceConfig extends ZoomAttendanceSettings {
  updatedAtMs: number;
}

export interface AttendanceSession {
  accountKey: string;
  meetingId: string;
  eventStartMs: number;
  eventEndMs: number;
  status: ZoomAttendanceStatus;
  message: string | null;
  syncedAtMs: number | null;
  lastAttemptMs: number;
  retryAfterMs: number;
  activeSnapshot?: string;
  leaseUntilMs?: number;
  leaseId?: string;
}

export interface AttendanceInterval {
  startMs: number;
  endMs: number;
}

export interface AttendanceRow {
  key: string;
  name: string;
  email: string | null;
  aliasKey: string | null;
  intervals: AttendanceInterval[];
}

export interface AttendanceOverride {
  studentId: string | null;
}

import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import type {
  ZoomAttendanceQuery,
  ZoomAttendanceResponse,
  SetZoomAttendanceConnection,
  MatchZoomAttendanceParticipant,
  MyZoomAttendanceResponse,
} from "../../../shared/zoomAttendance";

export const getAttendance = async (query: ZoomAttendanceQuery) =>
  (
    await httpsCallable<ZoomAttendanceQuery, ZoomAttendanceResponse>(
      functions,
      "getZoomAttendance",
    )(query)
  ).data;
export const setConnection = async (input: SetZoomAttendanceConnection) =>
  httpsCallable<SetZoomAttendanceConnection, { success: true }>(
    functions,
    "setZoomAttendanceConnection",
  )(input);
export const syncAttendance = async (input: Required<ZoomAttendanceQuery>) =>
  httpsCallable<Required<ZoomAttendanceQuery>, { success: true }>(
    functions,
    "syncZoomAttendance",
    { timeout: 300000 },
  )(input);
export const matchParticipant = async (input: MatchZoomAttendanceParticipant) =>
  httpsCallable<MatchZoomAttendanceParticipant, { success: true }>(
    functions,
    "matchZoomAttendanceParticipant",
  )(input);
export const getMyAttendance = async (input: Required<ZoomAttendanceQuery>) =>
  (
    await httpsCallable<
      Required<ZoomAttendanceQuery>,
      MyZoomAttendanceResponse
    >(
      functions,
      "getMyZoomAttendance",
    )(input)
  ).data;

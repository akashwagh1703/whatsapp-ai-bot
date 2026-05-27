/**
 * Session manager — persistent flow sessions (re-exports session service).
 */
export {
  getActiveSession,
  startSession,
  updateSession,
  updateSessionStatus,
} from "@/modules/sessions/session-service";

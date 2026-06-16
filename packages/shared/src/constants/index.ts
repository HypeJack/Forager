/**
 * Shared constants used across frontend and backend.
 */

/** Application metadata */
export const APP_NAME = "Forager" as const;
export const APP_VERSION = "0.1.0" as const;

/** Grant status progression order */
export const GRANT_STATUS_ORDER = [
  "discovered",
  "screening",
  "matched",
  "drafting",
  "submitted",
  "awarded",
  "rejected",
  "archived",
] as const;

/** Agent types available in the system */
export const AGENT_TYPES = [
  "scout",
  "librarian",
  "architect",
  "liaison",
] as const;

/** Default pagination */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Agent constraints */
export const MAX_CONCURRENT_RUNS_DEFAULT = 3;
export const AGENT_TIMEOUT_MS = 120_000; // 2 minutes

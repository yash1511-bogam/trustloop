export const APP_NAME = "TrustLoop";
export const SESSION_COOKIE_NAME = "trustloop_session";
export const SESSION_DURATION_DAYS = 7;

export const REMINDER_QUEUE_NAME =
  process.env.REMINDER_QUEUE_NAME ?? "trustloop-incident-reminders";

export const DEFAULT_MODELS = {
  OPENAI: "gpt-4o-mini",
  GEMINI: "gemini-2.0-flash",
  ANTHROPIC: "claude-3-5-haiku-20241022",
} as const;

export const WORKFLOW_NAMES = {
  INCIDENT_TRIAGE: "INCIDENT_TRIAGE",
  CUSTOMER_UPDATE: "CUSTOMER_UPDATE",
} as const;

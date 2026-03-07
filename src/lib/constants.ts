export const APP_NAME = "TrustLoop";

export const SESSION_COOKIE_NAME = "trustloop_session";
export const SESSION_CACHE_TTL_SECONDS = 120;

export const STYTCH_OTP_EXPIRATION_MINUTES = Number(
  process.env.STYTCH_OTP_EXPIRATION_MINUTES ?? 5,
);
export const STYTCH_SESSION_DURATION_MINUTES = Number(
  process.env.STYTCH_SESSION_DURATION_MINUTES ?? 60 * 24,
);

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

export const DASHBOARD_CACHE_TTL_SECONDS = 45;

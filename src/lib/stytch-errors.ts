type StytchErrorPayload = {
  status_code?: number;
  request_id?: string;
  error_type?: string;
  error_message?: string;
  error_url?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPayload(value: unknown): StytchErrorPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const errorType = typeof value.error_type === "string" ? value.error_type : undefined;
  const errorMessage =
    typeof value.error_message === "string" ? value.error_message : undefined;
  if (!errorType && !errorMessage) {
    return null;
  }

  return {
    status_code:
      typeof value.status_code === "number" ? value.status_code : undefined,
    request_id: typeof value.request_id === "string" ? value.request_id : undefined,
    error_type: errorType,
    error_message: errorMessage,
    error_url: typeof value.error_url === "string" ? value.error_url : undefined,
  };
}

export function extractStytchError(error: unknown): StytchErrorPayload | null {
  const direct = toPayload(error);
  if (direct) {
    return direct;
  }

  if (!(error instanceof Error)) {
    return null;
  }

  const fromCause = toPayload((error as Error & { cause?: unknown }).cause);
  if (fromCause) {
    return fromCause;
  }

  const rawMessage = error.message?.trim();
  if (!rawMessage) {
    return null;
  }

  try {
    return toPayload(JSON.parse(rawMessage));
  } catch {
    return null;
  }
}

export function authChallengeErrorMessage(error: unknown, fallback: string): string {
  const payload = extractStytchError(error);
  if (!payload) {
    return fallback;
  }

  if (payload.error_type === "inactive_email") {
    return "This email is marked inactive in Stytch (likely from a previous hard bounce). Reactivate it in the Stytch dashboard and try again.";
  }

  return payload.error_message ?? fallback;
}


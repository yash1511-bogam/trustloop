import { timingSafeEqual } from "crypto";

/**
 * Timing-safe comparison for cron secret headers.
 * Prevents timing attacks that could leak the secret byte-by-byte.
 */
export function verifyCronSecret(expected: string | undefined, provided: string | null): boolean {
  if (!expected || !provided) {
    return false;
  }

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

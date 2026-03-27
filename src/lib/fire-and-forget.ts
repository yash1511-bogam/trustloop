import { log } from "@/lib/logger";

/**
 * Fire-and-forget wrapper that logs failures instead of silently swallowing them.
 * Use in place of `.catch(() => {})` for audit logs, emails, and other non-critical side effects.
 */
export function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((error: unknown) => {
    log.app.warn(`Fire-and-forget task failed: ${label}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

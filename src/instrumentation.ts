import { initSentry } from "@/lib/sentry";

export async function register(): Promise<void> {
  initSentry();
}

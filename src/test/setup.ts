/**
 * Shared test setup — re-exports factories and mock reset helpers.
 *
 * Usage in test files:
 *   import { buildWorkspace, buildUser, resetAllMocks } from "@/test/setup";
 */

import { resetEmails } from "./mock-email";
import { resetQueue } from "./mock-queue";
import { resetStytchState } from "./mock-stytch";

export {
  id,
  buildWorkspace,
  buildUser,
  buildIncident,
  buildWorkspaceBilling,
  buildApiKey,
} from "./factories";

export { __stytchState, resetStytchState } from "./mock-stytch";
export { __sentEmails, resetEmails } from "./mock-email";
export { __enqueuedMessages, resetQueue } from "./mock-queue";

export function resetAllMocks() {
  resetStytchState();
  resetEmails();
  resetQueue();
}

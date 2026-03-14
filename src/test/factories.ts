/**
 * Test factory helpers — seed Workspace, User, Incident objects for integration tests.
 * All factories return plain objects matching Prisma model shapes.
 */

import { randomUUID } from "crypto";

/* ---------- ID helpers ---------- */
let seq = 0;
export function id(): string {
  return randomUUID();
}
function nextSeq(): number {
  return ++seq;
}

/* ---------- Workspace ---------- */
export function buildWorkspace(overrides: Record<string, unknown> = {}) {
  const n = nextSeq();
  return {
    id: id(),
    name: `Test Workspace ${n}`,
    slug: `test-ws-${n}`,
    planTier: "starter",
    statusPageEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/* ---------- User ---------- */
export function buildUser(
  workspaceId: string,
  overrides: Record<string, unknown> = {},
) {
  const n = nextSeq();
  return {
    id: id(),
    name: `User ${n}`,
    email: `user${n}@test.local`,
    stytchUserId: `stytch-user-${id()}`,
    role: "OWNER" as const,
    workspaceId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/* ---------- Incident ---------- */
export function buildIncident(
  workspaceId: string,
  overrides: Record<string, unknown> = {},
) {
  const n = nextSeq();
  return {
    id: id(),
    workspaceId,
    title: `Test Incident ${n}`,
    description: `Description for incident ${n}`,
    severity: "P2" as const,
    status: "NEW" as const,
    category: "OTHER" as const,
    channel: "API" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/* ---------- WorkspaceBilling ---------- */
export function buildWorkspaceBilling(
  workspaceId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: id(),
    workspaceId,
    customerId: `cust_${id().slice(0, 8)}`,
    subscriptionId: `sub_${id().slice(0, 8)}`,
    planTier: "starter",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/* ---------- API Key ---------- */
export function buildApiKey(
  workspaceId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: id(),
    workspaceId,
    name: `Test Key`,
    keyPrefix: "tl_test",
    keyHash: `$2b$10$fakehash${id().slice(0, 20)}`,
    scopes: ["incidents:read", "incidents:write"],
    createdAt: new Date(),
    ...overrides,
  };
}

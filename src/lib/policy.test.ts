import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock redis
vi.mock("@/lib/redis", () => {
  let store: Record<string, { value: unknown; count?: number }> = {};
  return {
    redisGetJson: vi.fn(async (key: string) => store[key]?.value ?? null),
    redisSetJson: vi.fn(async (key: string, value: unknown) => { store[key] = { value }; }),
    redisIncrementWithExpiry: vi.fn(async (key: string) => {
      store[key] = store[key] ?? { value: null, count: 0 };
      store[key].count = (store[key].count ?? 0) + 1;
      return store[key].count;
    }),
    __resetStore: () => { store = {}; },
  };
});

// Mock prisma
const mockUpsert = vi.fn();
const mockPrismaUsageUpsert = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: (...args: unknown[]) => mockWorkspaceFindUnique(...args) },
    workspaceQuota: { upsert: (...args: unknown[]) => mockUpsert(...args) },
    workspaceDailyUsage: { upsert: (...args: unknown[]) => mockPrismaUsageUpsert(...args) },
  },
}));

import { enforceWorkspaceRateLimit, enforceWorkspaceQuota, consumeWorkspaceQuota } from "@/lib/policy";
import * as redisModule from "@/lib/redis";

const defaultQuota = {
  apiRequestsPerMinute: 120,
  incidentsPerDay: 200,
  triageRunsPerDay: 300,
  customerUpdatesPerDay: 300,
  reminderEmailsPerDay: 500,
};

const defaultUsage = {
  incidentsCreated: 0,
  triageRuns: 0,
  customerUpdates: 0,
  reminderEmailsSent: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  (redisModule as unknown as { __resetStore: () => void }).__resetStore();
  mockWorkspaceFindUnique.mockResolvedValue({
    planTier: "pro",
    trialEndsAt: null,
    billing: { status: "ACTIVE" },
  });
  mockUpsert.mockResolvedValue(defaultQuota);
  mockPrismaUsageUpsert.mockResolvedValue(defaultUsage);
});

describe("enforceWorkspaceRateLimit", () => {
  it("allows first request", async () => {
    const result = await enforceWorkspaceRateLimit("ws-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(119);
    expect(result.limit).toBe(120);
  });

  it("denies when bucket exceeds limit", async () => {
    // Simulate 120 prior calls
    vi.mocked(redisModule.redisIncrementWithExpiry).mockResolvedValueOnce(121);
    const result = await enforceWorkspaceRateLimit("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("enforceWorkspaceQuota", () => {
  it("allows when usage is under limit", async () => {
    const result = await enforceWorkspaceQuota("ws-1", "incidents");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(200);
    expect(result.used).toBe(0);
    expect(result.remaining).toBe(200);
  });

  it("denies when usage equals limit", async () => {
    mockPrismaUsageUpsert.mockResolvedValueOnce({ ...defaultUsage, incidentsCreated: 200 });
    const result = await enforceWorkspaceQuota("ws-1", "incidents");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("denies when usage exceeds limit", async () => {
    mockPrismaUsageUpsert.mockResolvedValueOnce({ ...defaultUsage, triageRuns: 999 });
    const result = await enforceWorkspaceQuota("ws-1", "triage");
    expect(result.allowed).toBe(false);
  });

  it("works for all 4 quota metrics", async () => {
    for (const metric of ["incidents", "triage", "customer_updates", "reminder_emails"] as const) {
      const result = await enforceWorkspaceQuota("ws-1", metric);
      expect(result.allowed).toBe(true);
    }
  });
});

describe("consumeWorkspaceQuota", () => {
  it("calls prisma upsert with correct increment", async () => {
    await consumeWorkspaceQuota("ws-1", "incidents", 1);
    expect(mockPrismaUsageUpsert).toHaveBeenCalledTimes(1);
    const call = mockPrismaUsageUpsert.mock.calls[0][0];
    expect(call.update.incidentsCreated).toEqual({ increment: 1 });
    expect(call.update.triageRuns).toEqual({ increment: 0 });
  });

  it("increments correct field for triage metric", async () => {
    await consumeWorkspaceQuota("ws-1", "triage", 3);
    const call = mockPrismaUsageUpsert.mock.calls[0][0];
    expect(call.update.triageRuns).toEqual({ increment: 3 });
    expect(call.update.incidentsCreated).toEqual({ increment: 0 });
  });
});

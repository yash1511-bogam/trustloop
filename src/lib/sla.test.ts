import { describe, it, expect } from "vitest";
import { buildIncidentSlaFields } from "@/lib/sla";

// Mock prisma to avoid DB connection
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const defaultPolicy = {
  firstResponseHoursP1: 1,
  firstResponseHoursP2: 4,
  firstResponseHoursP3: 24,
  resolutionHoursP1: 4,
  resolutionHoursP2: 24,
  resolutionHoursP3: 72,
  autoEscalateP2AfterHours: 12,
};

describe("buildIncidentSlaFields", () => {
  const base = new Date("2026-01-15T12:00:00.000Z");

  it("P1: first response due in 1h, resolution in 4h", () => {
    const result = buildIncidentSlaFields({ createdAt: base, severity: "P1" as never, policy: defaultPolicy });
    expect(result.slaFirstResponseDueAt.getTime()).toBe(base.getTime() + 1 * 3_600_000);
    expect(result.slaResolutionDueAt.getTime()).toBe(base.getTime() + 4 * 3_600_000);
    expect(result.slaState).toBe("ON_TRACK");
  });

  it("P2: first response due in 4h, resolution in 24h", () => {
    const result = buildIncidentSlaFields({ createdAt: base, severity: "P2" as never, policy: defaultPolicy });
    expect(result.slaFirstResponseDueAt.getTime()).toBe(base.getTime() + 4 * 3_600_000);
    expect(result.slaResolutionDueAt.getTime()).toBe(base.getTime() + 24 * 3_600_000);
  });

  it("P3: first response due in 24h, resolution in 72h", () => {
    const result = buildIncidentSlaFields({ createdAt: base, severity: "P3" as never, policy: defaultPolicy });
    expect(result.slaFirstResponseDueAt.getTime()).toBe(base.getTime() + 24 * 3_600_000);
    expect(result.slaResolutionDueAt.getTime()).toBe(base.getTime() + 72 * 3_600_000);
  });

  it("uses current time when createdAt is omitted", () => {
    const before = Date.now();
    const result = buildIncidentSlaFields({ severity: "P1" as never, policy: defaultPolicy });
    const after = Date.now();
    expect(result.slaFirstResponseDueAt.getTime()).toBeGreaterThanOrEqual(before + 1 * 3_600_000);
    expect(result.slaFirstResponseDueAt.getTime()).toBeLessThanOrEqual(after + 1 * 3_600_000);
  });

  it("addHours clamps negative hours to 0", () => {
    const negPolicy = { ...defaultPolicy, firstResponseHoursP1: -5 };
    const result = buildIncidentSlaFields({ createdAt: base, severity: "P1" as never, policy: negPolicy });
    // Math.max(0, -5) = 0, so due at same time as created
    expect(result.slaFirstResponseDueAt.getTime()).toBe(base.getTime());
  });

  it("handles custom policy values", () => {
    const custom = { ...defaultPolicy, firstResponseHoursP1: 2, resolutionHoursP1: 8 };
    const result = buildIncidentSlaFields({ createdAt: base, severity: "P1" as never, policy: custom });
    expect(result.slaFirstResponseDueAt.getTime()).toBe(base.getTime() + 2 * 3_600_000);
    expect(result.slaResolutionDueAt.getTime()).toBe(base.getTime() + 8 * 3_600_000);
  });
});

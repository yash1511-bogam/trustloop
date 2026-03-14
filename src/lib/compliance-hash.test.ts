import { describe, it, expect } from "vitest";
import { computeEventHash, buildEventHashChain } from "@/lib/compliance-hash";

describe("computeEventHash", () => {
  it("uses GENESIS when previousHash is null", () => {
    const hash = computeEventHash({
      previousHash: null,
      eventId: "evt-1",
      incidentId: "inc-1",
      eventType: "CREATED",
      body: "Incident created",
      actorUserId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("chains from previous hash", () => {
    const first = computeEventHash({
      previousHash: null,
      eventId: "evt-1",
      incidentId: "inc-1",
      eventType: "CREATED",
      body: "created",
      actorUserId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const second = computeEventHash({
      previousHash: first,
      eventId: "evt-2",
      incidentId: "inc-1",
      eventType: "NOTE",
      body: "investigating",
      actorUserId: "user-1",
      createdAt: "2026-01-01T01:00:00.000Z",
    });
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });

  it("is deterministic for same inputs", () => {
    const args = {
      previousHash: null,
      eventId: "evt-1",
      incidentId: "inc-1",
      eventType: "CREATED",
      body: "test",
      actorUserId: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
    } as const;
    expect(computeEventHash(args)).toBe(computeEventHash(args));
  });

  it("detects tampered body", () => {
    const original = computeEventHash({
      previousHash: null,
      eventId: "evt-1",
      incidentId: "inc-1",
      eventType: "CREATED",
      body: "original",
      actorUserId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const tampered = computeEventHash({
      previousHash: null,
      eventId: "evt-1",
      incidentId: "inc-1",
      eventType: "CREATED",
      body: "tampered",
      actorUserId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(original).not.toBe(tampered);
  });
});

describe("buildEventHashChain", () => {
  it("builds chain with GENESIS start", () => {
    const events = [
      { id: "e1", incidentId: "i1", eventType: "CREATED", body: "created", actorUserId: null, createdAt: new Date("2026-01-01") },
      { id: "e2", incidentId: "i1", eventType: "NOTE", body: "note", actorUserId: "u1", createdAt: new Date("2026-01-02") },
    ];
    const chain = buildEventHashChain(events);
    expect(chain).toHaveLength(2);
    expect(chain[0].previousHash).toBeNull();
    expect(chain[1].previousHash).toBe(chain[0].hash);
  });

  it("returns empty array for empty input", () => {
    expect(buildEventHashChain([])).toEqual([]);
  });

  it("chain breaks if event is removed from middle", () => {
    const events = [
      { id: "e1", incidentId: "i1", eventType: "CREATED", body: "a", actorUserId: null, createdAt: new Date("2026-01-01") },
      { id: "e2", incidentId: "i1", eventType: "NOTE", body: "b", actorUserId: null, createdAt: new Date("2026-01-02") },
      { id: "e3", incidentId: "i1", eventType: "NOTE", body: "c", actorUserId: null, createdAt: new Date("2026-01-03") },
    ];
    const fullChain = buildEventHashChain(events);
    const withoutMiddle = buildEventHashChain([events[0], events[2]]);
    // Third event hash differs because its previousHash changed
    expect(withoutMiddle[1].hash).not.toBe(fullChain[2].hash);
  });
});

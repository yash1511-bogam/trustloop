import { describe, it, expect } from "vitest";
import { normalizeOutboundWebhookEvents, OUTBOUND_WEBHOOK_EVENTS } from "@/lib/outbound-webhooks";

// Mock dependencies to avoid DB/crypto side effects on import
vi.mock("@/lib/encryption", () => ({
  encryptSecret: vi.fn((s: string) => `enc:${s}`),
  decryptSecret: vi.fn((s: string) => s.replace("enc:", "")),
  last4: vi.fn((s: string) => s.slice(-4)),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("normalizeOutboundWebhookEvents", () => {
  it("returns all events when input is null", () => {
    expect(normalizeOutboundWebhookEvents(null)).toEqual([...OUTBOUND_WEBHOOK_EVENTS]);
  });

  it("returns all events when input is empty array", () => {
    expect(normalizeOutboundWebhookEvents([])).toEqual([...OUTBOUND_WEBHOOK_EVENTS]);
  });

  it("returns all events when input is undefined", () => {
    expect(normalizeOutboundWebhookEvents(undefined)).toEqual([...OUTBOUND_WEBHOOK_EVENTS]);
  });

  it("filters valid events", () => {
    const result = normalizeOutboundWebhookEvents(["incident.created", "incident.resolved"]);
    expect(result).toEqual(["incident.created", "incident.resolved"]);
  });

  it("removes unknown events", () => {
    const result = normalizeOutboundWebhookEvents(["incident.created", "bogus.event"]);
    expect(result).toEqual(["incident.created"]);
  });

  it("deduplicates events", () => {
    const result = normalizeOutboundWebhookEvents(["incident.created", "incident.created"]);
    expect(result).toEqual(["incident.created"]);
  });

  it("falls back to all events when all inputs are unknown", () => {
    const result = normalizeOutboundWebhookEvents(["fake.one", "fake.two"]);
    expect(result).toEqual([...OUTBOUND_WEBHOOK_EVENTS]);
  });

  it("trims whitespace from event names", () => {
    const result = normalizeOutboundWebhookEvents(["  incident.created  "]);
    expect(result).toEqual(["incident.created"]);
  });
});

import { describe, it, expect } from "vitest";
import { isFeatureAllowed, featureGateError } from "@/lib/feature-gate";

describe("isFeatureAllowed", () => {
  it("ai_keys: starter and above (not free)", () => {
    expect(isFeatureAllowed("free", "ai_keys")).toBe(false);
    expect(isFeatureAllowed("starter", "ai_keys")).toBe(true);
    expect(isFeatureAllowed("pro", "ai_keys")).toBe(true);
    expect(isFeatureAllowed("enterprise", "ai_keys")).toBe(true);
  });

  it("saml: only enterprise", () => {
    expect(isFeatureAllowed("free", "saml")).toBe(false);
    expect(isFeatureAllowed("starter", "saml")).toBe(false);
    expect(isFeatureAllowed("pro", "saml")).toBe(false);
    expect(isFeatureAllowed("enterprise", "saml")).toBe(true);
  });

  it("compliance: pro + enterprise", () => {
    expect(isFeatureAllowed("starter", "compliance")).toBe(false);
    expect(isFeatureAllowed("pro", "compliance")).toBe(true);
    expect(isFeatureAllowed("enterprise", "compliance")).toBe(true);
  });

  it("on_call: pro + enterprise", () => {
    expect(isFeatureAllowed("starter", "on_call")).toBe(false);
    expect(isFeatureAllowed("pro", "on_call")).toBe(true);
    expect(isFeatureAllowed("enterprise", "on_call")).toBe(true);
  });

  it("api_keys: pro + enterprise", () => {
    expect(isFeatureAllowed("starter", "api_keys")).toBe(false);
    expect(isFeatureAllowed("pro", "api_keys")).toBe(true);
    expect(isFeatureAllowed("enterprise", "api_keys")).toBe(true);
  });

  it("webhooks: starter and above (not free)", () => {
    expect(isFeatureAllowed("free", "webhooks")).toBe(false);
    expect(isFeatureAllowed("starter", "webhooks")).toBe(true);
    expect(isFeatureAllowed("pro", "webhooks")).toBe(true);
    expect(isFeatureAllowed("enterprise", "webhooks")).toBe(true);
  });

  it("normalizes null/undefined to free", () => {
    expect(isFeatureAllowed(null, "compliance")).toBe(false);
    expect(isFeatureAllowed(undefined, "compliance")).toBe(false);
    expect(isFeatureAllowed(null, "saml")).toBe(false);
  });
});

describe("featureGateError", () => {
  it("returns single tier for saml", () => {
    expect(featureGateError("saml")).toContain("enterprise");
  });

  it("returns multiple tiers for compliance", () => {
    const msg = featureGateError("compliance");
    expect(msg).toContain("pro");
    expect(msg).toContain("enterprise");
  });
});

import { describe, it, expect } from "vitest";
import {
  clampQuotaToPlan,
  isTrialActive,
  normalizePlanTier,
  planDefinitionFor,
  quotasForPlan,
  resolveEffectivePlanTier,
} from "@/lib/billing-plan";

describe("normalizePlanTier", () => {
  it("returns starter for 'starter'", () => expect(normalizePlanTier("starter")).toBe("starter"));
  it("returns enterprise for 'enterprise'", () => expect(normalizePlanTier("enterprise")).toBe("enterprise"));
  it("returns pro for 'pro'", () => expect(normalizePlanTier("pro")).toBe("pro"));
  it("defaults to starter for null", () => expect(normalizePlanTier(null)).toBe("starter"));
  it("defaults to starter for undefined", () => expect(normalizePlanTier(undefined)).toBe("starter"));
  it("defaults to starter for unknown string", () => expect(normalizePlanTier("premium")).toBe("starter"));
  it("defaults to starter for 'free' (no longer valid)", () => expect(normalizePlanTier("free")).toBe("starter"));
});

describe("quotasForPlan", () => {
  it("starter has base quotas", () => {
    const q = quotasForPlan("starter");
    expect(q.apiRequestsPerMinute).toBe(120);
    expect(q.incidentsPerDay).toBe(50);
    expect(q.triageRunsPerDay).toBe(100);
    expect(q.customerUpdatesPerDay).toBe(100);
    expect(q.reminderEmailsPerDay).toBe(120);
  });

  it("pro has mid-range quotas", () => {
    const q = quotasForPlan("pro");
    expect(q.apiRequestsPerMinute).toBe(240);
    expect(q.incidentsPerDay).toBe(200);
    expect(q.triageRunsPerDay).toBe(300);
  });

  it("enterprise has very high quotas", () => {
    const q = quotasForPlan("enterprise");
    expect(q.apiRequestsPerMinute).toBe(1_000);
    expect(q.incidentsPerDay).toBe(1_000_000);
    expect(q.triageRunsPerDay).toBe(1_000_000);
  });

  it("starter < pro < enterprise for all metrics", () => {
    const s = quotasForPlan("starter");
    const p = quotasForPlan("pro");
    const e = quotasForPlan("enterprise");
    for (const key of Object.keys(s) as (keyof typeof s)[]) {
      expect(s[key]).toBeLessThan(p[key]);
      expect(p[key]).toBeLessThan(e[key]);
    }
  });
});

describe("planDefinitionFor", () => {
  it("returns correct id and label for each tier", () => {
    expect(planDefinitionFor("starter").id).toBe("starter");
    expect(planDefinitionFor("starter").label).toBe("Starter");
    expect(planDefinitionFor("pro").id).toBe("pro");
    expect(planDefinitionFor("enterprise").id).toBe("enterprise");
  });

  it("includes bullets array", () => {
    const def = planDefinitionFor("pro");
    expect(def.bullets.length).toBeGreaterThan(0);
    expect(def.bullets[0]).toContain("incidents per day");
  });
});

describe("clampQuotaToPlan", () => {
  it("caps quota values to the current plan maximums", () => {
    const clamped = clampQuotaToPlan({
      apiRequestsPerMinute: 500,
      incidentsPerDay: 999,
      triageRunsPerDay: 999,
      customerUpdatesPerDay: 999,
      reminderEmailsPerDay: 999,
    }, "starter");

    expect(clamped).toEqual(quotasForPlan("starter"));
  });
});

describe("trial and effective plan helpers", () => {
  it("treats future trial windows as active", () => {
    expect(isTrialActive(new Date(Date.now() + 60_000))).toBe(true);
    expect(isTrialActive(new Date(Date.now() - 60_000))).toBe(false);
  });

  it("resolves to starter when billing is inactive and trial has ended", () => {
    expect(resolveEffectivePlanTier({
      planTier: "pro",
      billingStatus: "CANCELED",
      trialEndsAt: new Date(Date.now() - 60_000),
    })).toBe("starter");
  });

  it("keeps active paid plans when billing is active", () => {
    expect(resolveEffectivePlanTier({
      planTier: "enterprise",
      billingStatus: "ACTIVE",
      trialEndsAt: null,
    })).toBe("enterprise");
  });
});

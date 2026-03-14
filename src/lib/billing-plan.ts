export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export type PlanQuota = {
  apiRequestsPerMinute: number;
  incidentsPerDay: number;
  triageRunsPerDay: number;
  customerUpdatesPerDay: number;
  reminderEmailsPerDay: number;
};

export type PlanDefinition = {
  id: PlanTier;
  label: string;
  headline: string;
  description: string;
  bullets: string[];
};

export function normalizePlanTier(value: string | null | undefined): PlanTier {
  if (value === "free") return "free";
  if (value === "starter" || value === "pro" || value === "enterprise") {
    return value;
  }
  return "free";
}

export function quotasForPlan(planTier: PlanTier): PlanQuota {
  if (planTier === "free") {
    return {
      apiRequestsPerMinute: 60,
      incidentsPerDay: 5,
      triageRunsPerDay: 10,
      customerUpdatesPerDay: 5,
      reminderEmailsPerDay: 10,
    };
  }

  if (planTier === "starter") {
    return {
      apiRequestsPerMinute: 120,
      incidentsPerDay: 50,
      triageRunsPerDay: 100,
      customerUpdatesPerDay: 100,
      reminderEmailsPerDay: 120,
    };
  }

  if (planTier === "enterprise") {
    return {
      apiRequestsPerMinute: 1_000,
      incidentsPerDay: 1_000_000,
      triageRunsPerDay: 1_000_000,
      customerUpdatesPerDay: 1_000_000,
      reminderEmailsPerDay: 1_000_000,
    };
  }

  return {
    apiRequestsPerMinute: 240,
    incidentsPerDay: 200,
    triageRunsPerDay: 300,
    customerUpdatesPerDay: 300,
    reminderEmailsPerDay: 500,
  };
}

export function clampQuotaToPlan<T extends PlanQuota>(quota: T, planTier: PlanTier): T {
  const limit = quotasForPlan(planTier);
  return {
    ...quota,
    apiRequestsPerMinute: Math.min(quota.apiRequestsPerMinute, limit.apiRequestsPerMinute),
    incidentsPerDay: Math.min(quota.incidentsPerDay, limit.incidentsPerDay),
    triageRunsPerDay: Math.min(quota.triageRunsPerDay, limit.triageRunsPerDay),
    customerUpdatesPerDay: Math.min(quota.customerUpdatesPerDay, limit.customerUpdatesPerDay),
    reminderEmailsPerDay: Math.min(quota.reminderEmailsPerDay, limit.reminderEmailsPerDay),
  };
}

export function isTrialActive(
  trialEndsAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!trialEndsAt) {
    return false;
  }

  const parsed = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() > now.getTime();
}

export function resolveEffectivePlanTier(input: {
  planTier: string | null | undefined;
  billingStatus?: string | null | undefined;
  trialEndsAt?: Date | string | null | undefined;
}, now = new Date()): PlanTier {
  const normalized = normalizePlanTier(input.planTier);
  if (normalized === "free") {
    return "free";
  }

  if (isTrialActive(input.trialEndsAt, now)) {
    return normalized;
  }

  if (input.billingStatus === "ACTIVE") {
    return normalized;
  }

  return "free";
}

export function planDefinitionFor(planTier: PlanTier): PlanDefinition {
  const quota = quotasForPlan(planTier);

  if (planTier === "free") {
    return {
      id: "free",
      label: "Free",
      headline: "Get started",
      description: "Explore TrustLoop with basic incident management. No credit card required.",
      bullets: [
        `${quota.incidentsPerDay} incidents per day`,
        `${quota.triageRunsPerDay} triage runs per day`,
        `${quota.customerUpdatesPerDay} customer updates per day`,
        "Community support",
      ],
    };
  }

  if (planTier === "starter") {
    return {
      id: "starter",
      label: "Starter",
      headline: "Lean coverage",
      description: "For smaller teams that need dependable incident coordination without a heavy monthly footprint.",
      bullets: [
        `${quota.incidentsPerDay.toLocaleString("en-US")} incidents per day`,
        `${quota.triageRunsPerDay.toLocaleString("en-US")} triage runs per day`,
        `${quota.customerUpdatesPerDay.toLocaleString("en-US")} customer updates per day`,
        `${quota.reminderEmailsPerDay.toLocaleString("en-US")} reminder emails per day`,
      ],
    };
  }

  if (planTier === "enterprise") {
    return {
      id: "enterprise",
      label: "Enterprise",
      headline: "High-scale operations",
      description: "For large or regulated teams that need very high throughput, stronger access controls, and fewer quota constraints.",
      bullets: [
        `${quota.incidentsPerDay.toLocaleString("en-US")} incidents per day`,
        `${quota.triageRunsPerDay.toLocaleString("en-US")} triage runs per day`,
        `${quota.customerUpdatesPerDay.toLocaleString("en-US")} customer updates per day`,
        `${quota.reminderEmailsPerDay.toLocaleString("en-US")} reminder emails per day`,
      ],
    };
  }

  return {
    id: "pro",
    label: "Pro",
    headline: "Daily operator default",
    description: "Balanced limits for teams running incident intake, triage, and customer comms as part of daily operations.",
    bullets: [
      `${quota.incidentsPerDay.toLocaleString("en-US")} incidents per day`,
      `${quota.triageRunsPerDay.toLocaleString("en-US")} triage runs per day`,
      `${quota.customerUpdatesPerDay.toLocaleString("en-US")} customer updates per day`,
      `${quota.reminderEmailsPerDay.toLocaleString("en-US")} reminder emails per day`,
    ],
  };
}


import DodoPayments from "dodopayments";
import { PlanTier } from "@/lib/billing-plan";

const globalForDodo = globalThis as unknown as {
  dodoClient?: DodoPayments;
};

function requiredValue(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`${name} is required for Dodo Payments integration.`);
  }
  return value.trim();
}

function dodoEnvironment(): "test_mode" | "live_mode" {
  const env = (process.env.DODO_PAYMENTS_ENV ?? "test_mode").trim().toLowerCase();
  return env === "live_mode" || env === "live" ? "live_mode" : "test_mode";
}

export function dodoCheckoutMode(): "test" | "live" {
  return dodoEnvironment() === "live_mode" ? "live" : "test";
}

export function hasAnnualProducts(): boolean {
  return !!(process.env.DODO_PRODUCT_ID_STARTER_ANNUAL?.trim() || process.env.DODO_PRODUCT_ID_PRO_ANNUAL?.trim());
}

export function dodoClient(): DodoPayments {
  if (globalForDodo.dodoClient) {
    return globalForDodo.dodoClient;
  }

  const client = new DodoPayments({
    bearerToken: requiredValue("DODO_PAYMENTS_API_KEY"),
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || null,
    environment: dodoEnvironment(),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDodo.dodoClient = client;
  }

  return client;
}

export type BillingInterval = "monthly" | "annual";

export function dodoProductIdForPlan(plan: PlanTier, interval: BillingInterval = "monthly"): string {
  if (plan === "enterprise") {
    const id = requiredValue("DODO_PRODUCT_ID_ENTERPRISE");
    if (id === "custom") {
      throw new Error(
        "Enterprise plan requires a custom agreement. Set DODO_PRODUCT_ID_ENTERPRISE to a valid product ID.",
      );
    }
    return id;
  }
  if (plan === "starter") {
    if (interval === "annual") {
      return process.env.DODO_PRODUCT_ID_STARTER_ANNUAL?.trim() || requiredValue("DODO_PRODUCT_ID_STARTER");
    }
    return requiredValue("DODO_PRODUCT_ID_STARTER");
  }
  // pro
  if (interval === "annual") {
    return process.env.DODO_PRODUCT_ID_PRO_ANNUAL?.trim() || requiredValue("DODO_PRODUCT_ID_PRO");
  }
  return requiredValue("DODO_PRODUCT_ID_PRO");
}

export function planForDodoProductId(productId: string | null | undefined): PlanTier | null {
  if (!productId) return null;
  const ids: Record<string, PlanTier> = {};
  for (const key of [
    "DODO_PRODUCT_ID_STARTER", "DODO_PRODUCT_ID_STARTER_ANNUAL",
    "DODO_PRODUCT_ID_PRO", "DODO_PRODUCT_ID_PRO_ANNUAL",
    "DODO_PRODUCT_ID_ENTERPRISE",
  ]) {
    const val = process.env[key]?.trim();
    if (val) {
      const plan = key.includes("STARTER") ? "starter" : key.includes("PRO") ? "pro" : "enterprise";
      ids[val] = plan;
    }
  }
  return ids[productId] ?? null;
}

export function intervalForDodoProductId(productId: string | null | undefined): BillingInterval {
  if (!productId) return "monthly";
  const annualIds = [
    process.env.DODO_PRODUCT_ID_STARTER_ANNUAL?.trim(),
    process.env.DODO_PRODUCT_ID_PRO_ANNUAL?.trim(),
  ].filter(Boolean);
  return annualIds.includes(productId) ? "annual" : "monthly";
}

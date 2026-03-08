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
  return env === "live_mode" ? "live_mode" : "test_mode";
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

export function dodoProductIdForPlan(plan: PlanTier): string {
  if (plan === "starter") {
    return requiredValue("DODO_PRODUCT_ID_STARTER");
  }
  if (plan === "enterprise") {
    return requiredValue("DODO_PRODUCT_ID_ENTERPRISE");
  }
  return requiredValue("DODO_PRODUCT_ID_PRO");
}

export function planForDodoProductId(productId: string | null | undefined): PlanTier | null {
  if (!productId) {
    return null;
  }
  if (productId === process.env.DODO_PRODUCT_ID_STARTER) {
    return "starter";
  }
  if (productId === process.env.DODO_PRODUCT_ID_PRO) {
    return "pro";
  }
  if (productId === process.env.DODO_PRODUCT_ID_ENTERPRISE) {
    return "enterprise";
  }
  return null;
}

import { type PlanTier, normalizePlanTier } from "@/lib/billing-plan";

export type GatedFeature = "saml" | "compliance" | "on_call" | "api_keys" | "webhooks";

const FEATURE_TIERS: Record<GatedFeature, PlanTier[]> = {
  saml: ["enterprise"],
  compliance: ["pro", "enterprise"],
  on_call: ["pro", "enterprise"],
  api_keys: ["pro", "enterprise"],
  webhooks: ["starter", "pro", "enterprise"],
};

export function isFeatureAllowed(planTier: string | null | undefined, feature: GatedFeature): boolean {
  const normalized = normalizePlanTier(planTier);
  return FEATURE_TIERS[feature].includes(normalized);
}

export function featureGateError(feature: GatedFeature): string {
  const tiers = FEATURE_TIERS[feature];
  const tierLabel = tiers.length === 1 ? tiers[0] : tiers.join(" or ");
  return `This feature requires the ${tierLabel} plan.`;
}

import { type PlanTier, normalizePlanTier } from "@/lib/billing-plan";

export type GatedFeature =
  | "saml"
  | "compliance"
  | "on_call"
  | "api_keys"
  | "webhooks"
  | "ai_keys";
export type FeatureKey = GatedFeature;

const FEATURE_TIERS: Record<FeatureKey, PlanTier[]> = {
  ai_keys: ["starter", "pro", "enterprise"],
  saml: ["enterprise"],
  compliance: ["pro", "enterprise"],
  on_call: ["pro", "enterprise"],
  api_keys: ["pro", "enterprise"],
  webhooks: ["starter", "pro", "enterprise"],
};

export function isFeatureAllowed(planTier: string | null | undefined, feature: FeatureKey): boolean {
  const normalized = normalizePlanTier(planTier);
  return FEATURE_TIERS[feature].includes(normalized);
}

export function featureGateError(feature: FeatureKey): string {
  const tiers = FEATURE_TIERS[feature];
  const tierLabel = tiers.length === 1 ? tiers[0] : tiers.join(" or ");
  return `This feature requires the ${tierLabel} plan.`;
}

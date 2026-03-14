import { isFeatureAllowed, type FeatureKey } from "@/lib/feature-gate";
import { getWorkspacePlanTier } from "@/lib/plan-tier-cache";

export async function isWorkspaceFeatureAllowed(
  workspaceId: string,
  feature: FeatureKey,
): Promise<boolean> {
  return isFeatureAllowed(await getWorkspacePlanTier(workspaceId), feature);
}

export const VIRTUAL_CARD_TYPES = ["PERSONAL", "PROFESSIONAL", "CREATOR", "BUSINESS"] as const;
export type VirtualCardTypeValue = (typeof VIRTUAL_CARD_TYPES)[number];

export type VirtualCardEntitlement = {
  maxVirtualCards: number;
  allowBusinessCards: boolean;
};

export function canCreateVirtualCard(
  entitlement: VirtualCardEntitlement,
  currentCount: number,
  type: VirtualCardTypeValue,
) {
  if (currentCount >= entitlement.maxVirtualCards) return { allowed: false, reason: "VIRTUAL_CARD_LIMIT_REACHED" } as const;
  if (type === "BUSINESS" && !entitlement.allowBusinessCards) return { allowed: false, reason: "BUSINESS_CARD_PLAN_REQUIRED" } as const;
  return { allowed: true } as const;
}

export function profileTypeForVirtualCard(type: VirtualCardTypeValue) {
  return type === "BUSINESS" ? "ORGANIZATION" as const : "PERSONAL" as const;
}

export const PLAN_RANK: Record<string, number> = { free:0,default:0,personal:1,plus:2,pro:3,business:4,"pro-business":5,proBusiness:5 };

export function templateAllowed(planSlug: string, minimumPlan: string) {
  return (PLAN_RANK[planSlug.toLowerCase()] ?? -1) >= (PLAN_RANK[minimumPlan.toLowerCase()] ?? Number.POSITIVE_INFINITY);
}

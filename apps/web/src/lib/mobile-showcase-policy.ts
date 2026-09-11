import { approvedTemplateBySlug } from "./profile-templates";
import { templateAllowed } from "./virtual-cards";
import { isSafeDestinationUrl } from "./url";

export type ShowcaseEntitlements = {
  storefrontEnabled: boolean; storefrontProductsEnabled: boolean; storefrontServicesEnabled: boolean;
  storefrontMaxItems: number | null; storefrontWhatsappOrder: boolean; storefrontEmailOrder: boolean;
};
export function templateSelectionError(template: { slug: string; profileKind: string | null; minimumPlan: string; isActive: boolean }, kind: string, planSlug: string, effective: { allowThemes: boolean; storefrontEnabled: boolean }) {
  const approved = approvedTemplateBySlug(template.slug);
  if (!approved || !template.isActive || approved.profileKind !== kind || (template.profileKind && template.profileKind !== kind)) return "PROFILE_TEMPLATE_INCOMPATIBLE";
  if (!effective.allowThemes || !templateAllowed(planSlug, template.minimumPlan)) return "PROFILE_TEMPLATE_PLAN_REQUIRED";
  if (approved.family === "storefront" && !effective.storefrontEnabled) return "TEMPLATE_STOREFRONT_REQUIRED";
  return null;
}
export function showcaseWriteError(policy: ShowcaseEntitlements, kind: string, type: string, count: number, creating: boolean) {
  if (kind !== "BUSINESS") return "PROFILE_TYPE_NOT_AVAILABLE";
  if (type !== "PRODUCT" && type !== "SERVICE") return "SHOWCASE_TYPE_INVALID";
  if (!policy.storefrontEnabled || (type === "PRODUCT" ? !policy.storefrontProductsEnabled : !policy.storefrontServicesEnabled)) return "STOREFRONT_PLAN_REQUIRED";
  if (creating && policy.storefrontMaxItems !== null && count >= policy.storefrontMaxItems) return "STOREFRONT_LIMIT_REACHED";
  return null;
}
export function showcasePrice(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(raw)) throw new Error("SHOWCASE_PRICE_INVALID");
  return raw;
}
export function showcaseCurrency(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(raw)) throw new Error("SHOWCASE_CURRENCY_INVALID");
  return raw;
}
export function showcaseImage(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  // Owner uploads reference existing private media; publishing resolves a revision-bound URL.
  if (/^\/api\/profiles\/[a-zA-Z0-9_-]+\/media\/[a-zA-Z0-9_-]+$/.test(raw)) return raw;
  if (raw.length > 2048 || !raw.startsWith("https://") || !isSafeDestinationUrl(raw)) throw new Error("SHOWCASE_IMAGE_INVALID");
  const url = new URL(raw);
  if (url.username || url.password) throw new Error("SHOWCASE_IMAGE_INVALID");
  return raw;
}

export function safeTemplateThumbnail(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  if (/^\/(?:templates|brand)\/[a-zA-Z0-9/_.-]+$/.test(value) && !value.includes("..")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

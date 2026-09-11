import { prisma } from "@popwam/db";
import { getOwnedDraft, legacyDraftToPublicProfile } from "./profile-publishing";
import { getUserEntitlements } from "./plans";
import { templateSelectionError } from "./mobile-showcase-policy";

export async function mobileDraftPreview(userId: string, profileId: string, templateId: string) {
  const profile = await getOwnedDraft(userId, profileId);
  // The shared editor also supports team administrators; this preview is strictly owner-only.
  if (!profile || profile.userId !== userId) throw new Error("PROFILE_NOT_FOUND");
  const [template, { plan, effective }] = await Promise.all([
    prisma.profileTemplate.findUnique({ where: { id: templateId }, include: { moduleRules: { include: { moduleDefinition: true } } } }), getUserEntitlements(userId),
  ]);
  if (!template) throw new Error("PROFILE_TEMPLATE_INCOMPATIBLE");
  const error = templateSelectionError(template, profile.profileKind || (profile.type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL"), plan.slug, effective);
  if (error) throw new Error(error);
  const draft = { ...profile, template, templateId: template.id, virtualCard: profile.virtualCard ? { ...profile.virtualCard, template } : null };
  const preview = legacyDraftToPublicProfile(draft);
  // Reuse authenticated media URLs. The Android preview authorizes only this owner's media path.
  const media = (purpose: string) => [...profile.mediaAssets].reverse().find(item => item.purpose === purpose && item.state !== "DELETED" && item.state !== "ORPHANED");
  const image = (purpose: string) => { const asset = media(purpose); return asset ? `/api/profiles/${profileId}/media/${asset.id}` : null; };
  preview.avatarUrl = image("AVATAR") || image("ONBOARDING_IMAGE") || preview.avatarUrl;
  preview.logoUrl = image("LOGO") || image("ONBOARDING_IMAGE") || preview.logoUrl;
  preview.coverUrl = image("COVER") || preview.coverUrl;
  return { preview, draftRevision: profile.draftRevision };
}

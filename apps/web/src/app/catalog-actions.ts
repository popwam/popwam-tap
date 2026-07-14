"use server";

import { Prisma, prisma } from "@popwam/db";
import { createStorageKey, isStorageEnabled, uploadPublicImage, validateImageUpload } from "@popwam/storage";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { requireUser } from "@/lib/session";
import { getUserEntitlements } from "@/lib/plans";
import { templateAllowed } from "@/lib/virtual-cards";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();

export async function saveLinkPlatform(data: FormData) {
  const admin = await requireAdmin();
  const id = text(data, "id") || undefined;
  const slug = text(data, "slug").toLowerCase();
  if (!/^[a-z0-9-]{2,48}$/.test(slug) || !text(data, "nameAr") || !text(data, "nameEn") || !text(data, "placeholder")) throw new Error("LINK_PLATFORM_INVALID");
  let customIconUrl = text(data, "customIconUrl") || null;
  const iconFile = data.get("iconFile");
  if (iconFile instanceof File && iconFile.size > 0) {
    if (!isStorageEnabled()) throw new Error("STORAGE_NOT_CONFIGURED");
    const validation = validateImageUpload({ filename: iconFile.name, contentType: iconFile.type, size: iconFile.size });
    if (!validation.valid) throw new Error(validation.error);
    const key = createStorageKey({ userId: admin.id, type: "link-platform-icons", filename: iconFile.name });
    customIconUrl = (await uploadPublicImage(new Uint8Array(await iconFile.arrayBuffer()), { key, contentType: iconFile.type })).url;
  }
  const payload = { nameAr: text(data, "nameAr"), nameEn: text(data, "nameEn"), slug, iconKey: text(data, "iconKey") || "link", customIconUrl, placeholder: text(data, "placeholder"), validationPattern: text(data, "validationPattern") || null, category: text(data, "category") || "SOCIAL", isActive: data.get("isActive") === "on", sortOrder: Math.max(0, Number(text(data, "sortOrder") || 0)), allowCustomLabel: data.get("allowCustomLabel") === "on" };
  const platform = id ? await prisma.linkPlatform.update({ where: { id }, data: payload }) : await prisma.linkPlatform.create({ data: payload });
  await prisma.auditLog.create({ data: { actorId: admin.id, operation: id ? "admin.link_platform.update" : "admin.link_platform.create", targetId: platform.id } });
  revalidatePath("/admin/link-platforms");
  revalidatePath("/onboarding");
}

export async function toggleLinkPlatform(data: FormData) {
  const admin = await requireAdmin();
  const platform = await prisma.linkPlatform.findUnique({ where: { id: text(data, "id") } });
  if (!platform) throw new Error("LINK_PLATFORM_NOT_FOUND");
  await prisma.linkPlatform.update({ where: { id: platform.id }, data: { isActive: !platform.isActive } });
  await prisma.auditLog.create({ data: { actorId: admin.id, operation: "admin.link_platform.toggle", targetId: platform.id, metadata: { isActive: !platform.isActive } } });
  revalidatePath("/admin/link-platforms");
  revalidatePath("/onboarding");
}

export async function saveProfileTemplate(data: FormData) {
  const admin = await requireAdmin();
  const id = text(data, "id") || undefined;
  const slug = text(data, "slug").toLowerCase();
  if (!/^[a-z0-9-]{2,48}$/.test(slug) || !text(data, "nameAr") || !text(data, "nameEn")) throw new Error("TEMPLATE_INVALID");
  let configuration: Record<string, unknown>;
  try { configuration = JSON.parse(text(data, "configuration") || "{}"); if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) throw new Error(); } catch { throw new Error("TEMPLATE_CONFIGURATION_INVALID"); }
  const payload = { nameAr: text(data, "nameAr"), nameEn: text(data, "nameEn"), slug, category: text(data, "category") || "Minimal", minimumPlan: text(data, "minimumPlan").toLowerCase() || "free", previewImageUrl: text(data, "previewImageUrl") || null, configuration: configuration as Prisma.InputJsonValue, isActive: data.get("isActive") === "on", sortOrder: Math.max(0, Number(text(data, "sortOrder") || 0)) };
  const template = id ? await prisma.profileTemplate.update({ where: { id }, data: payload }) : await prisma.profileTemplate.create({ data: payload });
  await prisma.auditLog.create({ data: { actorId: admin.id, operation: id ? "admin.profile_template.update" : "admin.profile_template.create", targetId: template.id } });
  revalidatePath("/admin/templates"); revalidatePath("/dashboard/templates");
}

export async function selectProfileTemplate(data: FormData) {
  const user = await requireUser();
  const virtualCardId = text(data, "virtualCardId");
  const templateId = text(data, "templateId");
  const [card, template, entitlements] = await Promise.all([prisma.virtualCard.findFirst({ where: { id: virtualCardId, userId: user.id }, select: { id: true, profileId: true } }), prisma.profileTemplate.findFirst({ where: { id: templateId, isActive: true } }), getUserEntitlements(user.id)]);
  if (!card || !template) throw new Error("TEMPLATE_NOT_FOUND");
  if (!templateAllowed(entitlements.plan.slug, template.minimumPlan)) throw new Error("TEMPLATE_PLAN_REQUIRED");
  await prisma.virtualCard.update({ where: { id: card.id }, data: { themeId: template.id } });
  await prisma.auditLog.create({ data: { actorId: user.id, operation: "virtual_card.template.select", targetId: card.id, metadata: { templateId } } });
  revalidatePath("/dashboard/templates"); revalidatePath(`/p/id/${card.profileId}`);
}

export async function setDefaultVirtualCard(data: FormData) {
  const user = await requireUser();
  const card = await prisma.virtualCard.findFirst({ where: { id: text(data, "virtualCardId"), userId: user.id, status: { not: "ARCHIVED" } } });
  if (!card) throw new Error("VIRTUAL_CARD_NOT_FOUND");
  await prisma.$transaction([prisma.virtualCard.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } }), prisma.virtualCard.update({ where: { id: card.id }, data: { isDefault: true } }), prisma.auditLog.create({ data: { actorId: user.id, operation: "virtual_card.default", targetId: card.id } })]);
  revalidatePath("/dashboard/profiles");
}

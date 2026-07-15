"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  AccountStatus, DestinationType, Prisma, ProfileFieldType, ProfileTheme, prisma, SubscriptionStatus,
  SystemRole, TagEventType, TagMode, TagStatus, ProfileType,
} from "@popwam/db";
import { defaultIconKeys, safeIconKey, validateShortCode } from "@popwam/shared";
import { requireAdmin, requireUser } from "@/lib/session";
import { canManageDestination, canManageTag } from "@/lib/permissions";
import { isSafeDestinationUrl, normalizeAndValidate } from "@/lib/url";
import { ensureUserDefaults, ensureUserDefaultsInTransaction } from "@/lib/ensure-user";
import { assertWithinLimit, assertWithinLimitLocked, getUserEntitlements } from "@/lib/plans";
import { deleteObject } from "@popwam/storage";
import { isUniqueConstraintError, normalizeEmail, runAtomicUserCreation } from "@/lib/user-validation";
import { canCreateVirtualCard, profileTypeForVirtualCard, VIRTUAL_CARD_TYPES, type VirtualCardTypeValue } from "@/lib/virtual-cards";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;
const nullableNumber = (data: FormData, key: string) => text(data, key) === "" ? null : Math.max(0, Number(text(data, key)));

function publicRevalidate(profile?: { id: string; slug?: string | null }) {
  revalidatePath("/dashboard");
  if (profile) {
    revalidatePath(`/p/id/${profile.id}`);
    revalidatePath(`/manifest/profile/${profile.slug || profile.id}.webmanifest`);
    revalidatePath(`/api/profile/${profile.slug || profile.id}/icon/192`);
    revalidatePath(`/api/profile/${profile.slug || profile.id}/icon/512`);
    if (profile.slug) revalidatePath(`/p/${profile.slug}`);
  }
}

async function audit(actorId: string, operation: string, targetId?: string, metadata?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({ data: { actorId, operation, targetId, metadata } });
}

export async function updateProfile(data: FormData) {
  const user = await requireUser();
  const profileId = text(data, "profileId");
  const profile = profileId
    ? await prisma.profile.findFirst({ where: { id: profileId, ...(user.role === "ADMIN" ? {} : { userId: user.id }) } })
    : await prisma.profile.findFirst({ where: { userId: user.id, organizationId: null } });
  const displayName = text(data, "displayName");
  if (!profile || !displayName) throw new Error("PROFILE_INVALID");
  const previousSlug = profile.slug;
  const requestedSlug = optional(data, "slug");
  const slugResult = requestedSlug ? validateShortCode(requestedSlug) : null;
  if (slugResult && !slugResult.valid) throw new Error(`SHORT_CODE_${slugResult.reason.toUpperCase()}`);
  if (slugResult?.code !== previousSlug) {
    const { effective } = await getUserEntitlements(profile.userId);
    if (slugResult?.code && !effective.allowCustomSlug) throw new Error("FEATURE_CUSTOM_SLUG_REQUIRED");
  }
  const urlFields = ["avatarUrl", "coverUrl", "website", "facebook", "linkedin", "github", "tiktok", "vcfUrl"] as const;
  for (const field of urlFields) {
    const value = optional(data, field);
    if (value && !isSafeDestinationUrl(value)) throw new Error("INVALID_URL");
  }
  const theme = Object.values(ProfileTheme).includes(text(data, "theme") as ProfileTheme) ? text(data, "theme") as ProfileTheme : profile.theme;
  const { effective } = await getUserEntitlements(profile.userId);
  if (theme !== "CLASSIC_DARK" && !effective.allowThemes) throw new Error("FEATURE_THEMES_REQUIRED");
  if(Array.isArray(effective.availableThemes)&&!effective.availableThemes.map(String).includes(theme))throw new Error("THEME_NOT_AVAILABLE");
  const allowInstallable = data.get("allowInstallable") === "on";
  if (allowInstallable && !effective.allowInstallableProfiles) throw new Error("INSTALLABLE_PROFILE_PLAN_REQUIRED");
  const parseCrop = (key: string) => { try { return JSON.parse(text(data, key)) as Prisma.InputJsonValue; } catch { return undefined; } };
  const nextAvatarKey = optional(data, "avatarStorageKey"); const nextCoverKey = optional(data, "coverStorageKey");
  const visibility = Object.fromEntries([
    "showAvatar", "showCover", "showDisplayName", "showTitle", "showBio", "showPhone", "showEmail", "showWebsite", "showLocation",
    "showWhatsappBusiness", "showWhatsappPrivate", "showSocialLinks", "showCustomFields", "showUploadedFiles", "showSaveContact",
  ].map(key => [key, data.get(key) === "on"]));
  await prisma.profile.update({ where: { id: profile.id }, data: {
    displayName, slug: slugResult?.code || null, title: optional(data, "title"), bio: optional(data, "bio"), theme,
    avatarUrl: optional(data, "avatarUrl"), avatarStorageKey: nextAvatarKey, avatarCrop: parseCrop("avatarCrop"),
    coverUrl: optional(data, "coverUrl"), coverStorageKey: nextCoverKey, coverCrop: parseCrop("coverCrop"),
    phone: optional(data, "phone"), whatsappBusiness: optional(data, "whatsappBusiness"),
    whatsappPrivate: optional(data, "whatsappPrivate"), email: optional(data, "email"),
    website: optional(data, "website"), facebook: optional(data, "facebook"), linkedin: optional(data, "linkedin"),
    github: optional(data, "github"), tiktok: optional(data, "tiktok"), vcfUrl: optional(data, "vcfUrl"),
    locationText: optional(data, "locationText"), isPublic: data.get("isPublic") === "on", allowInstallable, ...visibility,
  }});
  for (const oldKey of [profile.avatarStorageKey !== nextAvatarKey ? profile.avatarStorageKey : null, profile.coverStorageKey !== nextCoverKey ? profile.coverStorageKey : null]) if (oldKey) await deleteObject(oldKey).catch(error => console.error("old image cleanup failed", { operation: "profile.image.cleanup", userId: user.id, error: error instanceof Error ? error.name : "unknown" }));
  revalidatePath("/dashboard/profile");
  if (previousSlug) revalidatePath(`/p/${previousSlug}`);
  publicRevalidate({ id: profile.id, slug: slugResult?.code });
}

export async function updateProfileTheme(data: FormData) {
  const user=await requireUser();const profile=await prisma.profile.findFirst({where:{id:text(data,"profileId"),...(user.role==="ADMIN"?{}:{userId:user.id})}});const theme=text(data,"theme") as ProfileTheme;if(!profile||!Object.values(ProfileTheme).includes(theme))throw new Error("THEME_INVALID");const {effective}=await getUserEntitlements(profile.userId);if(theme!==profile.theme&&!effective.allowThemes)throw new Error("FEATURE_THEMES_REQUIRED");if(Array.isArray(effective.availableThemes)&&!effective.availableThemes.map(String).includes(theme))throw new Error("THEME_NOT_AVAILABLE");await prisma.profile.update({where:{id:profile.id},data:{theme}});revalidatePath("/dashboard/appearance");revalidatePath("/dashboard/profile");publicRevalidate(profile);
}

export async function createProfile(data: FormData) {
  const user = await requireUser();
  const requested = (text(data, "cardType") || (text(data, "type") === "ORGANIZATION" ? "BUSINESS" : "PERSONAL")) as VirtualCardTypeValue;
  if (!VIRTUAL_CARD_TYPES.includes(requested)) throw new Error("VIRTUAL_CARD_TYPE_INVALID");
  const displayName = text(data, "displayName");
  if (!displayName) throw new Error("PROFILE_NAME_REQUIRED");
  await prisma.$transaction(async tx => {
    const { effective, used } = await assertWithinLimitLocked(tx, user.id, "virtualCards");
    await assertWithinLimitLocked(tx, user.id, "profiles");
    await assertWithinLimitLocked(tx, user.id, "links", 2);
    const decision = canCreateVirtualCard({ maxVirtualCards: Number(effective.maxVirtualCards), allowBusinessCards: Boolean(effective.allowBusinessCards) }, used, requested);
    if (!decision.allowed) throw new Error(decision.reason);
    const type = profileTypeForVirtualCard(requested);
    const profile = await tx.profile.create({ data: { userId: user.id, type, displayName, displayNameAr: optional(data, "displayNameAr"), displayNameEn: optional(data, "displayNameEn"), organizationNameAr: type === "ORGANIZATION" ? optional(data, "displayNameAr") : null, organizationNameEn: type === "ORGANIZATION" ? optional(data, "displayNameEn") : null, primaryLanguage: text(data, "primaryLanguage") === "en" ? "en" : "ar", email: user.email } });
    await tx.virtualCard.create({ data: { userId: user.id, name: displayName, type: requested, profileId: profile.id, isDefault: used === 0 } });
    await tx.destination.createMany({ data: [
      { userId: user.id, profileId: profile.id, type: "PROFILE", title: "Public profile", titleAr: "الملف العام", titleEn: "Public profile", url: `/p/id/${profile.id}`, iconKey: "profile" },
      { userId: user.id, profileId: profile.id, type: "VCF", title: "Save contact", titleAr: "حفظ جهة الاتصال", titleEn: "Save Contact", url: `/api/profiles/${profile.id}/contact.vcf`, iconKey: "contact" },
    ] });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath("/dashboard/profiles");
}

export async function updateProfileContent(data:FormData){const user=await requireUser();const profile=await prisma.profile.findFirst({where:{id:text(data,"profileId"),userId:user.id},include:{virtualCard:true}});if(!profile)throw new Error("PROFILE_NOT_FOUND");const type=text(data,"type") as ProfileType;if(!Object.values(ProfileType).includes(type))throw new Error("PROFILE_TYPE_INVALID");const {effective}=await getUserEntitlements(user.id);if(type==="ORGANIZATION"&&profile.type!=="ORGANIZATION"&&!effective.allowBusinessCards)throw new Error("BUSINESS_CARD_PLAN_REQUIRED");const website=optional(data,"website");if(website&&!isSafeDestinationUrl(website))throw new Error("INVALID_URL");const displayName=optional(data,"displayNameAr")||optional(data,"displayNameEn")||profile.displayName;await prisma.profile.update({where:{id:profile.id},data:{type,primaryLanguage:text(data,"primaryLanguage")==="en"?"en":"ar",displayName,firstName:optional(data,"firstName"),lastName:optional(data,"lastName"),displayNameAr:optional(data,"displayNameAr"),displayNameEn:optional(data,"displayNameEn"),jobTitleAr:optional(data,"jobTitleAr"),jobTitleEn:optional(data,"jobTitleEn"),company:optional(data,"company"),bioAr:optional(data,"bioAr"),bioEn:optional(data,"bioEn"),organizationNameAr:type==="ORGANIZATION"?optional(data,"displayNameAr"):null,organizationNameEn:type==="ORGANIZATION"?optional(data,"displayNameEn"):null,industryAr:optional(data,"industryAr"),industryEn:optional(data,"industryEn"),descriptionAr:optional(data,"descriptionAr"),descriptionEn:optional(data,"descriptionEn"),phone:optional(data,"phone"),alternatePhone:optional(data,"alternatePhone"),whatsappBusiness:optional(data,"whatsapp"),email:optional(data,"email"),website,addressAr:optional(data,"addressAr"),addressEn:optional(data,"addressEn"),contactNotesAr:optional(data,"contactNotesAr"),contactNotesEn:optional(data,"contactNotesEn")}});if(profile.virtualCard)await prisma.virtualCard.update({where:{id:profile.virtualCard.id},data:{name:displayName,...(type==="ORGANIZATION"?{type:"BUSINESS"}:{})}});revalidatePath("/dashboard/profiles");publicRevalidate(profile);}

export async function addProfileService(data:FormData){const user=await requireUser();const profile=await prisma.profile.findFirst({where:{id:text(data,"profileId"),userId:user.id,type:"ORGANIZATION"}});if(!profile)throw new Error("PROFILE_NOT_FOUND");const nameAr=optional(data,"nameAr"),nameEn=optional(data,"nameEn");if(!nameAr&&!nameEn)throw new Error("SERVICE_NAME_REQUIRED");const sortOrder=await prisma.profileService.count({where:{profileId:profile.id}});await prisma.profileService.create({data:{profileId:profile.id,nameAr,nameEn,descriptionAr:optional(data,"descriptionAr"),descriptionEn:optional(data,"descriptionEn"),sortOrder}});revalidatePath("/dashboard/profiles");publicRevalidate(profile);}

export async function addProfileBranch(data:FormData){const user=await requireUser();const profile=await prisma.profile.findFirst({where:{id:text(data,"profileId"),userId:user.id,type:"ORGANIZATION"}});if(!profile)throw new Error("PROFILE_NOT_FOUND");const nameAr=optional(data,"nameAr"),nameEn=optional(data,"nameEn");if(!nameAr&&!nameEn)throw new Error("BRANCH_NAME_REQUIRED");const sortOrder=await prisma.profileBranch.count({where:{profileId:profile.id}});await prisma.profileBranch.create({data:{profileId:profile.id,nameAr,nameEn,addressAr:optional(data,"addressAr"),addressEn:optional(data,"addressEn"),phone:optional(data,"phone"),sortOrder}});revalidatePath("/dashboard/profiles");publicRevalidate(profile);}

function destinationInput(data: FormData, profileId?: string) {
  const title = text(data, "title");
  const type = text(data, "type") as DestinationType;
  if (!title || !Object.values(DestinationType).includes(type)) throw new Error("DESTINATION_INVALID");
  if (type === DestinationType.PROFILE) return { title, type, url: `/p/id/${profileId}`, iconKey: "profile", customIconUrl: null, isActive: true, isOfflineCapable: false };
  const normalized = normalizeAndValidate(type, text(data, "url"));
  if (!normalized.valid) throw new Error("INVALID_URL");
  const customIconUrl = optional(data, "customIconUrl");
  if (customIconUrl && !isSafeDestinationUrl(customIconUrl)) throw new Error("INVALID_URL");
  return { title, titleAr: optional(data,"titleAr"), titleEn: optional(data,"titleEn"), type, url: normalized.url, iconKey: safeIconKey(optional(data, "iconKey"), defaultIconKeys[type]), customIconUrl, isActive: data.get("isActive") === "on", isOfflineCapable: data.get("isOfflineCapable") === "on" };
}

export async function createDestination(data: FormData) {
  const user = await requireUser();
  const profile = await prisma.profile.findFirst({ where: { userId: user.id, organizationId: null }, select: { id: true, slug: true } });
  if (!profile) throw new Error("PROFILE_MISSING");
  const input = destinationInput(data, profile.id);
  await prisma.$transaction(async tx=>{const {effective}=await assertWithinLimitLocked(tx,user.id,"links");if(input.customIconUrl&&!effective.allowCustomIcons)throw new Error("FEATURE_CUSTOM_ICON_REQUIRED");const sortOrder=await tx.destination.count({where:{profileId:profile.id}});await tx.destination.create({data:{...input,userId:user.id,profileId:profile.id,isVisible:data.get("isVisible")!=="off",sortOrder}});},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  revalidatePath("/dashboard/cards"); revalidatePath("/dashboard/tags"); publicRevalidate(profile);
}

export async function updateDestination(data: FormData) {
  const user = await requireUser(); const id = text(data, "id");
  if (!await canManageDestination(user, id)) throw new Error("DESTINATION_NOT_FOUND");
  const current = await prisma.destination.findUniqueOrThrow({ where: { id }, include: { profile: { select: { id: true, slug: true } } } });
  const input = destinationInput(data, current.profileId || undefined); const { effective } = await getUserEntitlements(current.userId); if (input.customIconUrl && !effective.allowCustomIcons) throw new Error("FEATURE_CUSTOM_ICON_REQUIRED");
  await prisma.destination.update({ where: { id }, data: { ...input, isVisible: data.get("isVisible") === "on" } });
  revalidatePath("/dashboard/cards"); revalidatePath("/dashboard/tags"); if (current.profile) publicRevalidate(current.profile);
}

export async function deleteDestination(data: FormData) {
  const user = await requireUser(); const id = text(data, "id");
  if (!await canManageDestination(user, id)) throw new Error("DESTINATION_NOT_FOUND");
  const current = await prisma.destination.findUnique({ where: { id }, include: { profile: { select: { id: true, slug: true } } } });
  if (current?.type === DestinationType.PROFILE) throw new Error("PROFILE_DESTINATION_REQUIRED");
  await prisma.destination.delete({ where: { id } });
  revalidatePath("/dashboard/cards"); revalidatePath("/dashboard/tags"); if (current?.profile) publicRevalidate(current.profile);
}

export async function toggleDestinationVisibility(data: FormData) {
  const user = await requireUser(); const id = text(data, "id"); if (!await canManageDestination(user, id)) throw new Error("DESTINATION_NOT_FOUND");
  const item = await prisma.destination.findUniqueOrThrow({ where: { id }, include: { profile: { select: { id: true, slug: true } }, activeForTags: { select: { id: true, shortCode: true, token: true } } } });
  await prisma.destination.update({ where: { id }, data: { isVisible: !item.isVisible } }); revalidatePath("/dashboard/cards"); revalidatePath("/admin/links"); if (item.profile) publicRevalidate(item.profile); for (const tag of item.activeForTags) { revalidatePath(`/${tag.shortCode}`); revalidatePath(`/t/${tag.token}`); }
}

export async function moveDestination(data: FormData) {
  const user = await requireUser(); const id = text(data, "id"); if (!await canManageDestination(user, id)) throw new Error("DESTINATION_NOT_FOUND");
  const item = await prisma.destination.findUniqueOrThrow({ where: { id }, include: { profile: { select: { id: true, slug: true } } } }); const direction = text(data, "direction") === "up" ? -1 : 1;
  const neighbor = await prisma.destination.findFirst({ where: { profileId: item.profileId, sortOrder: direction < 0 ? { lt: item.sortOrder } : { gt: item.sortOrder } }, orderBy: { sortOrder: direction < 0 ? "desc" : "asc" } });
  if (neighbor) await prisma.$transaction([prisma.destination.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } }),prisma.destination.update({ where: { id: neighbor.id }, data: { sortOrder: item.sortOrder } })]); revalidatePath("/dashboard/cards"); if (item.profile) publicRevalidate(item.profile);
}

export async function createProfileField(data: FormData) {
  const user = await requireUser();
  const profile = await prisma.profile.findFirst({ where: { id: text(data, "profileId"), userId: user.id } });
  const label = text(data, "label"); const value = text(data, "value"); const type = text(data, "type") as ProfileFieldType;
  if (!profile || !label || !value || !Object.values(ProfileFieldType).includes(type)) throw new Error("FIELD_INVALID");
  const actionUrl = optional(data, "actionUrl"); if (actionUrl && !isSafeDestinationUrl(normalizeAndValidate(type, actionUrl).url)) throw new Error("INVALID_URL");
  await prisma.$transaction(async tx=>{await assertWithinLimitLocked(tx,user.id,"customFields");const count=await tx.profileField.count({where:{profileId:profile.id}});await tx.profileField.create({data:{profileId:profile.id,userId:user.id,label,value,type,actionUrl,iconKey:optional(data,"iconKey"),isVisible:data.get("isVisible")!=="off",sortOrder:count}});},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  revalidatePath("/dashboard/profile"); publicRevalidate(profile);
}

export async function updateProfileField(data: FormData) {
  const user = await requireUser(); const id = text(data, "id");
  const field = await prisma.profileField.findFirst({ where: { id, userId: user.id }, include: { profile: true } });
  const type = text(data, "type") as ProfileFieldType; const label = text(data, "label"); const value = text(data, "value");
  if (!field || !label || !value || !Object.values(ProfileFieldType).includes(type)) throw new Error("FIELD_INVALID");
  const actionUrl = optional(data, "actionUrl"); if (actionUrl && !isSafeDestinationUrl(normalizeAndValidate(type, actionUrl).url)) throw new Error("INVALID_URL");
  await prisma.profileField.update({ where: { id }, data: { label, value, type, actionUrl, iconKey: optional(data, "iconKey"), isVisible: data.get("isVisible") === "on" } });
  revalidatePath("/dashboard/profile"); publicRevalidate(field.profile);
}

export async function deleteProfileField(data: FormData) {
  const user = await requireUser(); const field = await prisma.profileField.findFirst({ where: { id: text(data, "id"), userId: user.id }, include: { profile: true } });
  if (!field) throw new Error("FIELD_NOT_FOUND");
  await prisma.profileField.delete({ where: { id: field.id } }); revalidatePath("/dashboard/profile"); publicRevalidate(field.profile);
}

export async function moveProfileField(data: FormData) {
  const user = await requireUser(); const field = await prisma.profileField.findFirst({ where: { id: text(data, "id"), userId: user.id }, include: { profile: true } });
  if (!field) throw new Error("FIELD_NOT_FOUND");
  const direction = text(data, "direction") === "up" ? -1 : 1;
  const neighbor = await prisma.profileField.findFirst({ where: { profileId: field.profileId, sortOrder: direction < 0 ? { lt: field.sortOrder } : { gt: field.sortOrder } }, orderBy: { sortOrder: direction < 0 ? "desc" : "asc" } });
  if (neighbor) await prisma.$transaction([prisma.profileField.update({ where: { id: field.id }, data: { sortOrder: neighbor.sortOrder } }), prisma.profileField.update({ where: { id: neighbor.id }, data: { sortOrder: field.sortOrder } })]);
  revalidatePath("/dashboard/profile"); publicRevalidate(field.profile);
}

export async function toggleUploadedFileVisibility(data: FormData) {
  const user = await requireUser(); const file = await prisma.uploadedFile.findFirst({ where: { id: text(data, "id"), ...(user.role === "ADMIN" ? {} : { uploaderUserId: user.id }) }, include: { profile: { select: { id: true, slug: true } } } }); if (!file) throw new Error("FILE_NOT_FOUND");
  await prisma.uploadedFile.update({ where: { id: file.id }, data: { isVisible: !file.isVisible } }); revalidatePath("/dashboard/uploads"); revalidatePath("/admin/uploads"); if (file.profile) publicRevalidate(file.profile);
}

export async function moveUploadedFile(data: FormData) {
  const user = await requireUser(); const file = await prisma.uploadedFile.findFirst({ where: { id: text(data, "id"), ...(user.role === "ADMIN" ? {} : { uploaderUserId: user.id }) }, include: { profile: { select: { id: true, slug: true } } } }); if (!file) throw new Error("FILE_NOT_FOUND"); const direction = text(data, "direction") === "up" ? -1 : 1;
  const neighbor = await prisma.uploadedFile.findFirst({ where: { profileId: file.profileId, sortOrder: direction < 0 ? { lt: file.sortOrder } : { gt: file.sortOrder } }, orderBy: { sortOrder: direction < 0 ? "desc" : "asc" } }); if (neighbor) await prisma.$transaction([prisma.uploadedFile.update({ where: { id: file.id }, data: { sortOrder: neighbor.sortOrder } }),prisma.uploadedFile.update({ where: { id: neighbor.id }, data: { sortOrder: file.sortOrder } })]); revalidatePath("/dashboard/uploads"); if (file.profile) publicRevalidate(file.profile);
}

export async function updateOwnedTag(data: FormData) {
  const user = await requireUser(); const id = text(data, "id");
  if (!await canManageTag(user, id)) throw new Error("TAG_NOT_FOUND");
  const tag = await prisma.tag.findUniqueOrThrow({ where: { id } });
  const requestedStatus = text(data, "status");
  const allowedStatuses = user.role === "ADMIN" ? Object.values(TagStatus) : [TagStatus.ACTIVE, TagStatus.PAUSED, TagStatus.LOST];
  const status = allowedStatuses.includes(requestedStatus as TagStatus) ? requestedStatus as TagStatus : tag.status;
  const activeDestinationId = optional(data, "activeDestinationId");
  let destination: { id: string; type: DestinationType } | null = null;
  if (activeDestinationId) {
    destination = await prisma.destination.findFirst({ where: { id: activeDestinationId, userId: tag.ownerId, isActive: true }, select: { id: true, type: true } });
    if (!destination) throw new Error("DESTINATION_NOT_FOUND");
  }
  await prisma.$transaction([
    prisma.tag.update({ where: { id }, data: { status, activeDestinationId, mode: destination?.type === DestinationType.PROFILE ? TagMode.PROFILE : TagMode.REDIRECT } }),
    prisma.tagEvent.create({ data: { tagId: id, type: status !== tag.status ? TagEventType.STATUS_CHANGE : TagEventType.UPDATED } }),
  ]);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/tags"); revalidatePath(`/dashboard/tags/${id}`); revalidatePath(`/${tag.shortCode}`); revalidatePath(`/t/${tag.token}`);
}

export async function updateTagDetails(data: FormData) {
  const user = await requireUser(); const id = text(data, "id"); const existing = await prisma.tag.findFirst({ where: { id, ownerId: user.id } });
  if (!existing) throw new Error("TAG_NOT_FOUND"); const name = text(data, "name"); const result = validateShortCode(text(data, "shortCode")); if (!name || !result.valid) throw new Error(result.valid ? "TAG_INVALID" : `SHORT_CODE_${result.reason.toUpperCase()}`);
  if (result.code !== existing.shortCode) { const { effective } = await getUserEntitlements(user.id); if (!effective.allowCustomSlug) throw new Error("FEATURE_CUSTOM_SLUG_REQUIRED"); }
  try { await prisma.$transaction(async tx => { const [collision,alias] = await Promise.all([tx.tag.findUnique({ where: { shortCode: result.code } }),tx.tagAlias.findUnique({ where: { code: result.code } })]); if ((collision && collision.id !== existing.id) || (alias && alias.tagId !== existing.id)) throw new Error("SHORT_CODE_IN_USE"); if (!alias) await tx.tagAlias.create({ data: { code: result.code, tagId: existing.id } }); await tx.tag.update({ where: { id }, data: { name, shortCode: result.code } }); await tx.tagEvent.create({ data: { tagId: id, type: TagEventType.UPDATED } }); }); }
  catch (error) { if (isUniqueConstraintError(error)) throw new Error("SHORT_CODE_IN_USE"); throw error; }
  revalidatePath("/dashboard/tags"); revalidatePath(`/dashboard/tags/${id}`); revalidatePath(`/${existing.shortCode}`); revalidatePath(`/${result.code}`);
}

export type CreateUserState = { ok: boolean; code?: string; temporaryPassword?: string };
export async function createAdminUser(_previous: CreateUserState, data: FormData): Promise<CreateUserState> {
  const admin = await requireAdmin(); const email = normalizeEmail(text(data, "email")); const password = text(data, "password");
  const role = text(data, "role") === "ADMIN" ? SystemRole.ADMIN : SystemRole.USER;
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, code: "INVALID_EMAIL" };
  if (password.length < 8) return { ok: false, code: "PASSWORD_TOO_SHORT" };
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return { ok: false, code: "EMAIL_IN_USE" };
  try {
    const rounds = Math.max(10, Number(process.env.BCRYPT_SALT_ROUNDS || 12)); const passwordHash = await bcrypt.hash(password, rounds);
    const user = await runAtomicUserCreation(prisma, tx => tx.user.create({ data: { email, name: optional(data, "name"), role, passwordHash } }), async (tx, created) => { await ensureUserDefaultsInTransaction(tx, created.id); });
    await audit(admin.id, "admin.user.create", user.id); revalidatePath("/admin/users"); return { ok: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) return { ok: false, code: "EMAIL_IN_USE" };
    console.error("admin.user.create failed", { operation: "admin.user.create", route: "/admin/users", adminId: admin.id, prismaCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined });
    return { ok: false, code: "CREATE_USER_FAILED" };
  }
}

export async function createAdminTag(data: FormData) {
  const admin = await requireAdmin(); const ownerId = text(data, "ownerId");
  if (!await prisma.user.findUnique({ where: { id: ownerId } })) throw new Error("OWNER_NOT_FOUND");
  const result = validateShortCode(text(data, "shortCode") || randomBytes(4).toString("hex")); const name = text(data, "name");
  if (!name || !result.valid) throw new Error(result.valid ? "TAG_INVALID" : `SHORT_CODE_${result.reason.toUpperCase()}`);
  const tag=await prisma.$transaction(async tx=>{await assertWithinLimitLocked(tx,ownerId,"tags");if(await tx.tag.findUnique({where:{shortCode:result.code}})||await tx.tagAlias.findUnique({where:{code:result.code}}))throw new Error("SHORT_CODE_IN_USE");return tx.tag.create({data:{token:randomBytes(18).toString("base64url"),shortCode:result.code,name,ownerId,mode:TagMode.REDIRECT,aliases:{create:{code:result.code}},events:{create:{type:TagEventType.CREATED}}}});},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  await audit(admin.id, "admin.tag.create", tag.id, { ownerId }); revalidatePath("/admin/tags");
}

export async function updateAdminTag(data: FormData) {
  const admin = await requireAdmin(); const id = text(data, "id"); const ownerId = text(data, "ownerId"); const status = text(data, "status") as TagStatus;
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing || !Object.values(TagStatus).includes(status) || !await prisma.user.findUnique({ where: { id: ownerId } })) throw new Error("TAG_INVALID");
  const ownerChanged = ownerId !== existing.ownerId;
  if (ownerChanged) await assertWithinLimit(ownerId, "tags");
  await prisma.$transaction([
    prisma.tag.update({ where: { id }, data: { ownerId, status, ...(ownerChanged ? { profileId: null, activeDestinationId: null, organizationId: null, mode: TagMode.REDIRECT } : {}), ...(data.get("programmed") === "on" && !existing.programmedAt ? { programmedAt: new Date() } : {}), ...(data.get("locked") === "on" && !existing.lockedAt ? { lockedAt: new Date() } : {}) } }),
    prisma.tagEvent.create({ data: { tagId: id, type: existing.status !== status ? TagEventType.STATUS_CHANGE : TagEventType.UPDATED } }),
  ]);
  await audit(admin.id, "admin.tag.update", id, { ownerId, status }); revalidatePath("/admin/tags"); revalidatePath("/dashboard/tags");
}

export async function updateAdminUser(data: FormData) {
  const admin = await requireAdmin(); const id = text(data, "id"); const email = text(data, "email").toLowerCase();
  const status = text(data, "status") as AccountStatus; const role = text(data, "role") as SystemRole;
  if (!Object.values(AccountStatus).includes(status) || !Object.values(SystemRole).includes(role)) throw new Error("USER_INVALID");
  try { await prisma.user.update({ where: { id }, data: { email, name: optional(data, "name"), status, role } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("EMAIL_IN_USE"); throw error; }
  await audit(admin.id, "admin.user.update", id); revalidatePath(`/admin/users/${id}`); revalidatePath("/admin/users");
}

export async function assignUserPlan(data: FormData) {
  const admin = await requireAdmin(); const userId = text(data, "userId"); const planId = text(data, "planId");
  if (!await prisma.plan.findFirst({ where: { id: planId, isActive: true } })) throw new Error("PLAN_INVALID");
  await prisma.$transaction([prisma.userPlan.updateMany({ where: { userId, status: SubscriptionStatus.ACTIVE }, data: { status: SubscriptionStatus.CANCELED, endsAt: new Date() } }), prisma.userPlan.create({ data: { userId, planId } })]);
  await audit(admin.id, "admin.user.plan", userId, { planId }); revalidatePath(`/admin/users/${userId}`);
}

export type PlanActionState={ok:boolean;code?:string;id?:string};
export async function saveAdminPlan(_previous:PlanActionState,data:FormData):Promise<PlanActionState>{
  const admin=await requireAdmin();const id=optional(data,"id");const slug=text(data,"slug").toLowerCase();const nameEn=text(data,"nameEn");const nameAr=text(data,"nameAr");
  if(!/^[a-z0-9-]{2,48}$/.test(slug)||!nameEn||!nameAr)return{ok:false,code:"PLAN_INVALID_TEXT"};
  const numericKeys=["maxProfiles","maxVirtualCards","maxLinks","maxCustomFields","maxCards","maxFiles","maxStorageBytes","sortOrder"] as const;const values:Record<string,number|bigint>={};
  for(const key of numericKeys){const raw=text(data,key);if(!/^\d+$/.test(raw))return{ok:false,code:"PLAN_INVALID_LIMIT"};values[key]=key==="maxStorageBytes"?BigInt(raw):Number(raw);}
  let availableProfileTypes:Prisma.InputJsonValue;let availableThemes:Prisma.InputJsonValue;try{availableProfileTypes=JSON.parse(text(data,"availableProfileTypes"));availableThemes=JSON.parse(text(data,"availableThemes"));if(!Array.isArray(availableProfileTypes)||!Array.isArray(availableThemes))throw new Error();}catch{return{ok:false,code:"PLAN_INVALID_TEXT"};}
  const customSlugAllowed=data.get("customSlugAllowed")==="on";const analyticsAllowed=data.get("analyticsAllowed")==="on";const maxCards=Number(values.maxCards);const maxFiles=Number(values.maxFiles);
  const payload={name:nameEn,nameEn,nameAr,slug,description:optional(data,"descriptionEn"),descriptionEn:optional(data,"descriptionEn"),descriptionAr:optional(data,"descriptionAr"),isActive:data.get("isActive")==="on",sortOrder:Number(values.sortOrder),maxProfiles:Number(values.maxProfiles),maxVirtualCards:Number(values.maxVirtualCards),maxLinks:Number(values.maxLinks),maxCustomFields:Number(values.maxCustomFields),maxCards,maxTags:maxCards,maxFiles,maxUploads:maxFiles,maxStorageBytes:BigInt(values.maxStorageBytes),customSlugAllowed,allowCustomSlug:customSlugAllowed,allowThemes:data.get("allowThemes")==="on",allowCustomTheme:data.get("allowCustomTheme")==="on",analyticsAllowed,allowAnalytics:analyticsAllowed,allowFileUploads:data.get("allowFileUploads")==="on",allowCustomIcons:data.get("allowCustomIcons")==="on",allowBusinessCards:data.get("allowBusinessCards")==="on",allowWalletPasses:data.get("allowWalletPasses")==="on",allowCustomLinks:data.get("allowCustomLinks")==="on",allowInstallableProfiles:data.get("allowInstallableProfiles")==="on",availableProfileTypes,availableThemes};
  try{const plan=id?await prisma.plan.update({where:{id},data:payload}):await prisma.plan.create({data:payload});await audit(admin.id,id?"admin.plan.update":"admin.plan.create",plan.id);revalidatePath("/admin/plans");revalidatePath(`/admin/plans/${plan.id}`);return{ok:true,id:plan.id};}catch(error){if(isUniqueConstraintError(error))return{ok:false,code:"PLAN_SLUG_IN_USE"};console.error("plan save failed",{operation:id?"plan.update":"plan.create",adminId:admin.id});return{ok:false,code:"PLAN_SAVE_FAILED"};}
}

export async function duplicateAdminPlan(data:FormData){const admin=await requireAdmin();const source=await prisma.plan.findUnique({where:{id:text(data,"id")}});if(!source)throw new Error("PLAN_NOT_FOUND");const {id,createdAt,updatedAt,availableProfileTypes,availableThemes,...copy}=source;let suffix=1;let slug=`${source.slug}-copy`;while(await prisma.plan.findUnique({where:{slug}}))slug=`${source.slug}-copy-${++suffix}`;const plan=await prisma.plan.create({data:{...copy,availableProfileTypes:availableProfileTypes===null?Prisma.JsonNull:availableProfileTypes as Prisma.InputJsonValue,availableThemes:availableThemes===null?Prisma.JsonNull:availableThemes as Prisma.InputJsonValue,name:`${source.name} Copy`,nameEn:`${source.nameEn||source.name} Copy`,nameAr:`نسخة ${source.nameAr||source.name}`,slug,isActive:false,sortOrder:source.sortOrder+1}});await audit(admin.id,"admin.plan.duplicate",plan.id,{sourceId:id});revalidatePath("/admin/plans");}

export async function deleteAdminPlan(data:FormData){const admin=await requireAdmin();const id=text(data,"id");const assigned=await prisma.userPlan.count({where:{planId:id}});if(assigned>0)throw new Error("PLAN_ASSIGNED_USERS");await prisma.plan.delete({where:{id}});await audit(admin.id,"admin.plan.delete",id);revalidatePath("/admin/plans");}

export async function updateUserLimits(data: FormData) {
  const admin = await requireAdmin(); const userId = text(data, "userId");
  await prisma.userLimitOverride.upsert({ where: { userId }, create: { userId }, update: {}, });
  await prisma.userLimitOverride.update({ where: { userId }, data: {
    maxProfiles: nullableNumber(data, "maxProfiles"), maxVirtualCards: nullableNumber(data, "maxVirtualCards"), maxLinks: nullableNumber(data, "maxLinks"), maxCustomFields: nullableNumber(data, "maxCustomFields"), maxCards: nullableNumber(data, "maxCards"), maxTags: nullableNumber(data, "maxCards"), maxFiles: nullableNumber(data, "maxFiles"), maxUploads: nullableNumber(data, "maxFiles"),
    maxStorageBytes: text(data, "maxStorageBytes") ? BigInt(text(data, "maxStorageBytes")) : null,
    customSlugAllowed: optionalBoolean(data, "customSlugAllowed"), allowCustomSlug: optionalBoolean(data, "customSlugAllowed"), allowThemes: optionalBoolean(data, "allowThemes"), allowCustomTheme: optionalBoolean(data, "allowCustomTheme"), analyticsAllowed: optionalBoolean(data, "analyticsAllowed"), allowAnalytics: optionalBoolean(data, "analyticsAllowed"), allowFileUploads: optionalBoolean(data, "allowFileUploads"), allowCustomIcons: optionalBoolean(data, "allowCustomIcons"), allowBusinessCards: optionalBoolean(data, "allowBusinessCards"), allowWalletPasses: optionalBoolean(data, "allowWalletPasses"), allowCustomLinks: optionalBoolean(data, "allowCustomLinks"), allowInstallableProfiles: optionalBoolean(data, "allowInstallableProfiles"),
  }});
  await audit(admin.id, "admin.user.limits", userId); revalidatePath(`/admin/users/${userId}`);
}

function optionalBoolean(data: FormData, key: string) { const value = text(data, key); return value === "" ? null : value === "true"; }

export async function resetUserPassword(data: FormData) {
  const admin = await requireAdmin(); const userId = text(data, "userId"); const temporaryPassword = text(data, "password") || randomBytes(9).toString("base64url");
  const rounds = Math.max(10, Number(process.env.BCRYPT_SALT_ROUNDS || 12)); await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(temporaryPassword, rounds) } });
  await audit(admin.id, "admin.user.password_reset", userId); revalidatePath(`/admin/users/${userId}`);
}

export async function repairUserAccount(data: FormData) {
  const admin = await requireAdmin(); const userId = text(data, "userId"); await ensureUserDefaults(userId); await audit(admin.id, "admin.user.repair", userId); revalidatePath(`/admin/users/${userId}`);
}

export async function deleteAdminUser(data: FormData) {
  await requireAdmin();
  void data;
  throw new Error("USE_SAFE_USER_DELETE_FLOW");
}

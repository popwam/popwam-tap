"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { DestinationType, prisma, SystemRole, TagEventType, TagMode, TagStatus } from "@popwam/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { canManageDestination, canManageTag } from "@/lib/permissions";
import { isSafeDestinationUrl, normalizeAndValidate } from "@/lib/url";
import { ensureUserDefaults } from "@/lib/ensure-user";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;

export async function updateProfile(data: FormData) {
  const user = await requireUser();
  const profileId = text(data, "profileId");
  const profile = profileId
    ? await prisma.profile.findFirst({ where: { id: profileId, ...(user.role === "ADMIN" ? {} : { userId: user.id }) } })
    : await prisma.profile.findFirst({ where: { userId: user.id, organizationId: null } });
  const displayName = text(data, "displayName");
  if (!profile || !displayName) throw new Error("Profile not found or display name missing.");
  const slug = optional(data, "slug")?.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || null;
  const urlFields = ["avatarUrl", "coverUrl", "website", "facebook", "linkedin", "github", "tiktok", "vcfUrl"] as const;
  for (const field of urlFields) {
    const value = optional(data, field);
    if (value && !isSafeDestinationUrl(value)) throw new Error(`Invalid URL in ${field}.`);
  }
  await prisma.profile.update({ where: { id: profile.id }, data: {
    displayName, slug, title: optional(data, "title"), bio: optional(data, "bio"),
    avatarUrl: optional(data, "avatarUrl"), avatarStorageKey: optional(data, "avatarStorageKey"),
    coverUrl: optional(data, "coverUrl"), coverStorageKey: optional(data, "coverStorageKey"),
    phone: optional(data, "phone"), whatsappBusiness: optional(data, "whatsappBusiness"),
    whatsappPrivate: optional(data, "whatsappPrivate"), email: optional(data, "email"),
    website: optional(data, "website"), facebook: optional(data, "facebook"), linkedin: optional(data, "linkedin"),
    github: optional(data, "github"), tiktok: optional(data, "tiktok"), vcfUrl: optional(data, "vcfUrl"),
    locationText: optional(data, "locationText"), isPublic: data.get("isPublic") === "on",
  }});
  revalidatePath("/dashboard/profile");
  revalidatePath(`/p/${slug || ""}`);
}

function destinationInput(data: FormData) {
  const title = text(data, "title");
  const type = text(data, "type") as DestinationType;
  if (!title || !Object.values(DestinationType).includes(type)) throw new Error("Destination title and type are required.");
  const normalized = normalizeAndValidate(type, text(data, "url"));
  if (!normalized.valid) throw new Error("Destination URL is not safe or supported.");
  return { title, type, url: normalized.url, icon: optional(data, "icon"), isOfflineCapable: data.get("isOfflineCapable") === "on" };
}

export async function createDestination(data: FormData) {
  const user = await requireUser();
  const profile = await prisma.profile.findFirst({ where: { userId: user.id, organizationId: null }, select: { id: true } });
  await prisma.destination.create({ data: { ...destinationInput(data), userId: user.id, profileId: profile?.id } });
  revalidatePath("/dashboard/cards"); revalidatePath("/dashboard/tags");
}

export async function updateDestination(data: FormData) {
  const user = await requireUser();
  const id = text(data, "id");
  if (!await canManageDestination(user, id)) throw new Error("Destination not found.");
  await prisma.destination.update({ where: { id }, data: destinationInput(data) });
  revalidatePath("/dashboard/cards"); revalidatePath("/dashboard/tags");
}

export async function deleteDestination(data: FormData) {
  const user = await requireUser();
  const id = text(data, "id");
  if (!await canManageDestination(user, id)) throw new Error("Destination not found.");
  await prisma.destination.delete({ where: { id } });
  revalidatePath("/dashboard/cards"); revalidatePath("/dashboard/tags");
}

export async function updateOwnedTag(data: FormData) {
  const user = await requireUser();
  const id = text(data, "id");
  const existing = await canManageTag(user, id);
  if (!existing) throw new Error("Tag not found.");
  const tag = await prisma.tag.findUniqueOrThrow({ where: { id } });
  const requestedMode = text(data, "mode");
  const requestedStatus = text(data, "status");
  const mode = Object.values(TagMode).includes(requestedMode as TagMode) ? requestedMode as TagMode : tag.mode;
  const allowedStatuses = user.role === "ADMIN" ? Object.values(TagStatus) : [TagStatus.ACTIVE, TagStatus.PAUSED, TagStatus.LOST];
  const status = allowedStatuses.includes(requestedStatus as TagStatus) ? requestedStatus as TagStatus : tag.status;
  let activeDestinationId = optional(data, "activeDestinationId");
  if (activeDestinationId) {
    const destination = await prisma.destination.findFirst({ where: { id: activeDestinationId, ...(user.role === "ADMIN" ? {} : { userId: user.id }) } });
    if (!destination) throw new Error("Destination not found.");
  }
  await prisma.$transaction([
    prisma.tag.update({ where: { id }, data: { mode, status, activeDestinationId } }),
    prisma.tagEvent.create({ data: { tagId: id, type: status !== tag.status ? TagEventType.STATUS_CHANGE : TagEventType.UPDATED, metadata: { fromMode: tag.mode, toMode: mode, fromStatus: tag.status, toStatus: status } } }),
  ]);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/tags"); revalidatePath(`/dashboard/tags/${id}`);
}

export async function createAdminUser(data: FormData) {
  await requireAdmin();
  const email = text(data, "email").toLowerCase();
  const password = text(data, "password");
  const role = text(data, "role") === "ADMIN" ? SystemRole.ADMIN : SystemRole.USER;
  if (!email || password.length < 8) throw new Error("Valid email and an 8+ character password are required.");
  const rounds = Math.max(10, Number(process.env.BCRYPT_SALT_ROUNDS || 12));
  const user = await prisma.user.create({ data: { email, name: optional(data, "name"), role, passwordHash: await bcrypt.hash(password, rounds) } });
  await ensureUserDefaults(user.id);
  revalidatePath("/admin/users");
}

export async function createAdminTag(data: FormData) {
  await requireAdmin();
  const ownerId = text(data, "ownerId");
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw new Error("Owner not found.");
  const rawToken = text(data, "token") || randomBytes(12).toString("base64url");
  const token = rawToken.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const name = text(data, "name");
  if (!name || token.length < 4) throw new Error("Name and a token of at least 4 characters are required.");
  const profileId = optional(data, "profileId");
  if (profileId && !await prisma.profile.findFirst({ where: { id: profileId, userId: ownerId } })) throw new Error("Profile does not belong to owner.");
  await prisma.tag.create({ data: { token, name, ownerId, profileId, events: { create: { type: TagEventType.CREATED } } } });
  revalidatePath("/admin/tags");
}

export async function updateAdminTag(data: FormData) {
  await requireAdmin();
  const id = text(data, "id");
  const ownerId = text(data, "ownerId");
  const status = text(data, "status") as TagStatus;
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing || !Object.values(TagStatus).includes(status) || !await prisma.user.findUnique({ where: { id: ownerId } })) throw new Error("Invalid tag update.");
  const ownerChanged = ownerId !== existing.ownerId;
  await prisma.$transaction([
    prisma.tag.update({ where: { id }, data: {
      ownerId, status,
      ...(ownerChanged ? { profileId: null, activeDestinationId: null, organizationId: null } : {}),
      ...(data.get("programmed") === "on" && !existing.programmedAt ? { programmedAt: new Date() } : {}),
      ...(data.get("locked") === "on" && !existing.lockedAt ? { lockedAt: new Date() } : {}),
    }}),
    prisma.tagEvent.create({ data: { tagId: id, type: existing.status !== status ? TagEventType.STATUS_CHANGE : TagEventType.UPDATED, metadata: { admin: true, previousOwnerId: existing.ownerId, ownerId } } }),
  ]);
  revalidatePath("/admin/tags"); revalidatePath("/dashboard/tags");
}

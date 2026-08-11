import "server-only";
import { createHash, createHmac } from "node:crypto";
import { Prisma, prisma } from "@popwam/db";
import { getPublicAppUrl } from "@popwam/shared";
import { createOpaqueToken, activationScratchSecretMatches, hashActivationToken } from "./card-tokens";
import { managedProfileWhere } from "./profile-publishing";
import { getPublicProfileProjectionById, moduleUsesCanonicalPublicState } from "./profile-projection";
import { isSafeDestinationUrl } from "./url";
import { activationClaimGate, activationCooldownMs, activationIdentifierFrom, activationRateLimited, SCRATCH_ATTEMPT_LIMITS, shareKeyAfterCompareAndSet, shareTargetKind } from "./share-center-policy";

const productSelect = {
  id: true,
  displayLabel: true,
  serialNumber: true,
  publicSlug: true,
  cardType: true,
  assignmentStatus: true,
  cardStatus: true,
  activationSecretState: true,
  activatedAt: true,
  openCount: true,
  lastOpenedAt: true,
  profile: { select: { id: true, displayLabel: true, displayName: true, profileKind: true, lifecycle: true } },
  activeDestination: { select: { id: true, title: true, titleAr: true, titleEn: true, type: true } },
} satisfies Prisma.CardSelect;

type ProductData = Prisma.CardGetPayload<{ select: typeof productSelect }>;

export type ShareTargetDto = {
  id: string;
  type: "PROFILE" | "CONTACT" | "LINK" | "SOCIAL";
  label: string;
  canonicalUrl: string;
  hceCompatible: boolean;
  destinationType?: string;
};

const maskSerial = (value: string) => `${"•".repeat(Math.max(6, value.length - 3))}${value.slice(-3)}`;
const publicBase = () => getPublicAppUrl().replace(/\/$/, "");
const localized = (locale: "ar" | "en", ar: string | null | undefined, en: string | null | undefined, fallback: string) =>
  locale === "ar" ? ar || en || fallback : en || ar || fallback;

export function productProjection(card: ProductData) {
  return {
    id: card.id,
    label: card.displayLabel || `POP ${card.serialNumber.slice(-3)}`,
    maskedSerial: maskSerial(card.serialNumber),
    productType: card.cardType,
    status: card.cardStatus,
    assignmentStatus: card.assignmentStatus,
    activationState: card.activationSecretState,
    permanentUrl: `${publicBase()}/${encodeURIComponent(card.publicSlug)}`,
    profile: card.profile ? {
      id: card.profile.id,
      label: card.profile.displayLabel || card.profile.displayName,
      profileKind: card.profile.profileKind || "PERSONAL",
      lifecycle: card.profile.lifecycle,
    } : null,
    shareTarget: card.activeDestination ? {
      id: card.activeDestination.id,
      label: card.activeDestination.title,
      type: card.activeDestination.type,
    } : null,
    capabilities: {
      targetChange: ["ACTIVE", "PAUSED"].includes(card.cardStatus),
      pause: card.cardStatus === "ACTIVE",
      resume: card.cardStatus === "PAUSED",
      lostAndTransferInProductDetails: true,
    },
    openCount: card.openCount,
    lastOpenedAt: card.lastOpenedAt,
  };
}

async function ensureShareKeys(profileId: string, destinationIds: string[]) {
  const rows = await prisma.destination.findMany({
    where: { id: { in: destinationIds }, profileId },
    select: { id: true, publicShareKey: true },
  });
  for (const row of rows) {
    if (row.publicShareKey) continue;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const publicShareKey = createOpaqueToken(12);
        const updated = await prisma.destination.updateMany({ where: { id: row.id, profileId, publicShareKey: null }, data: { publicShareKey } });
        const persisted = updated.count === 1
          ? null
          : (await prisma.destination.findFirst({ where: { id: row.id, profileId }, select: { publicShareKey: true } }))?.publicShareKey || null;
        row.publicShareKey = shareKeyAfterCompareAndSet(publicShareKey, updated.count, persisted);
        if (row.publicShareKey) break;
      } catch (error) {
        if (!(typeof error === "object" && error && "code" in error && error.code === "P2002") || attempt === 2) throw error;
      }
    }
  }
  return new Map(rows.flatMap((row) => row.publicShareKey ? [[row.id, row.publicShareKey] as const] : []));
}

export async function getShareTargets(userId: string, profileId: string, locale: "ar" | "en") {
  const managed = await prisma.profile.findFirst({
    where: managedProfileWhere(userId, profileId),
    select: { id: true, lifecycle: true, displayLabel: true, displayName: true },
  });
  if (!managed) throw new Error("PROFILE_NOT_FOUND");
  const projection = await getPublicProfileProjectionById(profileId);
  if (!projection?.publiclyReadable) {
    return {
      profile: { id: managed.id, label: managed.displayLabel || managed.displayName, lifecycle: managed.lifecycle },
      shareable: false,
      reason: managed.lifecycle === "PAUSED" ? "PROFILE_PAUSED" : "PROFILE_NOT_PUBLISHED",
      targets: [] as ShareTargetDto[],
    };
  }

  const profile = projection.profile;
  const slug = profile.slug;
  if (!slug) {
    return {
      profile: { id: managed.id, label: managed.displayLabel || managed.displayName, lifecycle: managed.lifecycle },
      shareable: false,
      reason: "PROFILE_NOT_PUBLISHED",
      targets: [] as ShareTargetDto[],
    };
  }
  const targets: ShareTargetDto[] = [{
    id: "profile",
    type: "PROFILE",
    label: localized(locale, profile.displayNameAr, profile.displayNameEn, profile.displayName),
    canonicalUrl: `${publicBase()}/p/${encodeURIComponent(slug)}`,
    hceCompatible: true,
  }];

  const contactPublic = moduleUsesCanonicalPublicState(profile, "CONTACT", true);
  const hasContact = Boolean(profile.phone || profile.alternatePhone || profile.email || profile.website || profile.whatsappBusiness || profile.whatsappPrivate);
  if (contactPublic && profile.showSaveContact && hasContact) {
    targets.push({
      id: "contact",
      type: "CONTACT",
      label: locale === "ar" ? "حفظ جهة الاتصال" : "Save contact",
      canonicalUrl: `${publicBase()}/p/${encodeURIComponent(slug)}/contact.vcf`,
      hceCompatible: true,
    });
  }

  const publishedDestinationIds = profile.destinations
    .filter(item => item.type !== "PROFILE" && item.type !== "VCF" && isSafeDestinationUrl(item.url))
    .map(item => item.id);
  const shareKeys = await ensureShareKeys(profileId, publishedDestinationIds);
  for (const destination of profile.destinations) {
    const publicShareKey = shareKeys.get(destination.id);
    if (!publicShareKey || !isSafeDestinationUrl(destination.url) || destination.type === "PROFILE" || destination.type === "VCF") continue;
    targets.push({
      id: `destination:${destination.id}`,
      type: shareTargetKind(destination.type),
      label: localized(locale, destination.titleAr, destination.titleEn, destination.title),
      canonicalUrl: `${publicBase()}/s/${encodeURIComponent(publicShareKey)}`,
      hceCompatible: true,
      destinationType: destination.type,
    });
  }

  return {
    profile: { id: managed.id, label: managed.displayLabel || managed.displayName, lifecycle: managed.lifecycle },
    shareable: true,
    reason: null,
    targets,
  };
}

export async function getShareProducts(userId: string) {
  const cards = await prisma.card.findMany({ where: { ownerId: userId }, select: productSelect, orderBy: { createdAt: "desc" } });
  return cards.map(productProjection);
}

function activationHosts() {
  const hosts = new Set(["go.popwam.com", "pop.popwam.com"]);
  for (const candidate of [process.env.PUBLIC_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try { if (candidate) hosts.add(new URL(candidate).host.toLowerCase()); } catch { /* Ignore invalid optional configuration. */ }
  }
  return [...hosts];
}

function requestFingerprints(request: Request) {
  const pepper = process.env.ACTIVATION_RATE_LIMIT_PEPPER || process.env.ACTIVATION_TOKEN_PEPPER || process.env.NEXTAUTH_SECRET || "development-rate-limit-pepper";
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",").map(item => item.trim()).filter(Boolean);
  const network = request.headers.get("x-real-ip")?.trim() || forwarded.at(-1) || "unknown";
  const context = `${request.headers.get("x-pop-device-id") || "unknown"}\0${(request.headers.get("user-agent") || "unknown").slice(0, 160)}`;
  const digest = (scope: string, value: string) => createHmac("sha256", pepper).update(`${scope}\0${value}`).digest("base64url");
  return { contextFingerprintHash: digest("context", context), networkFingerprintHash: digest("network", network) };
}

export async function inspectScratchActivation(userId: string, rawIdentifier: string) {
  const publicSlug = activationIdentifierFrom(rawIdentifier, activationHosts());
  if (!publicSlug) return { ok: false as const, error: "ACTIVATION_UNAVAILABLE" };
  const card = await prisma.card.findUnique({
    where: { publicSlug },
    select: { id: true, displayLabel: true, serialNumber: true, cardType: true, cardStatus: true, assignmentStatus: true, ownerId: true, activationSecretState: true, activationLockoutUntil: true },
  });
  if (!card) return { ok: false as const, error: "ACTIVATION_UNAVAILABLE" };
  const safeProduct = { label: card.displayLabel || `POP ${card.serialNumber.slice(-3)}`, maskedSerial: maskSerial(card.serialNumber), productType: card.cardType };
  if (card.ownerId === userId) return { ok: true as const, eligible: false, nextAction: "ALREADY_OWNED", identifier: publicSlug, product: safeProduct };
  if (card.ownerId || card.assignmentStatus !== "UNASSIGNED" || !["CREATED", "PROGRAMMED"].includes(card.cardStatus)) {
    return { ok: false as const, error: "ACTIVATION_UNAVAILABLE" };
  }
  if (card.activationSecretState === "LEGACY") {
    return { ok: true as const, eligible: false, nextAction: "LEGACY_FLOW", identifier: publicSlug, legacyUrl: `/activate/card/${encodeURIComponent(publicSlug)}`, product: safeProduct };
  }
  if (!["SCRATCH_READY", "LOCKED"].includes(card.activationSecretState)) return { ok: false as const, error: "ACTIVATION_UNAVAILABLE" };
  if (card.activationLockoutUntil && card.activationLockoutUntil > new Date()) {
    return { ok: true as const, eligible: false, nextAction: "COOLDOWN", identifier: publicSlug, retryAt: card.activationLockoutUntil.toISOString(), product: safeProduct };
  }
  return { ok: true as const, eligible: true, nextAction: "ENTER_SCRATCH", identifier: publicSlug, product: safeProduct };
}

async function rateLimited(cardId: string, userId: string, fingerprints: ReturnType<typeof requestFingerprints>, now: Date) {
  const since = new Date(now.getTime() - SCRATCH_ATTEMPT_LIMITS.windowMs);
  const [product, account, context, network] = await Promise.all([
    prisma.activationAttempt.count({ where: { cardId, createdAt: { gte: since } } }),
    prisma.activationAttempt.count({ where: { actorId: userId, createdAt: { gte: since } } }),
    prisma.activationAttempt.count({ where: { contextFingerprintHash: fingerprints.contextFingerprintHash, createdAt: { gte: since } } }),
    prisma.activationAttempt.count({ where: { networkFingerprintHash: fingerprints.networkFingerprintHash, createdAt: { gte: since } } }),
  ]);
  return activationRateLimited({ product, account, context, network });
}

async function targetAssignment(userId: string, profileId: string, targetId: string, locale: "ar" | "en") {
  const projection = await getShareTargets(userId, profileId, locale);
  const target = projection.targets.find(item => item.id === targetId);
  if (!projection.shareable || !target) throw new Error("TARGET_UNAVAILABLE");
  let destinationId: string | null = null;
  if (target.id === "profile") {
    destinationId = (await prisma.destination.findFirst({ where: { profileId, type: "PROFILE", isActive: true }, select: { id: true } }))?.id || null;
  } else if (target.id === "contact") {
    destinationId = (await prisma.destination.findFirst({ where: { profileId, type: "VCF", isActive: true }, select: { id: true } }))?.id || null;
  } else {
    destinationId = target.id.startsWith("destination:") ? target.id.slice("destination:".length) : null;
  }
  if (!destinationId) throw new Error("TARGET_UNAVAILABLE");
  return { target, destinationId };
}

async function cardLimit(tx: Prisma.TransactionClient, userId: string, now: Date) {
  const [override, subscription, freePlan, ownedCards] = await Promise.all([
    tx.userLimitOverride.findUnique({ where: { userId }, select: { maxCards: true } }),
    tx.userPlan.findFirst({
      where: { userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      orderBy: { startsAt: "desc" },
      select: { plan: { select: { maxCards: true } } },
    }),
    tx.plan.findUnique({ where: { slug: "free" }, select: { maxCards: true } }),
    tx.card.count({ where: { ownerId: userId } }),
  ]);
  return { maxCards: override?.maxCards ?? subscription?.plan.maxCards ?? freePlan?.maxCards, ownedCards };
}

export async function claimScratchActivation(request: Request, userId: string, input: {
  identifier: string;
  scratchSecret: string;
  profileId: string;
  targetId: string;
  locale: "ar" | "en";
}) {
  const publicSlug = activationIdentifierFrom(input.identifier, activationHosts());
  if (!publicSlug || !/^\d{6}$/.test(input.scratchSecret.replace(/\s+/g, ""))) return { ok: false as const, error: "ACTIVATION_UNAVAILABLE", status: 400 };
  const initial = await prisma.card.findUnique({
    where: { publicSlug },
    select: { id: true, ownerId: true, assignmentStatus: true, cardStatus: true, activationSecretHash: true, activationSecretState: true, activationLockoutUntil: true },
  });
  if (!initial) return { ok: false as const, error: "ACTIVATION_UNAVAILABLE", status: 400 };
  const now = new Date();
  const gate = activationClaimGate({
    ownerId: initial.ownerId,
    userId,
    assignmentStatus: initial.assignmentStatus,
    cardStatus: initial.cardStatus,
    secretState: initial.activationSecretState,
    lockoutUntil: initial.activationLockoutUntil,
    now,
  });
  if (gate === "SAME_OWNER") {
    const card = await prisma.card.findUnique({ where: { id: initial.id }, select: productSelect });
    return { ok: true as const, idempotent: true, product: card ? productProjection(card) : null, status: 200 };
  }
  if (gate === "UNAVAILABLE") return { ok: false as const, error: "ACTIVATION_UNAVAILABLE", status: 400 };
  if (gate === "COOLDOWN") return { ok: false as const, error: "ACTIVATION_COOLDOWN", status: 429 };
  const fingerprints = requestFingerprints(request);
  if (await rateLimited(initial.id, userId, fingerprints, now)) {
    return { ok: false as const, error: "ACTIVATION_COOLDOWN", status: 429 };
  }
  const secretValid = Boolean(initial.activationSecretHash && activationScratchSecretMatches(input.scratchSecret, initial.activationSecretHash));
  if (!secretValid) {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Card" WHERE "id" = ${initial.id} FOR UPDATE`);
      const current = await tx.card.findUnique({ where: { id: initial.id }, select: { activationAttemptWindowAt: true, activationFailedAttempts: true, ownerId: true } });
      if (!current || current.ownerId) return;
      const withinWindow = current.activationAttemptWindowAt && now.getTime() - current.activationAttemptWindowAt.getTime() < SCRATCH_ATTEMPT_LIMITS.windowMs;
      const failed = (withinWindow ? current.activationFailedAttempts : 0) + 1;
      const cooldown = activationCooldownMs(failed);
      await tx.activationAttempt.create({ data: { cardId: initial.id, actorId: userId, ...fingerprints, method: "SCRATCH", failureClass: "SECRET_REJECTED", success: false } });
      await tx.card.update({
        where: { id: initial.id },
        data: {
          activationAttemptWindowAt: withinWindow ? current.activationAttemptWindowAt : now,
          activationFailedAttempts: failed,
          activationSecretState: cooldown ? "LOCKED" : "SCRATCH_READY",
          activationLockoutUntil: cooldown ? new Date(now.getTime() + cooldown) : null,
        },
      });
      await tx.auditLog.create({ data: { actorId: userId, operation: cooldown ? "activation.locked" : "activation.failed", targetId: initial.id, metadata: { classification: "SECRET_REJECTED", method: "SCRATCH" } } });
    });
    return { ok: false as const, error: "ACTIVATION_UNAVAILABLE", status: 400 };
  }

  let assignment: Awaited<ReturnType<typeof targetAssignment>>;
  try {
    assignment = await targetAssignment(userId, input.profileId, input.targetId, input.locale);
  } catch {
    return { ok: false as const, error: "ACTIVATION_UNAVAILABLE", status: 400 };
  }

  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Card" WHERE "id" = ${initial.id} FOR UPDATE`);
      const current = await tx.card.findUnique({ where: { id: initial.id }, select: { ownerId: true, assignmentStatus: true, activationSecretHash: true, activationSecretState: true } });
      if (current?.ownerId === userId) return "IDEMPOTENT" as const;
      if (!current || current.ownerId || current.assignmentStatus !== "UNASSIGNED" || current.activationSecretHash !== initial.activationSecretHash || !["SCRATCH_READY", "LOCKED"].includes(current.activationSecretState)) return "UNAVAILABLE" as const;
      const profile = await tx.profile.findFirst({
        where: {
          AND: [
            managedProfileWhere(userId, input.profileId),
            { OR: [
              { lifecycle: "PUBLISHED", access: { not: "PRIVATE" }, publication: { isNot: null } },
              { profileKind: null, isPublic: true, lifecycle: { notIn: ["PAUSED", "ARCHIVED"] } },
            ] },
          ],
        },
        select: { id: true, profileKind: true },
      });
      const destination = await tx.destination.findFirst({ where: { id: assignment.destinationId, profileId: input.profileId, isActive: true }, select: { id: true } });
      if (!profile || !destination) return "UNAVAILABLE" as const;
      if (profile.profileKind) {
        const publication = await tx.profilePublication.findUnique({
          where: { profileId: input.profileId },
          select: { publishedRevision: { select: {
            modules: { select: { key: true, enabled: true, visibility: true } },
            destinations: { select: { sourceId: true } },
          } } },
        });
        const current = publication?.publishedRevision;
        const targetCurrent = assignment.target.id === "profile"
          || (assignment.target.id === "contact" && current?.modules.some(item => item.key === "CONTACT" && item.enabled && item.visibility === "PUBLIC"))
          || (assignment.target.id.startsWith("destination:") && current?.destinations.some(item => item.sourceId === assignment.destinationId));
        if (!targetCurrent) return "UNAVAILABLE" as const;
      }
      const limits = await cardLimit(tx, userId, now);
      if (limits.maxCards == null || limits.ownedCards + 1 > limits.maxCards) return "LIMIT" as const;
      const updated = await tx.card.updateMany({
        where: { id: initial.id, ownerId: null, assignmentStatus: "UNASSIGNED", activationSecretHash: initial.activationSecretHash },
        data: {
          ownerId: userId,
          profileId: input.profileId,
          activeDestinationId: assignment.destinationId,
          assignmentStatus: "SELF_CLAIMED",
          cardStatus: "ACTIVE",
          inventoryStatus: "ASSIGNED",
          assignedAt: now,
          activatedAt: now,
          activationSecretHash: null,
          activationSecretState: "CONSUMED",
          activationSecretConsumedAt: now,
          activationFailedAttempts: 0,
          activationAttemptWindowAt: null,
          activationLockoutUntil: null,
          activationTokenConsumedAt: now,
          activationTokenHash: hashActivationToken(createOpaqueToken()),
        },
      });
      if (updated.count !== 1) return "UNAVAILABLE" as const;
      const producedTag = await tx.producedTag.findUnique({ where: { cardId: initial.id }, select: { id: true, batch: { select: { batchCode: true } } } });
      if (producedTag) {
        await tx.producedTag.update({ where: { id: producedTag.id }, data: { status: "ACTIVATED", assignedUserId: userId, activatedAt: now, scratchSecretExportCiphertext: null } });
        await tx.inventoryBatch.updateMany({ where: { batchCode: producedTag.batch.batchCode, availableQuantity: { gt: 0 } }, data: { availableQuantity: { decrement: 1 }, assignedQuantity: { increment: 1 } } });
      }
      await tx.activationAttempt.create({ data: { cardId: initial.id, actorId: userId, ...fingerprints, method: "SCRATCH", success: true } });
      await tx.auditLog.create({ data: { actorId: userId, operation: "activation.completed", targetId: initial.id, metadata: { method: "SCRATCH", targetType: assignment.target.type } } });
      return "SUCCESS" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result === "LIMIT") return { ok: false as const, error: "CARD_LIMIT_REACHED", status: 403 };
    if (result === "UNAVAILABLE") return { ok: false as const, error: "ACTIVATION_UNAVAILABLE", status: 409 };
    const card = await prisma.card.findUnique({ where: { id: initial.id }, select: productSelect });
    return { ok: true as const, idempotent: result === "IDEMPOTENT", product: card ? productProjection(card) : null, status: 200 };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") return { ok: false as const, error: "ACTIVATION_CONFLICT", status: 409 };
    throw error;
  }
}

export async function updateShareProduct(userId: string, cardId: string, input: {
  action: "TARGET_CHANGE" | "STATUS_CHANGE";
  profileId?: string;
  targetId?: string;
  status?: "ACTIVE" | "PAUSED";
  locale: "ar" | "en";
}) {
  const card = await prisma.card.findFirst({ where: { id: cardId, ownerId: userId }, select: { id: true, publicSlug: true, cardStatus: true, profileId: true, activeDestinationId: true } });
  if (!card) throw new Error("PRODUCT_NOT_FOUND");
  if (input.action === "TARGET_CHANGE") {
    if (!["ACTIVE", "PAUSED"].includes(card.cardStatus)) throw new Error("PRODUCT_STATE_INVALID");
    if (!input.profileId || !input.targetId) throw new Error("TARGET_INVALID");
    const assignment = await targetAssignment(userId, input.profileId, input.targetId, input.locale);
    await prisma.$transaction(async tx => {
      const current = await tx.card.findFirst({ where: { id: cardId, ownerId: userId }, select: { id: true } });
      const profile = await tx.profile.findFirst({
        where: { AND: [
          managedProfileWhere(userId, input.profileId!),
          { OR: [
            { lifecycle: "PUBLISHED", access: { not: "PRIVATE" }, publication: { isNot: null } },
            { profileKind: null, isPublic: true, lifecycle: { notIn: ["PAUSED", "ARCHIVED"] } },
          ] },
        ] },
        select: { id: true, profileKind: true },
      });
      const destination = await tx.destination.findFirst({ where: { id: assignment.destinationId, profileId: input.profileId, isActive: true }, select: { id: true } });
      if (!current || !profile || !destination) throw new Error("TARGET_INVALID");
      if (profile.profileKind) {
        const publication = await tx.profilePublication.findUnique({
          where: { profileId: input.profileId },
          select: { publishedRevision: { select: {
            modules: { select: { key: true, enabled: true, visibility: true } },
            destinations: { select: { sourceId: true } },
          } } },
        });
        const revision = publication?.publishedRevision;
        const targetCurrent = assignment.target.id === "profile"
          || (assignment.target.id === "contact" && revision?.modules.some(item => item.key === "CONTACT" && item.enabled && item.visibility === "PUBLIC"))
          || (assignment.target.id.startsWith("destination:") && revision?.destinations.some(item => item.sourceId === assignment.destinationId));
        if (!targetCurrent) throw new Error("TARGET_INVALID");
      }
      await tx.card.update({ where: { id: cardId }, data: { profileId: input.profileId, activeDestinationId: assignment.destinationId } });
      await tx.auditLog.create({ data: { actorId: userId, operation: "product.share_target.changed", targetId: cardId, metadata: { targetType: assignment.target.type, profileChanged: card.profileId !== input.profileId } } });
    });
  } else {
    if (!input.status || !["ACTIVE", "PAUSED"].includes(input.status)) throw new Error("STATUS_INVALID");
    const transitionAllowed = (card.cardStatus === "ACTIVE" && input.status === "PAUSED")
      || (card.cardStatus === "PAUSED" && input.status === "ACTIVE");
    if (!transitionAllowed) throw new Error("STATUS_INVALID");
    await prisma.$transaction([
      prisma.card.update({ where: { id: cardId }, data: { cardStatus: input.status } }),
      prisma.productStatusHistory.create({ data: { cardId, fromStatus: card.cardStatus, toStatus: input.status, actorId: userId, reason: "SHARE_CENTER" } }),
      prisma.auditLog.create({ data: { actorId: userId, operation: input.status === "PAUSED" ? "product.paused" : "product.resumed", targetId: cardId } }),
    ]);
  }
  const updated = await prisma.card.findUnique({ where: { id: cardId }, select: productSelect });
  return updated ? productProjection(updated) : null;
}

export function publishedShareDestination(projection: Awaited<ReturnType<typeof getPublicProfileProjectionById>>, destinationId: string) {
  if (!projection?.publiclyReadable) return null;
  const destination = projection.profile.destinations.find((item) => item.id === destinationId);
  return destination && isSafeDestinationUrl(destination.url) ? destination : null;
}

export function shareDestinationIsCurrentlyPublished(projection: Awaited<ReturnType<typeof getPublicProfileProjectionById>>, destinationId: string) {
  return Boolean(publishedShareDestination(projection, destinationId));
}

export function activationAttemptFingerprintForTest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

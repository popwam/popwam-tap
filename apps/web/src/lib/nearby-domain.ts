import "server-only";

import { randomBytes } from "node:crypto";
import {
  LegalConsentSource,
  NearbyPresenceSource,
  NearbyRateLimitKind,
  Prisma,
  prisma,
} from "@popwam/db";
import { acceptLegalDocument } from "./legal-consent";
import { communityPolicyStatus } from "./friends-domain";
import {
  publicRelationshipState,
  relationshipState,
} from "./friends-policy";
import {
  NEARBY_CELL_VERSION,
  NEARBY_CONFIG_KEY,
  NEARBY_SESSION_TOKEN_BYTES,
  cellChangeWindow,
  encodeNearbyCell,
  nearbyCapabilities,
  nearbyCellNeighborhood,
  nearbyFeatureDecision,
  nearbyPreferenceEffectivelyEnabled,
  nearbyPresenceActive,
  nearbyStage,
  nextNearbyGeneration,
  parseNearbyFeatureConfig,
  rateLimitWindow,
  stableNearbyOrder,
  type NearbyFeatureConfig,
  type NearbyPresenceInput,
  type NearbyProximityBand,
  type NearbyRelationshipState,
} from "./nearby-policy";
import { securityHash } from "./security-session";

type Db = Prisma.TransactionClient | typeof prisma;
type Locale = "ar" | "en";

const activeProfileSelect = {
  id: true,
  slug: true,
  access: true,
  lifecycle: true,
  publication: {
    select: {
      publishedRevision: {
        select: {
          displayName: true,
          displayNameAr: true,
          displayNameEn: true,
          title: true,
          jobTitleAr: true,
          jobTitleEn: true,
          industryAr: true,
          industryEn: true,
          avatarUrl: true,
          logoUrl: true,
          profileKind: true,
        },
      },
    },
  },
} satisfies Prisma.ProfileSelect;

async function runtimeConfig(db: Db = prisma) {
  const row = await db.systemSetting.findUnique({ where: { key: NEARBY_CONFIG_KEY }, select: { value: true } });
  return parseNearbyFeatureConfig(row?.value);
}

async function currentDocument(db: Db, documentType: "COMMUNITY_GUIDELINES" | "NEARBY_PRIVACY", locale: Locale) {
  return db.legalDocument.findFirst({
    where: { documentType, locale, required: true, isActive: true, effectiveAt: { lte: new Date() } },
    orderBy: { effectiveAt: "desc" },
    select: { id: true, version: true },
  });
}

async function currentDocumentIds(db: Db, documentType: "COMMUNITY_GUIDELINES" | "NEARBY_PRIVACY", now: Date) {
  const rows = await db.legalDocument.findMany({
    where: { documentType, required: true, isActive: true, effectiveAt: { lte: now } },
    orderBy: [{ locale: "asc" }, { effectiveAt: "desc" }],
    select: { id: true, locale: true },
  });
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (seen.has(row.locale)) return [];
    seen.add(row.locale);
    return [row.id];
  });
}

async function acceptedDocument(db: Db, userId: string, legalDocumentId: string | null | undefined) {
  if (!legalDocumentId) return false;
  return Boolean(await db.userLegalConsent.findFirst({
    where: { userId, legalDocumentId, revokedAt: null },
    select: { id: true },
  }));
}

function socialProfileEligible(profile: {
  slug: string | null;
  access: string;
  lifecycle: string;
  publication: { publishedRevision: unknown } | null;
} | null | undefined) {
  return Boolean(
    profile?.slug
    && profile.lifecycle === "PUBLISHED"
    && (profile.access === "PUBLIC" || profile.access === "UNLISTED")
    && profile.publication?.publishedRevision,
  );
}

async function lockNearbyUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} ORDER BY "id" FOR UPDATE`;
}

async function consumeRateLimit(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: NearbyRateLimitKind,
  now: Date,
  windowSeconds: number,
  limit: number,
) {
  const existing = await tx.nearbyRateLimitBucket.findUnique({
    where: { userId_kind: { userId, kind } },
    select: { windowStart: true, count: true },
  });
  const decision = rateLimitWindow(existing, now, windowSeconds, limit);
  await tx.nearbyRateLimitBucket.upsert({
    where: { userId_kind: { userId, kind } },
    create: { userId, kind, windowStart: decision.windowStart, count: decision.count },
    update: { windowStart: decision.windowStart, count: decision.count },
  });
  if (!decision.allowed) throw new Error("NEARBY_RATE_LIMITED");
}

function sourceFromRequest(channel: "WEB" | "ANDROID"): NearbyPresenceSource {
  return channel === "ANDROID" ? "ANDROID" : "WEB";
}

function preferenceEnabled(preference: {
  enabled: boolean;
  discoverable: boolean;
  generation: number;
  activatedAt: Date | null;
} | null | undefined) {
  return nearbyPreferenceEffectivelyEnabled(preference);
}

async function statusRows(userId: string) {
  return Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        nearbyPreference: {
          select: { enabled: true, discoverable: true, generation: true, activatedAt: true },
        },
        nearbyPresence: {
          select: { generation: true, expiresAt: true },
        },
        friendsPreference: {
          select: {
            profileConfiguredAt: true,
            privacyConfiguredAt: true,
            socialProfile: { select: activeProfileSelect },
          },
        },
      },
    }),
    runtimeConfig(),
  ]);
}

export async function nearbyConsentStatus(userId: string, locale: Locale) {
  const document = await currentDocument(prisma, "NEARBY_PRIVACY", locale);
  return {
    available: Boolean(document),
    accepted: await acceptedDocument(prisma, userId, document?.id),
    version: document?.version || null,
    path: "/nearby-privacy",
  };
}

export async function nearbyStatus(userId: string, locale: Locale) {
  const [[user, config], community, consent] = await Promise.all([
    statusRows(userId),
    communityPolicyStatus(userId, locale),
    nearbyConsentStatus(userId, locale),
  ]);
  if (!user) throw new Error("NEARBY_UNAVAILABLE");
  const feature = nearbyFeatureDecision(config, user);
  const effectiveEnabled = preferenceEnabled(user.nearbyPreference);
  const active = nearbyPresenceActive({
    preferenceEnabled: effectiveEnabled,
    presenceGeneration: user.nearbyPresence?.generation ?? null,
    preferenceGeneration: user.nearbyPreference?.generation ?? 0,
    expiresAt: user.nearbyPresence?.expiresAt || null,
  });
  const profileEligible = Boolean(
    user.friendsPreference?.profileConfiguredAt
    && user.friendsPreference?.privacyConfiguredAt
    && socialProfileEligible(user.friendsPreference.socialProfile),
  );
  return {
    feature,
    community,
    consent,
    preference: {
      enabled: effectiveEnabled,
      discoverable: effectiveEnabled,
    },
    presence: { active },
    socialProfile: {
      eligible: profileEligible,
      path: "/dashboard/friends?tab=privacy",
    },
    stage: nearbyStage({
      featureAvailable: feature.available && feature.presenceEnabled && feature.discoveryEnabled,
      communityAvailable: community.available,
      communityAccepted: community.accepted,
      consentAvailable: consent.available,
      consentAccepted: consent.accepted,
      socialProfileEligible: profileEligible,
      preferenceEnabled: effectiveEnabled,
      presenceActive: active,
    }),
  };
}

export async function acceptNearbyConsent(userId: string, locale: Locale, source: LegalConsentSource) {
  const [user, config, community, document] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
    runtimeConfig(),
    communityPolicyStatus(userId, locale),
    currentDocument(prisma, "NEARBY_PRIVACY", locale),
  ]);
  if (!user || !config?.presenceEnabled || !config.discoveryEnabled || !nearbyFeatureDecision(config, user).available) throw new Error("NEARBY_UNAVAILABLE");
  if (!community.available || !community.accepted) throw new Error("NEARBY_COMMUNITY_REQUIRED");
  if (!document) throw new Error("NEARBY_CONSENT_UNAVAILABLE");
  await acceptLegalDocument(userId, document.id, source);
  return nearbyConsentStatus(userId, locale);
}

export async function revokeNearbyConsent(userId: string, locale: Locale) {
  const document = await currentDocument(prisma, "NEARBY_PRIVACY", locale);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await lockNearbyUser(tx, userId);
    if (document) {
      await tx.userLegalConsent.updateMany({
        where: { userId, legalDocumentId: document.id, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    const current = await tx.nearbyPreference.findUnique({ where: { userId }, select: { generation: true } });
    await tx.nearbyPreference.upsert({
      where: { userId },
      create: { userId, enabled: false, discoverable: false, generation: 1, disabledAt: now },
      update: {
        enabled: false,
        discoverable: false,
        generation: nextNearbyGeneration(current?.generation || 0),
        activatedAt: null,
        disabledAt: now,
        visibleUntil: null,
      },
    });
    await tx.nearbyPresence.deleteMany({ where: { userId } });
    await tx.auditLog.create({ data: { actorId: userId, operation: "nearby.consent.revoked", metadata: { documentType: "NEARBY_PRIVACY" } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return nearbyStatus(userId, locale);
}

async function requireOperationalEligibility(
  tx: Prisma.TransactionClient,
  userId: string,
  locale: Locale,
  config: NearbyFeatureConfig | null,
) {
  const [user, communityDocument, nearbyDocument] = await Promise.all([
    tx.user.findFirst({
      where: { id: userId, status: "ACTIVE" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        friendsPreference: {
          select: {
            profileConfiguredAt: true,
            privacyConfiguredAt: true,
            socialProfile: { select: activeProfileSelect },
          },
        },
      },
    }),
    currentDocument(tx, "COMMUNITY_GUIDELINES", locale),
    currentDocument(tx, "NEARBY_PRIVACY", locale),
  ]);
  if (!user || !nearbyFeatureDecision(config, user).available) throw new Error("NEARBY_UNAVAILABLE");
  if (!communityDocument || !(await acceptedDocument(tx, userId, communityDocument.id))) throw new Error("NEARBY_COMMUNITY_REQUIRED");
  if (!nearbyDocument || !(await acceptedDocument(tx, userId, nearbyDocument.id))) throw new Error("NEARBY_CONSENT_REQUIRED");
  if (
    !user.friendsPreference?.profileConfiguredAt
    || !user.friendsPreference.privacyConfiguredAt
    || !socialProfileEligible(user.friendsPreference.socialProfile)
  ) throw new Error("NEARBY_PROFILE_REQUIRED");
  return user;
}

export async function enableNearbyPresence(
  userId: string,
  locale: Locale,
  input: Extract<NearbyPresenceInput, { action: "ENABLE" }>,
  channel: "WEB" | "ANDROID",
) {
  const coarseCell = encodeNearbyCell(input.latitude, input.longitude);
  const sessionToken = randomBytes(NEARBY_SESSION_TOKEN_BYTES).toString("base64url");
  const sessionHash = securityHash("nearby-presence", sessionToken);
  const result = await prisma.$transaction(async (tx) => {
    await lockNearbyUser(tx, userId);
    const config = await runtimeConfig(tx);
    if (!config?.presenceEnabled || !config.discoveryEnabled) throw new Error("NEARBY_UNAVAILABLE");
    await requireOperationalEligibility(tx, userId, locale, config);
    const now = new Date();
    await consumeRateLimit(tx, userId, "ENABLE", now, config.enableWindowSeconds, config.enableRequestsPerWindow);
    const current = await tx.nearbyPreference.findUnique({ where: { userId }, select: { generation: true } });
    const generation = nextNearbyGeneration(current?.generation || 0);
    const expiresAt = new Date(now.getTime() + config.presenceTtlSeconds * 1000);
    await tx.nearbyPreference.upsert({
      where: { userId },
      create: {
        userId,
        enabled: true,
        discoverable: true,
        generation,
        activatedAt: now,
        disabledAt: null,
        visibleUntil: null,
      },
      update: {
        enabled: true,
        discoverable: true,
        generation,
        activatedAt: now,
        disabledAt: null,
        visibleUntil: null,
      },
    });
    await tx.nearbyPresence.upsert({
      where: { userId },
      create: {
        userId,
        coarseCell,
        cellVersion: NEARBY_CELL_VERSION,
        generation,
        sessionHash,
        source: sourceFromRequest(channel),
        cellWindowStartedAt: now,
        cellChangesInWindow: 0,
        expiresAt,
      },
      update: {
        coarseCell,
        cellVersion: NEARBY_CELL_VERSION,
        generation,
        sessionHash,
        source: sourceFromRequest(channel),
        cellWindowStartedAt: now,
        cellChangesInWindow: 0,
        expiresAt,
      },
    });
    await tx.auditLog.create({
      data: { actorId: userId, operation: "nearby.enabled", metadata: { source: sourceFromRequest(channel), configVersion: config.version } },
    });
    return { generation, expiresInSeconds: config.presenceTtlSeconds };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { ...result, sessionToken };
}

export async function refreshNearbyPresence(
  userId: string,
  locale: Locale,
  input: Extract<NearbyPresenceInput, { action: "REFRESH" }>,
) {
  const nextCell = encodeNearbyCell(input.latitude, input.longitude);
  const sessionHash = securityHash("nearby-presence", input.sessionToken);
  return prisma.$transaction(async (tx) => {
    await lockNearbyUser(tx, userId);
    const config = await runtimeConfig(tx);
    if (!config?.presenceEnabled || !config.discoveryEnabled) throw new Error("NEARBY_UNAVAILABLE");
    await requireOperationalEligibility(tx, userId, locale, config);
    const now = new Date();
    await consumeRateLimit(tx, userId, "PRESENCE_UPDATE", now, config.presenceWindowSeconds, config.presenceUpdatesPerWindow);
    const [preference, presence] = await Promise.all([
      tx.nearbyPreference.findUnique({ where: { userId }, select: { enabled: true, discoverable: true, generation: true, activatedAt: true } }),
      tx.nearbyPresence.findUnique({
        where: { userId },
        select: { coarseCell: true, generation: true, sessionHash: true, expiresAt: true, updatedAt: true, cellWindowStartedAt: true, cellChangesInWindow: true },
      }),
    ]);
    if (
      !preferenceEnabled(preference)
      || preference?.generation !== input.generation
      || presence?.generation !== input.generation
      || presence.sessionHash !== sessionHash
      || presence.expiresAt <= now
    ) throw new Error("NEARBY_SESSION_STALE");
    const cellDecision = cellChangeWindow({
      currentCell: presence.coarseCell,
      nextCell,
      windowStart: presence.cellWindowStartedAt,
      count: presence.cellChangesInWindow,
      now,
      windowSeconds: config.cellChangeWindowSeconds,
      maximum: config.maxCellChangesPerWindow,
    });
    if (!cellDecision.allowed) throw new Error("NEARBY_MOVEMENT_LIMITED");
    const expiresAt = new Date(now.getTime() + config.presenceTtlSeconds * 1000);
    const sufficientlyFresh = presence.expiresAt.getTime() > now.getTime() + (config.presenceTtlSeconds * 1000) / 2;
    const tooSoon = presence.updatedAt.getTime() > now.getTime() - config.heartbeatMinSeconds * 1000;
    if (presence.coarseCell === nextCell && sufficientlyFresh && tooSoon) {
      return { generation: input.generation, expiresInSeconds: Math.max(0, Math.floor((presence.expiresAt.getTime() - now.getTime()) / 1000)), unchanged: true };
    }
    const updated = await tx.nearbyPresence.updateMany({
      where: { userId, generation: input.generation, sessionHash },
      data: {
        coarseCell: nextCell,
        cellWindowStartedAt: cellDecision.windowStart,
        cellChangesInWindow: cellDecision.count,
        expiresAt,
      },
    });
    if (!updated.count) throw new Error("NEARBY_SESSION_STALE");
    return { generation: input.generation, expiresInSeconds: config.presenceTtlSeconds, unchanged: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function disableNearby(userId: string, channel: "WEB" | "ANDROID") {
  return prisma.$transaction(async (tx) => {
    await lockNearbyUser(tx, userId);
    const now = new Date();
    const current = await tx.nearbyPreference.findUnique({
      where: { userId },
      select: { enabled: true, discoverable: true, generation: true, activatedAt: true },
    });
    const wasEnabled = preferenceEnabled(current);
    await tx.nearbyPreference.upsert({
      where: { userId },
      create: { userId, enabled: false, discoverable: false, generation: 1, disabledAt: now },
      update: {
        enabled: false,
        discoverable: false,
        generation: nextNearbyGeneration(current?.generation || 0),
        activatedAt: null,
        disabledAt: now,
        visibleUntil: null,
      },
    });
    await tx.nearbyPresence.deleteMany({ where: { userId } });
    if (wasEnabled) {
      await tx.auditLog.create({
        data: { actorId: userId, operation: "nearby.disabled", metadata: { source: sourceFromRequest(channel) } },
      });
    }
    return { disabled: true, idempotent: !wasEnabled };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

type Candidate = Prisma.NearbyPresenceGetPayload<{
  select: {
    userId: true;
    coarseCell: true;
    user: {
      select: {
        friendsPreference: {
          select: {
            socialKey: true;
            allowFriendRequests: true;
            socialProfile: { select: typeof activeProfileSelect };
          };
        };
      };
    };
  };
}>;

function localizedCandidate(candidate: Candidate, locale: Locale) {
  const preference = candidate.user.friendsPreference;
  const profile = preference?.socialProfile;
  const revision = profile?.publication?.publishedRevision;
  if (!preference || !profile?.slug || !revision) return null;
  const ar = locale === "ar";
  const business = revision.profileKind === "BUSINESS";
  const name = (ar ? revision.displayNameAr || revision.displayNameEn : revision.displayNameEn || revision.displayNameAr) || revision.displayName;
  const title = business
    ? (ar ? revision.industryAr || revision.industryEn : revision.industryEn || revision.industryAr) || revision.title
    : (ar ? revision.jobTitleAr || revision.jobTitleEn : revision.jobTitleEn || revision.jobTitleAr) || revision.title;
  return {
    key: preference.socialKey,
    profile: {
      slug: profile.slug,
      name,
      title: title || null,
      avatarUrl: business ? revision.logoUrl || revision.avatarUrl : revision.avatarUrl,
    },
    allowFriendRequests: preference.allowFriendRequests,
  };
}

export async function discoverNearby(userId: string, locale: Locale) {
  const now = new Date();
  const rateContext = await prisma.$transaction(async (tx) => {
    await lockNearbyUser(tx, userId);
    const config = await runtimeConfig(tx);
    if (!config?.discoveryEnabled || !config.presenceEnabled) throw new Error("NEARBY_UNAVAILABLE");
    const user = await requireOperationalEligibility(tx, userId, locale, config);
    await consumeRateLimit(tx, userId, "DISCOVERY", now, config.discoveryWindowSeconds, config.discoveryRequestsPerWindow);
    const [preference, presence] = await Promise.all([
      tx.nearbyPreference.findUnique({ where: { userId }, select: { enabled: true, discoverable: true, generation: true, activatedAt: true } }),
      tx.nearbyPresence.findUnique({ where: { userId }, select: { coarseCell: true, generation: true, expiresAt: true } }),
    ]);
    const enabled = preferenceEnabled(preference);
    if (!nearbyPresenceActive({
      preferenceEnabled: enabled,
      presenceGeneration: presence?.generation ?? null,
      preferenceGeneration: preference?.generation ?? 0,
      expiresAt: presence?.expiresAt || null,
      now,
    }) || !presence) throw new Error("NEARBY_PRESENCE_REQUIRED");
    return { config, user, coarseCell: presence.coarseCell };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const [communityDocumentIds, nearbyDocumentIds] = await Promise.all([
    currentDocumentIds(prisma, "COMMUNITY_GUIDELINES", now),
    currentDocumentIds(prisma, "NEARBY_PRIVACY", now),
  ]);
  if (!communityDocumentIds.length || !nearbyDocumentIds.length) throw new Error("NEARBY_UNAVAILABLE");
  const neighborhood = nearbyCellNeighborhood(rateContext.coarseCell, rateContext.config.neighborRing);
  const candidates = await prisma.nearbyPresence.findMany({
    where: {
      userId: { not: userId },
      coarseCell: { in: [...neighborhood.keys()] },
      expiresAt: { gt: now },
      user: {
        status: "ACTIVE",
        nearbyPreference: {
          is: {
            enabled: true,
            discoverable: true,
            generation: { gt: 0 },
            activatedAt: { not: null },
          },
        },
        legalConsents: {
          some: { legalDocumentId: { in: nearbyDocumentIds }, revokedAt: null },
        },
        friendsPreference: {
          is: {
            profileConfiguredAt: { not: null },
            privacyConfiguredAt: { not: null },
            socialProfile: {
              is: {
                lifecycle: "PUBLISHED",
                access: { in: ["PUBLIC", "UNLISTED"] },
                slug: { not: null },
                publication: { isNot: null },
              },
            },
          },
        },
      },
    },
    select: {
      userId: true,
      coarseCell: true,
      generation: true,
      user: {
        select: {
          nearbyPreference: { select: { generation: true } },
          legalConsents: {
            where: { legalDocumentId: { in: communityDocumentIds }, revokedAt: null },
            select: { id: true },
            take: 1,
          },
          friendsPreference: {
            select: {
              socialKey: true,
              allowFriendRequests: true,
              socialProfile: { select: activeProfileSelect },
            },
          },
        },
      },
    },
    take: 100,
  });
  const generationValid = candidates.filter((candidate) =>
    candidate.generation === candidate.user.nearbyPreference?.generation
    && candidate.user.legalConsents.length > 0,
  );
  const candidateIds = generationValid.map((candidate) => candidate.userId);
  if (!candidateIds.length) return { results: [] };
  const [blocks, friendships, requests] = await Promise.all([
    prisma.userBlock.findMany({
      where: {
        OR: [
          { ownerId: userId, blockedId: { in: candidateIds } },
          { blockedId: userId, ownerId: { in: candidateIds } },
        ],
      },
      select: { ownerId: true, blockedId: true },
    }),
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { userAId: userId, userBId: { in: candidateIds } },
          { userBId: userId, userAId: { in: candidateIds } },
        ],
      },
      select: { userAId: true, userBId: true },
    }),
    prisma.friendRequest.findMany({
      where: {
        status: "PENDING",
        OR: [
          { requesterUserId: userId, recipientUserId: { in: candidateIds } },
          { recipientUserId: userId, requesterUserId: { in: candidateIds } },
        ],
      },
      select: { id: true, requesterUserId: true, recipientUserId: true },
    }),
  ]);
  const blocked = new Set(blocks.map((block) => block.ownerId === userId ? block.blockedId : block.ownerId));
  const friends = new Set(friendships.map((friendship) => friendship.userAId === userId ? friendship.userBId : friendship.userAId));
  const requestByUser = new Map(requests.map((request) => [
    request.requesterUserId === userId ? request.recipientUserId : request.requesterUserId,
    request,
  ]));
  const projected = generationValid.flatMap((candidate) => {
    if (blocked.has(candidate.userId)) return [];
    const identity = localizedCandidate(candidate, locale);
    const band = neighborhood.get(candidate.coarseCell);
    if (!identity || !band) return [];
    const request = requestByUser.get(candidate.userId);
    const state = publicRelationshipState(relationshipState({
      viewerId: userId,
      otherId: candidate.userId,
      accepted: friends.has(candidate.userId),
      pendingRequesterId: request?.requesterUserId,
      blockerIds: [],
    })) as NearbyRelationshipState;
    if (state === "UNAVAILABLE") return [];
    return [{
      key: identity.key,
      profile: identity.profile,
      proximityBand: band as NearbyProximityBand,
      relationshipState: state,
      requestId: request?.id || null,
      capabilities: nearbyCapabilities(state, identity.allowFriendRequests),
      order: stableNearbyOrder(userId, candidate.userId, now),
    }];
  });
  if (projected.length < rateContext.config.minimumCrowdSize) return { results: [] };
  const bandOrder: Record<NearbyProximityBand, number> = { SAME_AREA: 0, NEARBY_AREA: 1, AROUND_THIS_AREA: 2 };
  return {
    results: projected
      .sort((left, right) => bandOrder[left.proximityBand] - bandOrder[right.proximityBand] || left.order - right.order)
      .slice(0, rateContext.config.maxResults)
      .map(({ order: _order, ...result }) => result),
  };
}

export async function nearbyOperationalStatus() {
  const config = await runtimeConfig();
  const now = new Date();
  return {
    configured: Boolean(config),
    rolloutState: config?.rolloutState || "UNAVAILABLE",
    presenceEnabled: Boolean(config?.presenceEnabled),
    discoveryEnabled: Boolean(config?.discoveryEnabled),
    activePresenceCount: config
      ? await prisma.nearbyPresence.count({
          where: {
            expiresAt: { gt: now },
            user: {
              status: "ACTIVE",
              nearbyPreference: { is: { enabled: true, discoverable: true, generation: { gt: 0 }, activatedAt: { not: null } } },
            },
          },
        })
      : 0,
  };
}

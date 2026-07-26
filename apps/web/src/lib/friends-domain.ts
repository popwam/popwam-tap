import {
  FriendRequestSource,
  FriendRequestStatus,
  LegalConsentSource,
  Prisma,
  UserBlockSource,
  UserReportCategory,
  UserReportSource,
  prisma,
} from "@popwam/db";
import { acceptLegalDocument } from "./legal-consent";
import {
  FRIEND_PENDING_OUTGOING_LIMIT,
  FRIEND_REJECTION_COOLDOWN_MS,
  FRIEND_RECIPIENT_HOURLY_LIMIT,
  FRIEND_REPORT_DAILY_LIMIT,
  FRIEND_REQUEST_DAILY_LIMIT,
  FRIEND_REQUEST_HOURLY_LIMIT,
  FRIEND_REQUEST_NEW_ACCOUNT_HOURLY_LIMIT,
  FRIEND_SEARCH_PAGE_SIZE,
  canonicalFriendPair,
  normalizeFriendSearch,
  parseSocialKey,
  publicRelationshipState,
  relationshipState,
  type FriendRelationshipState,
} from "./friends-policy";

const DAY_MS = 24 * 60 * 60_000;

const socialPreferenceSelect = {
  userId: true,
  socialKey: true,
  allowFriendRequests: true,
  discoverableByProfileSearch: true,
  socialProfile: {
    select: {
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
    },
  },
} satisfies Prisma.FriendsPreferenceSelect;

type SocialPreferenceRow = Prisma.FriendsPreferenceGetPayload<{ select: typeof socialPreferenceSelect }>;

export type FriendIdentityDto = {
  key: string;
  profile: {
    slug: string;
    name: string;
    title: string | null;
    avatarUrl: string | null;
  };
};

function localizedIdentity(row: SocialPreferenceRow, locale: "ar" | "en"): FriendIdentityDto | null {
  const profile = row.socialProfile;
  const revision = profile?.publication?.publishedRevision;
  if (!profile?.slug || !revision || profile.lifecycle !== "PUBLISHED" || profile.access === "PRIVATE") return null;
  const ar = locale === "ar";
  const business = revision.profileKind === "BUSINESS";
  const name = (ar ? revision.displayNameAr || revision.displayNameEn : revision.displayNameEn || revision.displayNameAr) || revision.displayName;
  const title = business
    ? (ar ? revision.industryAr || revision.industryEn : revision.industryEn || revision.industryAr) || revision.title
    : (ar ? revision.jobTitleAr || revision.jobTitleEn : revision.jobTitleEn || revision.jobTitleAr) || revision.title;
  return {
    key: row.socialKey,
    profile: {
      slug: profile.slug,
      name,
      title: title || null,
      avatarUrl: business ? revision.logoUrl || revision.avatarUrl : revision.avatarUrl,
    },
  };
}

async function eligibleSocialProfiles(userId: string, locale: "ar" | "en") {
  const profiles = await prisma.profile.findMany({
    where: {
      userId,
      lifecycle: "PUBLISHED",
      access: { in: ["PUBLIC", "UNLISTED"] },
      publication: { isNot: null },
      slug: { not: null },
    },
    select: {
      id: true,
      slug: true,
      isPrimary: true,
      access: true,
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
              profileKind: true,
            },
          },
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { publishedAt: "desc" }],
  });
  return profiles.flatMap((profile) => {
    if (!profile.slug || !profile.publication?.publishedRevision) return [];
    const revision = profile.publication.publishedRevision;
    const ar = locale === "ar";
    const business = revision.profileKind === "BUSINESS";
    const name = (ar ? revision.displayNameAr || revision.displayNameEn : revision.displayNameEn || revision.displayNameAr) || revision.displayName;
    const title = business
      ? (ar ? revision.industryAr || revision.industryEn : revision.industryEn || revision.industryAr) || revision.title
      : (ar ? revision.jobTitleAr || revision.jobTitleEn : revision.jobTitleEn || revision.jobTitleAr) || revision.title;
    return [{ slug: profile.slug, name, title: title || null, access: profile.access, primary: profile.isPrimary }];
  });
}

async function ensureFriendsPreference(userId: string) {
  const existing = await prisma.friendsPreference.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return existing;
  const fallback = await prisma.profile.findFirst({
    where: { userId, lifecycle: "PUBLISHED", access: { in: ["PUBLIC", "UNLISTED"] }, publication: { isNot: null } },
    select: { id: true },
    orderBy: [{ isPrimary: "desc" }, { publishedAt: "desc" }],
  });
  return prisma.friendsPreference.create({ data: { userId, socialProfileId: fallback?.id || null }, select: { id: true } });
}

export async function communityPolicyStatus(userId: string, locale: "ar" | "en") {
  const document = await prisma.legalDocument.findFirst({
    where: {
      documentType: "COMMUNITY_GUIDELINES",
      locale,
      required: true,
      isActive: true,
      effectiveAt: { lte: new Date() },
    },
    orderBy: { effectiveAt: "desc" },
    select: { id: true, version: true },
  });
  if (!document) return { available: false, accepted: false, version: null, path: "/community-guidelines" };
  const consent = await prisma.userLegalConsent.findUnique({
    where: { userId_legalDocumentId: { userId, legalDocumentId: document.id } },
    select: { id: true, revokedAt: true },
  });
  return { available: true, accepted: Boolean(consent && !consent.revokedAt), version: document.version, path: "/community-guidelines" };
}

export async function acceptCommunityPolicy(userId: string, locale: "ar" | "en", source: LegalConsentSource) {
  const document = await prisma.legalDocument.findFirst({
    where: {
      documentType: "COMMUNITY_GUIDELINES",
      locale,
      required: true,
      isActive: true,
      effectiveAt: { lte: new Date() },
    },
    orderBy: { effectiveAt: "desc" },
    select: { id: true },
  });
  if (!document) throw new Error("FRIENDS_POLICY_UNAVAILABLE");
  await acceptLegalDocument(userId, document.id, source);
  return communityPolicyStatus(userId, locale);
}

async function requireCommunityPolicy(userId: string, locale: "ar" | "en") {
  const policy = await communityPolicyStatus(userId, locale);
  if (!policy.available) throw new Error("FRIENDS_POLICY_UNAVAILABLE");
  if (!policy.accepted) throw new Error("FRIENDS_POLICY_REQUIRED");
}

export async function getFriendsSettings(userId: string, locale: "ar" | "en") {
  await ensureFriendsPreference(userId);
  const [preference, profiles, policy] = await Promise.all([
    prisma.friendsPreference.findUnique({
      where: { userId },
      select: {
        socialKey: true,
        socialProfile: { select: { slug: true } },
        allowFriendRequests: true,
        discoverableByProfileSearch: true,
        profileConfiguredAt: true,
        privacyConfiguredAt: true,
      },
    }),
    eligibleSocialProfiles(userId, locale),
    communityPolicyStatus(userId, locale),
  ]);
  return {
    policy,
    preference: {
      socialProfileSlug: preference?.socialProfile?.slug || null,
      allowFriendRequests: preference?.allowFriendRequests ?? true,
      discoverableByProfileSearch: preference?.discoverableByProfileSearch ?? false,
      profileConfigured: Boolean(preference?.socialProfile?.slug && preference.profileConfiguredAt),
      privacyConfigured: Boolean(preference?.privacyConfiguredAt),
      configured: Boolean(preference?.socialProfile?.slug && preference.profileConfiguredAt && preference.privacyConfiguredAt),
    },
    profiles,
  };
}

export async function updateFriendsSettings(
  userId: string,
  locale: "ar" | "en",
  patch: { socialProfileSlug?: string; allowFriendRequests?: boolean; discoverableByProfileSearch?: boolean },
) {
  await requireCommunityPolicy(userId, locale);
  await ensureFriendsPreference(userId);
  let socialProfileId: string | undefined;
  if (patch.socialProfileSlug !== undefined) {
    const profile = await prisma.profile.findFirst({
      where: {
        userId,
        slug: patch.socialProfileSlug,
        lifecycle: "PUBLISHED",
        access: { in: ["PUBLIC", "UNLISTED"] },
        publication: { isNot: null },
      },
      select: { id: true },
    });
    if (!profile) throw new Error("SOCIAL_PROFILE_INVALID");
    socialProfileId = profile.id;
  }
  if (patch.discoverableByProfileSearch === true) {
    const profile = socialProfileId
      ? await prisma.profile.findUnique({ where: { id: socialProfileId }, select: { access: true } })
      : await prisma.friendsPreference.findUnique({ where: { userId }, select: { socialProfile: { select: { access: true } } } });
    const access = "access" in (profile || {}) ? (profile as { access: string }).access : (profile as { socialProfile?: { access: string } | null } | null)?.socialProfile?.access;
    if (access !== "PUBLIC") throw new Error("DISCOVERY_REQUIRES_PUBLIC_PROFILE");
  }
  await prisma.friendsPreference.update({
    where: { userId },
    data: {
      ...(socialProfileId ? { socialProfileId } : {}),
      ...(socialProfileId ? { profileConfiguredAt: new Date() } : {}),
      ...(patch.allowFriendRequests !== undefined ? { allowFriendRequests: patch.allowFriendRequests } : {}),
      ...(patch.discoverableByProfileSearch !== undefined ? { discoverableByProfileSearch: patch.discoverableByProfileSearch } : {}),
      ...(patch.allowFriendRequests !== undefined && patch.discoverableByProfileSearch !== undefined ? { privacyConfiguredAt: new Date() } : {}),
    },
  });
  return getFriendsSettings(userId, locale);
}

async function targetBySocialKey(key: string) {
  return prisma.friendsPreference.findUnique({
    where: { socialKey: key },
    select: {
      ...socialPreferenceSelect,
      user: { select: { id: true, status: true, createdAt: true } },
    },
  });
}

async function targetByKeyOrProfile(targetKey?: string | null, profileSlug?: string | null) {
  if (targetKey) {
    const key = parseSocialKey(targetKey);
    return key ? targetBySocialKey(key) : null;
  }
  if (!profileSlug || profileSlug.length > 100) return null;
  return prisma.friendsPreference.findFirst({
    where: { socialProfile: { is: { slug: profileSlug.toLocaleLowerCase() } } },
    select: {
      ...socialPreferenceSelect,
      user: { select: { id: true, status: true, createdAt: true } },
    },
  });
}

async function pairFacts(viewerId: string, otherId: string) {
  const pair = canonicalFriendPair(viewerId, otherId);
  const [blocks, friendship, request] = await Promise.all([
    prisma.userBlock.findMany({
      where: { OR: [{ ownerId: viewerId, blockedId: otherId }, { ownerId: otherId, blockedId: viewerId }] },
      select: { ownerId: true },
    }),
    prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
      select: { status: true, requestedById: true, blockedById: true },
    }),
    prisma.friendRequest.findFirst({
      where: { pairKey: pair.pairKey, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { requesterUserId: true },
    }),
  ]);
  const blockerIds = blocks.map((block) => block.ownerId);
  if (friendship?.status === "BLOCKED" && friendship.blockedById) blockerIds.push(friendship.blockedById);
  return {
    accepted: friendship?.status === "ACCEPTED",
    pendingRequesterId: request?.requesterUserId || (friendship?.status === "PENDING" ? friendship.requestedById : null),
    blockerIds,
  };
}

export async function getRelationshipForTarget(userId: string, targetKey?: string | null, profileSlug?: string | null) {
  const target = await targetByKeyOrProfile(targetKey, profileSlug);
  if (!target || target.user.status !== "ACTIVE" || target.user.id === userId) return { state: "UNAVAILABLE" as const };
  const facts = await pairFacts(userId, target.user.id);
  const state = relationshipState({ viewerId: userId, otherId: target.user.id, ...facts });
  return { state: publicRelationshipState(state), target: localizedIdentity(target, "en") };
}

async function lockPair(tx: Prisma.TransactionClient, first: string, second: string) {
  const pair = canonicalFriendPair(first, second);
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" IN (${pair.userAId}, ${pair.userBId}) ORDER BY "id" FOR UPDATE`);
  return pair;
}

async function transactionBlockers(tx: Prisma.TransactionClient, first: string, second: string) {
  const blocks = await tx.userBlock.findMany({
    where: { OR: [{ ownerId: first, blockedId: second }, { ownerId: second, blockedId: first }] },
    select: { ownerId: true },
  });
  const pair = canonicalFriendPair(first, second);
  const legacy = await tx.friendship.findUnique({
    where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
    select: { status: true, blockedById: true },
  });
  if (legacy?.status === "BLOCKED" && legacy.blockedById) return [...blocks.map((item) => item.ownerId), legacy.blockedById];
  return blocks.map((item) => item.ownerId);
}

async function requestLimits(tx: Prisma.TransactionClient, requesterId: string, recipientId: string, accountCreatedAt: Date) {
  const now = new Date();
  const [hour, day, recipientHour, pending, rejected] = await Promise.all([
    tx.friendRequest.count({ where: { requesterUserId: requesterId, createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } } }),
    tx.friendRequest.count({ where: { requesterUserId: requesterId, createdAt: { gte: new Date(now.getTime() - DAY_MS) } } }),
    tx.friendRequest.count({ where: { recipientUserId: recipientId, createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } } }),
    tx.friendRequest.count({ where: { requesterUserId: requesterId, status: "PENDING" } }),
    tx.friendRequest.findFirst({
      where: { requesterUserId: requesterId, recipientUserId: recipientId, status: "REJECTED" },
      orderBy: { respondedAt: "desc" },
      select: { respondedAt: true },
    }),
  ]);
  const hourlyLimit = now.getTime() - accountCreatedAt.getTime() < DAY_MS
    ? FRIEND_REQUEST_NEW_ACCOUNT_HOURLY_LIMIT
    : FRIEND_REQUEST_HOURLY_LIMIT;
  if (hour >= hourlyLimit || day >= FRIEND_REQUEST_DAILY_LIMIT || recipientHour >= FRIEND_RECIPIENT_HOURLY_LIMIT || pending >= FRIEND_PENDING_OUTGOING_LIMIT) throw new Error("FRIEND_REQUEST_LIMITED");
  if (rejected?.respondedAt && now.getTime() - rejected.respondedAt.getTime() < FRIEND_REJECTION_COOLDOWN_MS) throw new Error("FRIEND_REQUEST_COOLDOWN");
}

export async function createFriendRequest(
  requesterId: string,
  targetKey: string,
  source: FriendRequestSource,
  locale: "ar" | "en",
) {
  await requireCommunityPolicy(requesterId, locale);
  const key = parseSocialKey(targetKey);
  const target = key ? await targetBySocialKey(key) : null;
  if (!target || target.user.status !== "ACTIVE" || target.user.id === requesterId || !target.allowFriendRequests || !localizedIdentity(target, locale)) {
    throw new Error("RELATIONSHIP_UNAVAILABLE");
  }
  return prisma.$transaction(async (tx) => {
    const pair = await lockPair(tx, requesterId, target.user.id);
    const users = await tx.user.findMany({ where: { id: { in: [requesterId, target.user.id] }, status: "ACTIVE" }, select: { id: true, createdAt: true } });
    if (users.length !== 2) throw new Error("RELATIONSHIP_UNAVAILABLE");
    if ((await transactionBlockers(tx, requesterId, target.user.id)).length) throw new Error("RELATIONSHIP_UNAVAILABLE");
    const friendship = await tx.friendship.findUnique({
      where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
      select: { status: true, requestedById: true },
    });
    if (friendship?.status === "ACCEPTED") return { state: "FRIENDS" as const, idempotent: true, notificationEventId: null };
    const pending = await tx.friendRequest.findFirst({ where: { pairKey: pair.pairKey, status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (pending) {
      return {
        state: pending.requesterUserId === requesterId ? "OUTGOING_PENDING" as const : "INCOMING_PENDING" as const,
        idempotent: true,
        notificationEventId: null,
      };
    }
    if (friendship?.status === "PENDING") {
      return {
        state: friendship.requestedById === requesterId ? "OUTGOING_PENDING" as const : "INCOMING_PENDING" as const,
        idempotent: true,
        notificationEventId: null,
      };
    }
    await requestLimits(tx, requesterId, target.user.id, users.find((user) => user.id === requesterId)!.createdAt);
    const request = await tx.friendRequest.create({
      data: {
        pairKey: pair.pairKey,
        requesterUserId: requesterId,
        recipientUserId: target.user.id,
        source,
      },
    });
    const event = await tx.friendNotificationEvent.create({
      data: {
        recipientUserId: target.user.id,
        actorUserId: requesterId,
        requestId: request.id,
        type: "FRIEND_REQUEST_RECEIVED",
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: { actorId: requesterId, operation: "friend.request.created", targetId: request.id, metadata: { source } },
    });
    return { state: "OUTGOING_PENDING" as const, idempotent: false, notificationEventId: event.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function requestByOpaqueId(tx: Prisma.TransactionClient, requestId: string) {
  if (requestId.startsWith("legacy_")) {
    const legacy = await tx.friendship.findUnique({ where: { id: requestId.slice(7) } });
    return legacy?.status === "PENDING"
      ? {
          legacy: true as const,
          id: legacy.id,
          requesterUserId: legacy.requestedById,
          recipientUserId: legacy.requestedById === legacy.userAId ? legacy.userBId : legacy.userAId,
          status: "PENDING" as FriendRequestStatus,
          pairKey: canonicalFriendPair(legacy.userAId, legacy.userBId).pairKey,
        }
      : null;
  }
  const request = await tx.friendRequest.findUnique({ where: { id: requestId } });
  return request ? { ...request, legacy: false as const } : null;
}

export async function respondToFriendRequest(userId: string, requestId: string, action: "ACCEPT" | "REJECT", locale: "ar" | "en") {
  await requireCommunityPolicy(userId, locale);
  if (!/^(legacy_)?[a-z0-9_-]{10,100}$/i.test(requestId)) throw new Error("REQUEST_UNAVAILABLE");
  return prisma.$transaction(async (tx) => {
    const initial = await requestByOpaqueId(tx, requestId);
    if (!initial || initial.recipientUserId !== userId) throw new Error("REQUEST_UNAVAILABLE");
    const pair = await lockPair(tx, initial.requesterUserId, initial.recipientUserId);
    const request = await requestByOpaqueId(tx, requestId);
    if (!request || request.recipientUserId !== userId) throw new Error("REQUEST_UNAVAILABLE");
    if (request.status === "ACCEPTED" && action === "ACCEPT") return { state: "FRIENDS" as const, idempotent: true, notificationEventId: null };
    if (request.status !== "PENDING") throw new Error("REQUEST_UNAVAILABLE");
    if (action === "REJECT") {
      if (request.legacy) {
        await tx.friendship.update({ where: { id: request.id }, data: { status: "REJECTED", blockedById: null } });
      } else {
        await tx.friendRequest.update({ where: { id: request.id }, data: { status: "REJECTED", respondedAt: new Date(), revision: { increment: 1 } } });
      }
      await tx.auditLog.create({ data: { actorId: userId, operation: "friend.request.rejected", targetId: request.id } });
      return { state: "NONE" as const, idempotent: false, notificationEventId: null };
    }
    if ((await transactionBlockers(tx, request.requesterUserId, request.recipientUserId)).length) throw new Error("RELATIONSHIP_UNAVAILABLE");
    const activeUsers = await tx.user.count({ where: { id: { in: [request.requesterUserId, request.recipientUserId] }, status: "ACTIVE" } });
    if (activeUsers !== 2) throw new Error("RELATIONSHIP_UNAVAILABLE");
    if (!request.legacy) {
      await tx.friendRequest.update({ where: { id: request.id }, data: { status: "ACCEPTED", respondedAt: new Date(), revision: { increment: 1 } } });
      await tx.friendRequest.updateMany({
        where: { pairKey: pair.pairKey, id: { not: request.id }, status: "PENDING" },
        data: { status: "CANCELLED", cancelledAt: new Date(), revision: { increment: 1 } },
      });
    }
    await tx.friendship.upsert({
      where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
      create: { userAId: pair.userAId, userBId: pair.userBId, requestedById: request.requesterUserId, status: "ACCEPTED" },
      update: { requestedById: request.requesterUserId, status: "ACCEPTED", blockedById: null },
    });
    await Promise.all([
      tx.friendPreference.upsert({
        where: { ownerId_friendId: { ownerId: request.requesterUserId, friendId: request.recipientUserId } },
        create: { ownerId: request.requesterUserId, friendId: request.recipientUserId },
        update: {},
      }),
      tx.friendPreference.upsert({
        where: { ownerId_friendId: { ownerId: request.recipientUserId, friendId: request.requesterUserId } },
        create: { ownerId: request.recipientUserId, friendId: request.requesterUserId },
        update: {},
      }),
    ]);
    const event = await tx.friendNotificationEvent.create({
      data: {
        recipientUserId: request.requesterUserId,
        actorUserId: request.recipientUserId,
        requestId: request.legacy ? null : request.id,
        type: "FRIEND_REQUEST_ACCEPTED",
      },
      select: { id: true },
    });
    await tx.auditLog.create({ data: { actorId: userId, operation: "friendship.created", targetId: request.id } });
    return { state: "FRIENDS" as const, idempotent: false, notificationEventId: event.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function cancelFriendRequest(userId: string, requestId: string) {
  if (!/^(legacy_)?[a-z0-9_-]{10,100}$/i.test(requestId)) throw new Error("REQUEST_UNAVAILABLE");
  return prisma.$transaction(async (tx) => {
    const initial = await requestByOpaqueId(tx, requestId);
    if (!initial || initial.requesterUserId !== userId) throw new Error("REQUEST_UNAVAILABLE");
    await lockPair(tx, initial.requesterUserId, initial.recipientUserId);
    const request = await requestByOpaqueId(tx, requestId);
    if (!request || request.requesterUserId !== userId) throw new Error("REQUEST_UNAVAILABLE");
    if (request.status === "CANCELLED") return { state: "NONE" as const, idempotent: true };
    if (request.status !== "PENDING") throw new Error("REQUEST_UNAVAILABLE");
    if (request.legacy) {
      await tx.friendship.update({ where: { id: request.id }, data: { status: "REJECTED", blockedById: null } });
    } else {
      await tx.friendRequest.update({ where: { id: request.id }, data: { status: "CANCELLED", cancelledAt: new Date(), revision: { increment: 1 } } });
    }
    return { state: "NONE" as const, idempotent: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function identitiesByUserIds(userIds: string[], locale: "ar" | "en") {
  for (const userId of userIds) await ensureFriendsPreference(userId);
  const rows = await prisma.friendsPreference.findMany({ where: { userId: { in: userIds } }, select: socialPreferenceSelect });
  return new Map(rows.map((row) => [row.userId, localizedIdentity(row, locale)]));
}

export async function listFriends(userId: string, locale: "ar" | "en", cursor?: string | null) {
  await requireCommunityPolicy(userId, locale);
  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { id: "asc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: FRIEND_SEARCH_PAGE_SIZE + 1,
    select: { id: true, userAId: true, userBId: true },
  });
  const page = rows.slice(0, FRIEND_SEARCH_PAGE_SIZE);
  const otherIds = page.map((row) => row.userAId === userId ? row.userBId : row.userAId);
  const [identities, preferences, blocks] = await Promise.all([
    identitiesByUserIds(otherIds, locale),
    prisma.friendPreference.findMany({ where: { ownerId: userId, friendId: { in: otherIds } }, select: { friendId: true, favorite: true, muted: true } }),
    prisma.userBlock.findMany({ where: { OR: [{ ownerId: userId, blockedId: { in: otherIds } }, { blockedId: userId, ownerId: { in: otherIds } }] }, select: { ownerId: true, blockedId: true } }),
  ]);
  const preferenceMap = new Map(preferences.map((item) => [item.friendId, item]));
  const blockedIds = new Set(blocks.map((block) => block.ownerId === userId ? block.blockedId : block.ownerId));
  const friends = otherIds.flatMap((otherId) => {
    const identity = identities.get(otherId);
    if (!identity || blockedIds.has(otherId)) return [];
    const preference = preferenceMap.get(otherId);
    return [{ ...identity, relationshipState: "FRIENDS" as const, favorite: preference?.favorite || false, muted: preference?.muted || false }];
  }).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.profile.name.localeCompare(b.profile.name, locale));
  return { friends, nextCursor: rows.length > FRIEND_SEARCH_PAGE_SIZE ? page.at(-1)?.id || null : null };
}

export async function listFriendRequests(userId: string, locale: "ar" | "en", cursor?: string | null) {
  await requireCommunityPolicy(userId, locale);
  const [requests, legacy, currentIncomingCount, legacyIncomingCount] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { status: "PENDING", OR: [{ requesterUserId: userId }, { recipientUserId: userId }] },
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: FRIEND_SEARCH_PAGE_SIZE + 1,
    }),
    cursor ? Promise.resolve([]) : prisma.friendship.findMany({
      where: { status: "PENDING", OR: [{ userAId: userId }, { userBId: userId }] },
      select: { id: true, userAId: true, userBId: true, requestedById: true, createdAt: true },
      take: FRIEND_SEARCH_PAGE_SIZE,
    }),
    prisma.friendRequest.count({ where: { recipientUserId: userId, status: "PENDING" } }),
    prisma.friendship.count({
      where: {
        status: "PENDING",
        requestedById: { not: userId },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    }),
  ]);
  const page = requests.slice(0, FRIEND_SEARCH_PAGE_SIZE);
  const normalized = [
    ...legacy.map((item) => ({
      id: `legacy_${item.id}`,
      requesterUserId: item.requestedById,
      recipientUserId: item.requestedById === item.userAId ? item.userBId : item.userAId,
      createdAt: item.createdAt,
    })),
    ...page,
  ];
  const otherIds = normalized.map((request) => request.requesterUserId === userId ? request.recipientUserId : request.requesterUserId);
  const identities = await identitiesByUserIds(otherIds, locale);
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ ownerId: userId, blockedId: { in: otherIds } }, { blockedId: userId, ownerId: { in: otherIds } }] },
    select: { ownerId: true, blockedId: true },
  });
  const blockedIds = new Set(blocks.map((block) => block.ownerId === userId ? block.blockedId : block.ownerId));
  const items = normalized.flatMap((request) => {
    const otherId = request.requesterUserId === userId ? request.recipientUserId : request.requesterUserId;
    const identity = identities.get(otherId);
    if (!identity || blockedIds.has(otherId)) return [];
    const direction = request.requesterUserId === userId ? "OUTGOING" as const : "INCOMING" as const;
    return [{ id: request.id, direction, createdAt: request.createdAt.toISOString(), person: identity }];
  });
  return {
    requests: items,
    incomingPendingCount: Math.min(99, currentIncomingCount + legacyIncomingCount),
    nextCursor: requests.length > FRIEND_SEARCH_PAGE_SIZE ? page.at(-1)?.id || null : null,
  };
}

export async function searchFriends(userId: string, locale: "ar" | "en", rawQuery: unknown, cursor?: string | null) {
  await requireCommunityPolicy(userId, locale);
  const query = normalizeFriendSearch(rawQuery);
  if (!query) throw new Error("SEARCH_QUERY_INVALID");
  await ensureFriendsPreference(userId);
  const rows = await prisma.friendsPreference.findMany({
    where: {
      userId: { not: userId },
      discoverableByProfileSearch: true,
      allowFriendRequests: true,
      user: { status: "ACTIVE" },
      socialProfile: {
        is: {
          lifecycle: "PUBLISHED",
          access: "PUBLIC",
          slug: { not: null },
          publication: {
            is: {
              publishedRevision: {
                is: {
                  OR: [
                    { displayName: { contains: query, mode: "insensitive" } },
                    { displayNameAr: { contains: query, mode: "insensitive" } },
                    { displayNameEn: { contains: query, mode: "insensitive" } },
                    { slug: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        },
      },
    },
    select: socialPreferenceSelect,
    orderBy: { socialKey: "asc" },
    ...(cursor ? { cursor: { socialKey: cursor }, skip: 1 } : {}),
    take: FRIEND_SEARCH_PAGE_SIZE + 1,
  });
  const page = rows.slice(0, FRIEND_SEARCH_PAGE_SIZE);
  const candidateIds = page.map((row) => row.userId);
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ ownerId: userId, blockedId: { in: candidateIds } }, { blockedId: userId, ownerId: { in: candidateIds } }] },
    select: { ownerId: true, blockedId: true },
  });
  const blockedIds = new Set(blocks.map((block) => block.ownerId === userId ? block.blockedId : block.ownerId));
  const results = [];
  for (const row of page) {
    if (blockedIds.has(row.userId)) continue;
    const identity = localizedIdentity(row, locale);
    if (!identity) continue;
    const facts = await pairFacts(userId, row.userId);
    const state = publicRelationshipState(relationshipState({ viewerId: userId, otherId: row.userId, ...facts }));
    if (state === "UNAVAILABLE" || state === "BLOCKED_BY_ME") continue;
    results.push({ ...identity, relationshipState: state });
  }
  return { results, nextCursor: rows.length > FRIEND_SEARCH_PAGE_SIZE ? page.at(-1)?.socialKey || null : null };
}

async function acceptedPairOrThrow(tx: Prisma.TransactionClient, ownerId: string, friendId: string) {
  const pair = await lockPair(tx, ownerId, friendId);
  if ((await transactionBlockers(tx, ownerId, friendId)).length) throw new Error("RELATIONSHIP_UNAVAILABLE");
  const friendship = await tx.friendship.findUnique({
    where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
    select: { id: true, status: true },
  });
  if (friendship?.status !== "ACCEPTED") throw new Error("FRIENDSHIP_REQUIRED");
  return { pair, friendship };
}

export async function updateFriendPreference(userId: string, friendKey: string, patch: { favorite?: boolean; muted?: boolean }) {
  const target = await targetBySocialKey(friendKey);
  if (!target || target.user.id === userId) throw new Error("RELATIONSHIP_UNAVAILABLE");
  return prisma.$transaction(async (tx) => {
    await acceptedPairOrThrow(tx, userId, target.user.id);
    return tx.friendPreference.upsert({
      where: { ownerId_friendId: { ownerId: userId, friendId: target.user.id } },
      create: { ownerId: userId, friendId: target.user.id, favorite: patch.favorite || false, muted: patch.muted || false },
      update: patch,
      select: { favorite: true, muted: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function removeFriend(userId: string, friendKey: string) {
  const target = await targetBySocialKey(friendKey);
  if (!target || target.user.id === userId) throw new Error("RELATIONSHIP_UNAVAILABLE");
  return prisma.$transaction(async (tx) => {
    const pair = await lockPair(tx, userId, target.user.id);
    if ((await transactionBlockers(tx, userId, target.user.id)).length) return { removed: false, idempotent: true };
    const removed = await tx.friendship.deleteMany({ where: { userAId: pair.userAId, userBId: pair.userBId, status: "ACCEPTED" } });
    await Promise.all([
      tx.friendPreference.deleteMany({ where: { OR: [{ ownerId: userId, friendId: target.user.id }, { ownerId: target.user.id, friendId: userId }] } }),
      tx.friendPrivacyRule.deleteMany({ where: { OR: [{ ownerId: userId, friendId: target.user.id }, { ownerId: target.user.id, friendId: userId }] } }),
    ]);
    if (removed.count) await tx.auditLog.create({ data: { actorId: userId, operation: "friendship.removed" } });
    return { removed: Boolean(removed.count), idempotent: !removed.count };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function blockUser(
  userId: string,
  input: { targetKey?: string | null; profileSlug?: string | null; category?: UserReportCategory | null; source?: UserBlockSource },
) {
  const target = await targetByKeyOrProfile(input.targetKey, input.profileSlug);
  if (!target || target.user.id === userId) throw new Error("RELATIONSHIP_UNAVAILABLE");
  return prisma.$transaction(async (tx) => {
    const pair = await lockPair(tx, userId, target.user.id);
    const existingBlock = await tx.userBlock.findUnique({
      where: { ownerId_blockedId: { ownerId: userId, blockedId: target.user.id } },
      select: { id: true },
    });
    const block = await tx.userBlock.upsert({
      where: { ownerId_blockedId: { ownerId: userId, blockedId: target.user.id } },
      create: {
        ownerId: userId,
        blockedId: target.user.id,
        reasonCategory: input.category || null,
        source: input.source || "FRIENDS",
      },
      update: {
        reasonCategory: input.category || undefined,
        source: input.source || "FRIENDS",
      },
      select: { id: true },
    });
    await Promise.all([
      tx.friendRequest.updateMany({
        where: { pairKey: pair.pairKey, status: "PENDING" },
        data: { status: "CANCELLED", cancelledAt: new Date(), revision: { increment: 1 } },
      }),
      tx.friendship.deleteMany({ where: { userAId: pair.userAId, userBId: pair.userBId } }),
      tx.friendPreference.deleteMany({ where: { OR: [{ ownerId: userId, friendId: target.user.id }, { ownerId: target.user.id, friendId: userId }] } }),
      tx.friendPrivacyRule.deleteMany({ where: { OR: [{ ownerId: userId, friendId: target.user.id }, { ownerId: target.user.id, friendId: userId }] } }),
    ]);
    await tx.friendNotificationEvent.updateMany({
      where: {
        status: "PENDING",
        OR: [
          { recipientUserId: userId, actorUserId: target.user.id },
          { recipientUserId: target.user.id, actorUserId: userId },
        ],
      },
      data: { status: "SUPPRESSED" },
    });
    if (!existingBlock) await tx.auditLog.create({ data: { actorId: userId, operation: "user.blocked", targetId: block.id, metadata: { source: input.source || "FRIENDS" } } });
    return { id: block.id, idempotent: Boolean(existingBlock) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function unblockUser(userId: string, blockId: string) {
  if (!/^[a-z0-9_-]{10,100}$/i.test(blockId)) throw new Error("BLOCK_UNAVAILABLE");
  const initial = await prisma.userBlock.findFirst({ where: { id: blockId, ownerId: userId }, select: { blockedId: true } });
  if (!initial) return { unblocked: false, idempotent: true };
  return prisma.$transaction(async (tx) => {
    await lockPair(tx, userId, initial.blockedId);
    const removed = await tx.userBlock.deleteMany({ where: { id: blockId, ownerId: userId } });
    const pair = canonicalFriendPair(userId, initial.blockedId);
    await tx.friendship.updateMany({
      where: { userAId: pair.userAId, userBId: pair.userBId, status: "BLOCKED", blockedById: userId },
      data: { status: "REJECTED", blockedById: null },
    });
    if (removed.count) await tx.auditLog.create({ data: { actorId: userId, operation: "user.unblocked", targetId: blockId } });
    return { unblocked: Boolean(removed.count), idempotent: !removed.count };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listBlockedUsers(userId: string, locale: "ar" | "en") {
  const blocks = await prisma.userBlock.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" }, select: { id: true, blockedId: true, createdAt: true } });
  const identities = await identitiesByUserIds(blocks.map((block) => block.blockedId), locale);
  return blocks.map((block) => ({
    id: block.id,
    createdAt: block.createdAt.toISOString(),
    person: identities.get(block.blockedId) || null,
  }));
}

export async function reportUser(
  reporterId: string,
  input: { targetKey?: string | null; profileSlug?: string | null; category: UserReportCategory; details: string | null; source?: UserReportSource },
  locale: "ar" | "en",
) {
  await requireCommunityPolicy(reporterId, locale);
  const target = await targetByKeyOrProfile(input.targetKey, input.profileSlug);
  if (!target || target.user.id === reporterId) throw new Error("REPORT_INVALID");
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const daily = await tx.userReport.count({ where: { reporterId, createdAt: { gte: new Date(now.getTime() - DAY_MS) } } });
    if (daily >= FRIEND_REPORT_DAILY_LIMIT) throw new Error("REPORT_LIMITED");
    const duplicate = await tx.userReport.findFirst({
      where: {
        reporterId,
        subjectId: target.user.id,
        status: { in: ["OPEN", "REVIEWING"] },
        createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) },
      },
      select: { id: true },
    });
    if (duplicate) return { received: true, idempotent: true };
    await tx.userReport.create({
      data: {
        reporterId,
        subjectId: target.user.id,
        targetProfileId: target.socialProfile?.id || null,
        reason: input.category,
        category: input.category,
        source: input.source || "FRIENDS",
        details: input.details,
      },
    });
    await tx.auditLog.create({ data: { actorId: reporterId, operation: "user.report.submitted", metadata: { category: input.category, source: input.source || "FRIENDS" } } });
    return { received: true, idempotent: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function relationshipStateForUsers(viewerId: string, otherId: string): Promise<FriendRelationshipState> {
  return relationshipState({ viewerId, otherId, ...(await pairFacts(viewerId, otherId)) });
}

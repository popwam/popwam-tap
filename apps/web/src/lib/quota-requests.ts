import "server-only";

import { Prisma, prisma, type QuotaRequestStatus, type QuotaResource } from "@popwam/db";
import { getUserEntitlements, getUserUsage, quotaRemaining } from "./plans";

export const supportedQuotaResources = ["MAX_STORAGE_BYTES", "MAX_LINKS"] as const;

export function parseQuotaRequestedValue(resource: QuotaResource, value: unknown) {
  const raw = typeof value === "string" ? value.trim() : String(value ?? "");
  if (!/^\d+$/.test(raw)) return null;
  const parsed = BigInt(raw);
  if (parsed <= 0n) return null;
  if (resource === "MAX_LINKS" && parsed > 1_000_000n) return null;
  if (resource === "MAX_STORAGE_BYTES" && parsed > 10n * 1024n * 1024n * 1024n * 1024n) return null;
  return parsed;
}

export async function quotaUsageForUser(userId: string) {
  const [{ effective, plan, override }, usage, requests] = await Promise.all([
    getUserEntitlements(userId),
    getUserUsage(userId),
    prisma.quotaIncreaseRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, resource: true, requestedValue: true, status: true, adminNote: true, createdAt: true, reviewedAt: true },
    }),
  ]);
  const storageLimit = BigInt(effective.maxStorageBytes);
  const linkLimit = BigInt(effective.maxLinks);
  return {
    plan: { slug: plan.slug, source: override ? "PLAN_WITH_USER_OVERRIDE" : plan.slug === "free" ? "PLATFORM_DEFAULT" : "PLAN" },
    storage: {
      usedBytes: usage.storageBytes.toString(),
      limitBytes: storageLimit.toString(),
      remainingBytes: quotaRemaining(usage.storageBytes, storageLimit).toString(),
      overridden: override?.maxStorageBytes != null,
    },
    links: {
      used: usage.links,
      limit: Number(linkLimit),
      remaining: Number(quotaRemaining(usage.links, linkLimit)),
      overridden: override?.maxLinks != null,
    },
    requests: requests.map(request => ({
      ...request,
      requestedValue: request.requestedValue.toString(),
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() || null,
    })),
  };
}

export async function createQuotaIncreaseRequest(input: {
  userId: string;
  resource: QuotaResource;
  requestedValue: bigint;
  reason?: string;
}) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${input.userId} FOR UPDATE`);
    const existing = await tx.quotaIncreaseRequest.findFirst({
      where: { userId: input.userId, resource: input.resource, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return { request: existing, idempotent: true };

    const now = new Date();
    const [subscription, override] = await Promise.all([
      tx.userPlan.findFirst({
        where: { userId: input.userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        orderBy: { startsAt: "desc" },
        include: { plan: true },
      }),
      tx.userLimitOverride.findUnique({ where: { userId: input.userId } }),
    ]);
    const plan = subscription?.plan || await tx.plan.findUnique({ where: { slug: "free" } });
    if (!plan) throw new Error("PLAN_NOT_CONFIGURED");
    const current = input.resource === "MAX_STORAGE_BYTES"
      ? BigInt(override?.maxStorageBytes ?? plan.maxStorageBytes)
      : BigInt(override?.maxLinks ?? plan.maxLinks);
    if (input.requestedValue <= current) throw new Error("QUOTA_REQUEST_NOT_INCREASE");

    const request = await tx.quotaIncreaseRequest.create({
      data: {
        userId: input.userId,
        resource: input.resource,
        requestedValue: input.requestedValue,
        reason: input.reason?.trim().slice(0, 1000) || null,
      },
    });
    return { request, idempotent: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reviewQuotaIncreaseRequest(input: {
  requestId: string;
  adminId: string;
  status: Exclude<QuotaRequestStatus, "PENDING">;
  adminNote?: string;
}) {
  return prisma.$transaction(async tx => {
    const request = await tx.quotaIncreaseRequest.findUnique({ where: { id: input.requestId } });
    if (!request) throw new Error("QUOTA_REQUEST_NOT_FOUND");
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${request.userId} FOR UPDATE`);
    if (request.status !== "PENDING") return { request, idempotent: true };
    if (input.status === "APPROVED") {
      const data = request.resource === "MAX_STORAGE_BYTES"
        ? { maxStorageBytes: request.requestedValue }
        : { maxLinks: Number(request.requestedValue) };
      await tx.userLimitOverride.upsert({ where: { userId: request.userId }, create: { userId: request.userId, ...data }, update: data });
    }
    const updated = await tx.quotaIncreaseRequest.update({
      where: { id: request.id },
      data: {
        status: input.status,
        adminNote: input.adminNote?.trim().slice(0, 1000) || null,
        reviewedById: input.adminId,
        reviewedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: input.adminId,
        operation: `admin.quota_request.${input.status.toLowerCase()}`,
        targetId: request.id,
        metadata: { resource: request.resource },
      },
    });
    return { request: updated, idempotent: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

import "server-only";

import { prisma, Prisma } from "@popwam/db";
import type { getCurrentPopSessionContext } from "@/lib/api-auth";
import { normalizeDeviceLabel, opaqueSecurityId } from "@/lib/security-session";
import { consumeStepUpGrant } from "@/lib/security-step-up";

export type PopSessionContext = NonNullable<Awaited<ReturnType<typeof getCurrentPopSessionContext>>>;

type SessionProjection = {
  id: string;
  authority: "WEB" | "ANDROID";
  deviceId: string | null;
  label: string;
  platform: string;
  appName: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  authMethod: string;
  current: boolean;
  status: "CURRENT" | "ACTIVE";
  legacy: boolean;
};

function deviceLabel(device: { userLabel: string | null; deviceName: string | null; browserName?: string | null; appName?: string | null; platform: string }) {
  return device.userLabel || device.deviceName || (device.browserName ? `${device.browserName} on ${device.platform}` : device.appName ? `${device.appName} on ${device.platform}` : device.platform);
}

export async function projectSecurityInventory(context: PopSessionContext) {
  const now = new Date();
  const [devices, webSessions, mobileRows, passkeys] = await Promise.all([
    prisma.deviceSession.findMany({
      where: { userId: context.user.id },
      select: {
        id: true, deviceType: true, deviceName: true, userLabel: true, platform: true, browserName: true,
        appName: true, appVersion: true, authMethod: true, createdAt: true, lastSeenAt: true,
        lastAuthenticatedAt: true, revokedAt: true,
        _count: { select: { pushTokens: { where: { revokedAt: null } }, passkeys: { where: { revokedAt: null } } } },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
    }),
    prisma.session.findMany({
      where: { userId: context.user.id, expires: { gt: now } },
      select: {
        id: true, deviceSessionId: true, authMethod: true, createdAt: true, lastSeenAt: true,
        lastAuthenticatedAt: true, expires: true,
        deviceSession: { select: { userLabel: true, deviceName: true, browserName: true, platform: true, appName: true, revokedAt: true } },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
    }),
    prisma.mobileRefreshToken.findMany({
      where: { userId: context.user.id, expiresAt: { gt: now } },
      select: {
        familyId: true, deviceSessionId: true, deviceName: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true,
        deviceSession: { select: { userLabel: true, deviceName: true, platform: true, appName: true, authMethod: true, revokedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.passkeyCredential.findMany({
      where: { userId: context.user.id, revokedAt: null },
      select: { id: true, name: true, deviceType: true, backedUp: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const sessions: SessionProjection[] = webSessions
    .filter(row => !row.deviceSession?.revokedAt)
    .map(row => {
      const device = row.deviceSession;
      const label = device ? deviceLabel({ ...device, platform: device.platform }) : "Legacy web session";
      const current = row.id === context.webSessionId;
      return {
        id: opaqueSecurityId("session", `web:${row.id}`),
        authority: "WEB",
        deviceId: row.deviceSessionId ? opaqueSecurityId("device", row.deviceSessionId) : null,
        label,
        platform: device?.platform || "Web",
        appName: device?.appName || device?.browserName || "POP Web",
        createdAt: row.createdAt.toISOString(),
        lastActiveAt: row.lastSeenAt.toISOString(),
        expiresAt: row.expires.toISOString(),
        authMethod: row.authMethod,
        current,
        status: current ? "CURRENT" : "ACTIVE",
        legacy: !row.deviceSessionId || row.authMethod === "LEGACY",
      };
    });

  const families = new Map<string, typeof mobileRows>();
  for (const row of mobileRows) {
    const rows = families.get(row.familyId) || [];
    rows.push(row);
    families.set(row.familyId, rows);
  }
  for (const [familyId, rows] of families) {
    const active = rows.find(row => !row.revokedAt && !row.deviceSession?.revokedAt);
    if (!active) continue;
    const created = rows.reduce((earliest, row) => row.createdAt < earliest ? row.createdAt : earliest, rows[0].createdAt);
    const lastActive = rows.reduce((latest, row) => {
      const value = row.lastUsedAt || row.createdAt;
      return value > latest ? value : latest;
    }, rows[0].lastUsedAt || rows[0].createdAt);
    const current = Boolean(context.deviceSessionId && active.deviceSessionId === context.deviceSessionId);
    sessions.push({
      id: opaqueSecurityId("session", `mobile:${familyId}`),
      authority: "ANDROID",
      deviceId: active.deviceSessionId ? opaqueSecurityId("device", active.deviceSessionId) : null,
      label: active.deviceSession ? deviceLabel(active.deviceSession) : normalizeDeviceLabel(active.deviceName, "Legacy mobile session"),
      platform: active.deviceSession?.platform || "Android",
      appName: active.deviceSession?.appName || "POP Android",
      createdAt: created.toISOString(),
      lastActiveAt: lastActive.toISOString(),
      expiresAt: active.expiresAt.toISOString(),
      authMethod: active.deviceSession?.authMethod || "LEGACY",
      current,
      status: current ? "CURRENT" : "ACTIVE",
      legacy: !active.deviceSessionId,
    });
  }
  sessions.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));

  const deviceProjection = devices.map(device => {
    const related = sessions.filter(session => session.deviceId === opaqueSecurityId("device", device.id));
    const current = device.id === context.deviceSessionId || related.some(session => session.current);
    return {
      id: opaqueSecurityId("device", device.id),
      type: device.deviceType,
      label: deviceLabel(device),
      platform: device.platform,
      appName: device.appName || device.browserName || (device.deviceType === "MOBILE_APP" ? "POP Android" : "POP Web"),
      appVersion: device.appVersion,
      createdAt: device.createdAt.toISOString(),
      lastActiveAt: device.lastSeenAt.toISOString(),
      lastAuthenticatedAt: device.lastAuthenticatedAt?.toISOString() || null,
      authMethod: device.authMethod,
      current,
      status: device.revokedAt ? "REVOKED" as const : current ? "CURRENT" as const : related.length ? "ACTIVE" as const : "EXPIRED" as const,
      activeSessionCount: related.length,
      pushEnabled: device._count.pushTokens > 0,
      passkeyCount: device._count.passkeys,
    };
  });

  return {
    devices: deviceProjection,
    sessions,
    passkeys: passkeys.map(row => ({
      id: opaqueSecurityId("passkey", row.id),
      name: row.name || row.deviceType || "Passkey",
      deviceType: row.deviceType,
      backedUp: row.backedUp,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() || null,
    })),
  };
}

async function resolveSessionTarget(userId: string, publicId: string) {
  const [web, mobile] = await Promise.all([
    prisma.session.findMany({ where: { userId }, select: { id: true, deviceSessionId: true } }),
    prisma.mobileRefreshToken.findMany({ where: { userId }, distinct: ["familyId"], select: { familyId: true, deviceSessionId: true } }),
  ]);
  const webMatch = web.find(row => opaqueSecurityId("session", `web:${row.id}`) === publicId);
  if (webMatch) return { authority: "WEB" as const, key: webMatch.id, deviceSessionId: webMatch.deviceSessionId };
  const mobileMatch = mobile.find(row => opaqueSecurityId("session", `mobile:${row.familyId}`) === publicId);
  return mobileMatch ? { authority: "ANDROID" as const, key: mobileMatch.familyId, deviceSessionId: mobileMatch.deviceSessionId } : null;
}

export async function revokeProjectedSession(context: PopSessionContext, publicId: string, grantToken: string | null) {
  const target = await resolveSessionTarget(context.user.id, publicId);
  if (!target) return { found: false, current: false, fcmCleanup: "NOT_APPLICABLE" as const };
  const current = target.authority === "WEB"
    ? target.key === context.webSessionId
    : Boolean(context.deviceSessionId && target.deviceSessionId === context.deviceSessionId);
  const now = new Date();
  await prisma.$transaction(async tx => {
    await consumeStepUpGrant(tx, context, "REVOKE_SESSION", grantToken);
    if (target.authority === "WEB") {
      await tx.session.deleteMany({ where: { id: target.key, userId: context.user.id } });
    } else {
      await tx.mobileRefreshToken.updateMany({ where: { userId: context.user.id, familyId: target.key, revokedAt: null }, data: { revokedAt: now } });
    }
    if (target.deviceSessionId) {
      await tx.deviceSession.updateMany({ where: { id: target.deviceSessionId, userId: context.user.id, revokedAt: null }, data: { revokedAt: now } });
    }
    await tx.auditLog.create({
      data: { actorId: context.user.id, operation: "security.session.revoked", metadata: { authority: target.authority, current } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  let fcmCleanup: "SUCCESS" | "FAILED" | "NOT_APPLICABLE" = "NOT_APPLICABLE";
  if (target.deviceSessionId) {
    try {
      await prisma.devicePushToken.updateMany({ where: { deviceSessionId: target.deviceSessionId, revokedAt: null }, data: { revokedAt: now } });
      fcmCleanup = "SUCCESS";
    } catch {
      fcmCleanup = "FAILED";
    }
  }
  return { found: true, current, fcmCleanup };
}

export async function revokeOtherSessions(context: PopSessionContext, grantToken: string | null) {
  if (!context.bindingHash) throw new Error("SESSION_CONTEXT_UPGRADE_REQUIRED");
  const now = new Date();
  const result = await prisma.$transaction(async tx => {
    await consumeStepUpGrant(tx, context, "REVOKE_OTHER_SESSIONS", grantToken);
    const webResult = await tx.session.deleteMany({
      where: {
        userId: context.user.id,
        createdAt: { lte: now },
        ...(context.webSessionId ? { id: { not: context.webSessionId } } : {}),
      },
    });
    const mobileResult = await tx.mobileRefreshToken.updateMany({
      where: {
        userId: context.user.id,
        revokedAt: null,
        createdAt: { lte: now },
        ...(context.deviceSessionId ? { OR: [{ deviceSessionId: null }, { deviceSessionId: { not: context.deviceSessionId } }] } : {}),
      },
      data: { revokedAt: now },
    });
    const revokedDevices = await tx.deviceSession.findMany({
      where: {
        userId: context.user.id,
        revokedAt: null,
        createdAt: { lte: now },
        ...(context.deviceSessionId ? { id: { not: context.deviceSessionId } } : {}),
      },
      select: { id: true },
    });
    await tx.deviceSession.updateMany({ where: { id: { in: revokedDevices.map(row => row.id) } }, data: { revokedAt: now } });
    await tx.user.update({ where: { id: context.user.id }, data: { sessionsRevokedBefore: now } });
    await tx.auditLog.create({
      data: {
        actorId: context.user.id,
        operation: "security.sessions.revoked_others",
        metadata: { webCount: webResult.count, mobileCredentialCount: mobileResult.count, deviceCount: revokedDevices.length },
      },
    });
    return { webCount: webResult.count, mobileCredentialCount: mobileResult.count, deviceIds: revokedDevices.map(row => row.id) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  let fcmCleanup: "SUCCESS" | "FAILED" = "SUCCESS";
  try {
    await prisma.devicePushToken.updateMany({ where: { deviceSessionId: { in: result.deviceIds }, revokedAt: null }, data: { revokedAt: now } });
  } catch {
    fcmCleanup = "FAILED";
  }
  return { ...result, fcmCleanup };
}

export async function revokeEverySession(context: PopSessionContext, grantToken: string | null) {
  const now = new Date();
  const result = await prisma.$transaction(async tx => {
    await consumeStepUpGrant(tx, context, "SECURITY_SETTINGS", grantToken);
    const [web, mobile, devices] = await Promise.all([
      tx.session.deleteMany({ where: { userId: context.user.id } }),
      tx.mobileRefreshToken.updateMany({ where: { userId: context.user.id, revokedAt: null }, data: { revokedAt: now } }),
      tx.deviceSession.updateMany({ where: { userId: context.user.id, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    await tx.user.update({ where: { id: context.user.id }, data: { sessionsRevokedBefore: now } });
    await tx.auditLog.create({ data: { actorId: context.user.id, operation: "security.sessions.revoked_all", metadata: { webCount: web.count, mobileCredentialCount: mobile.count, deviceCount: devices.count } } });
    return { webCount: web.count, mobileCredentialCount: mobile.count, deviceCount: devices.count };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  let fcmCleanup: "SUCCESS" | "FAILED" = "SUCCESS";
  try {
    await prisma.devicePushToken.updateMany({ where: { userId: context.user.id, revokedAt: null }, data: { revokedAt: now } });
  } catch {
    fcmCleanup = "FAILED";
  }
  return { ...result, fcmCleanup };
}

export async function renameProjectedDevice(context: PopSessionContext, publicId: string, label: string) {
  const devices = await prisma.deviceSession.findMany({ where: { userId: context.user.id }, select: { id: true } });
  const device = devices.find(row => opaqueSecurityId("device", row.id) === publicId);
  if (!device) return false;
  const value = normalizeDeviceLabel(label, "");
  if (value.length < 2) throw new Error("DEVICE_LABEL_INVALID");
  await prisma.$transaction([
    prisma.deviceSession.update({ where: { id: device.id }, data: { userLabel: value } }),
    prisma.auditLog.create({ data: { actorId: context.user.id, operation: "security.device.renamed", metadata: { outcome: "SUCCESS" } } }),
  ]);
  return true;
}

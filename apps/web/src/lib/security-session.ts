import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { prisma, type Prisma, type SessionAuthMethod } from "@popwam/db";

const LAST_SEEN_INTERVAL_MS = 15 * 60_000;

function securitySecret() {
  const value = process.env.SECURITY_SESSION_SECRET || process.env.MOBILE_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("SECURITY_SESSION_SECRET_REQUIRED");
  return value;
}

export function securityHash(scope: string, value: string) {
  return createHmac("sha256", securitySecret()).update(`${scope}\0${value}`).digest("base64url");
}

export function opaqueSecurityId(scope: "device" | "session" | "passkey", value: string) {
  const prefix = scope === "device" ? "dev" : scope === "session" ? "ses" : "key";
  return `${prefix}_${securityHash(`public-${scope}`, value).slice(0, 24)}`;
}

export function normalizeDeviceLabel(value: string | null | undefined, fallback: string) {
  const clean = (value || "").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return (clean || fallback).slice(0, 80);
}

export function parseWebClient(userAgent: string | null | undefined) {
  const ua = (userAgent || "").slice(0, 512);
  const platform =
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iPod/i.test(ua) ? "iOS" :
    /Windows/i.test(ua) ? "Windows" :
    /Macintosh|Mac OS X/i.test(ua) ? "macOS" :
    /Linux/i.test(ua) ? "Linux" : "Web";
  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /OPR\//i.test(ua) ? "Opera" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Safari\//i.test(ua) ? "Safari" : "Browser";
  return { platform, browser, label: `${browser} on ${platform}` };
}

type Db = Prisma.TransactionClient | typeof prisma;

export async function createWebSessionAuthority(
  db: Db,
  input: { userId: string; authMethod: SessionAuthMethod; userAgent?: string | null; maxAgeSeconds: number },
) {
  const now = new Date();
  const metadata = parseWebClient(input.userAgent);
  const device = await db.deviceSession.create({
    data: {
      userId: input.userId,
      tokenFamilyHash: securityHash("web-device", randomBytes(32).toString("base64url")),
      deviceType: "WEB_BROWSER",
      deviceName: metadata.label,
      platform: metadata.platform,
      browserName: metadata.browser,
      appName: "POP Web",
      authMethod: input.authMethod,
      lastSeenAt: now,
      lastAuthenticatedAt: now,
    },
  });
  const session = await db.session.create({
    data: {
      userId: input.userId,
      sessionToken: randomBytes(32).toString("base64url"),
      expires: new Date(now.getTime() + input.maxAgeSeconds * 1000),
      deviceSessionId: device.id,
      authMethod: input.authMethod,
      createdAt: now,
      lastSeenAt: now,
      lastAuthenticatedAt: now,
    },
  });
  return { session, device };
}

export async function validateWebSessionAuthority(sessionId: string, userId: string, now = new Date()) {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
      expires: { gt: now },
      OR: [{ deviceSessionId: null }, { deviceSession: { revokedAt: null } }],
    },
    select: { id: true, deviceSessionId: true, authMethod: true, lastSeenAt: true, lastAuthenticatedAt: true },
  });
  if (!session) return null;
  if (session.lastSeenAt.getTime() <= now.getTime() - LAST_SEEN_INTERVAL_MS) {
    await prisma.$transaction([
      prisma.session.updateMany({
        where: { id: session.id, lastSeenAt: { lte: new Date(now.getTime() - LAST_SEEN_INTERVAL_MS) } },
        data: { lastSeenAt: now },
      }),
      ...(session.deviceSessionId ? [prisma.deviceSession.updateMany({
        where: { id: session.deviceSessionId, revokedAt: null, lastSeenAt: { lte: new Date(now.getTime() - LAST_SEEN_INTERVAL_MS) } },
        data: { lastSeenAt: now },
      })] : []),
    ]);
  }
  return session;
}

export async function revokeWebSessionAuthority(sessionId: string, userId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({ where: { id: sessionId, userId }, select: { id: true, deviceSessionId: true } });
    if (!session) return { revoked: false, deviceSessionId: null };
    await tx.session.delete({ where: { id: session.id } });
    if (session.deviceSessionId) {
      await tx.deviceSession.updateMany({ where: { id: session.deviceSessionId, userId, revokedAt: null }, data: { revokedAt: now } });
      await tx.devicePushToken.updateMany({ where: { deviceSessionId: session.deviceSessionId, revokedAt: null }, data: { revokedAt: now } });
    }
    return { revoked: true, deviceSessionId: session.deviceSessionId };
  }, { isolationLevel: "Serializable" });
}

export function sessionBindingHash(channel: "WEB" | "MOBILE", authorityId: string) {
  return securityHash("step-up-binding", `${channel}:${authorityId}`);
}

export function mobileFamilyHash(familyId: string) {
  return securityHash("mobile-family", familyId);
}

export const lastSeenIntervalMs = LAST_SEEN_INTERVAL_MS;

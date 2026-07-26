import { getServerSession } from "next-auth";
import { prisma } from "@popwam/db";
import { authOptions } from "./auth";
import { getMobileAuthContext, getMobileUser } from "./mobile-auth";
import { sessionBindingHash } from "./security-session";

export async function getApiUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  // Do not trust role/status claims cached in a JWT for authorization. Reading
  // the current account row makes suspension and role revocation immediate for
  // cookie-authenticated API routes as well as server-rendered pages.
  return prisma.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE" },
    select: { id: true, name: true, email: true, image: true, role: true, status: true },
  });
}

/**
 * Resolves an authenticated POP account for routes shared by web and Android.
 * Android's existing access token is a POP mobile token; Firebase identities
 * are deliberately not considered an authorization source here.
 */
export async function getCurrentPopUser(request: Request) {
  if (request.headers.get("authorization")?.startsWith("Bearer ")) {
    return getMobileUser(request);
  }
  return getApiUser();
}

/** Security-sensitive routes need the server-derived technical session in
 * addition to the POP user. No client-supplied "current" flag is considered. */
export async function getCurrentPopSessionContext(request: Request) {
  if (request.headers.get("authorization")?.startsWith("Bearer ")) {
    const mobile = await getMobileAuthContext(request);
    if (!mobile) return null;
    return {
      channel: "MOBILE" as const,
      user: mobile.user,
      deviceSessionId: mobile.deviceSession?.id || null,
      webSessionId: null,
      authMethod: mobile.deviceSession?.authMethod || "LEGACY",
      lastAuthenticatedAt: mobile.deviceSession?.lastAuthenticatedAt || null,
      bindingHash: mobile.deviceSession ? sessionBindingHash("MOBILE", mobile.deviceSession.id) : null,
      legacy: mobile.legacySession,
    };
  }
  return getCurrentWebPopSessionContext();
}

export async function getCurrentWebPopSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const [user, authority] = await Promise.all([
    prisma.user.findFirst({
      where: { id: session.user.id, status: "ACTIVE" },
      select: { id: true, name: true, email: true, phone: true, phoneE164: true, phoneVerifiedAt: true, role: true, locale: true, image: true },
    }),
    session.webSessionId ? prisma.session.findFirst({
      where: { id: session.webSessionId, userId: session.user.id, expires: { gt: new Date() } },
      select: { id: true, deviceSessionId: true, authMethod: true, lastAuthenticatedAt: true },
    }) : null,
  ]);
  if (!user) return null;
  return {
    channel: "WEB" as const,
    user,
    deviceSessionId: authority?.deviceSessionId || null,
    webSessionId: authority?.id || null,
    authMethod: authority?.authMethod || session.authMethod || "LEGACY",
    lastAuthenticatedAt: authority?.lastAuthenticatedAt || null,
    bindingHash: authority ? sessionBindingHash("WEB", authority.id) : null,
    legacy: !authority,
  };
}

/** Cookie requests retain the same-origin CSRF protection. POP bearer calls
 * are authenticated by the existing mobile token and may originate natively. */
export function isTrustedPopMutation(request: Request) {
  return request.headers.get("authorization")?.startsWith("Bearer ") || isSameOriginMutation(request);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  if (!origin || !host) return process.env.NODE_ENV !== "production";
  try { return new URL(origin).host === host; } catch { return false; }
}

export function csrfRejected() {
  return Response.json({ error: "CROSS_SITE_REQUEST_REJECTED" }, { status: 403, headers: { "cache-control": "no-store" } });
}

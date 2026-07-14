import { getServerSession } from "next-auth";
import { prisma } from "@popwam/db";
import { authOptions } from "./auth";

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

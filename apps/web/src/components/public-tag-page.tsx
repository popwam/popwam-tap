import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, TagEventType } from "@popwam/db";
import { isSafeDestinationUrl } from "@/lib/url";
import { decideTagResolution } from "@/lib/tag-resolution";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";

export async function PublicTagPage({ code, lookup = "shortCode" }: { code: string; lookup?: "shortCode" | "token" }) {
  let tag = await prisma.tag.findUnique({
    where: lookup === "token" ? { token: code } : { shortCode: code },
    include: {
      activeDestination: {
        include: {
          profile: {
            include: {
              fields: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } },
              uploads: { where: { isVisible: true }, orderBy: { createdAt: "desc" } },
            },
          },
        },
      },
    },
  });
  if (!tag && lookup === "shortCode") {
    const alias = await prisma.tagAlias.findUnique({ where: { code }, include: { tag: { include: { activeDestination: { include: { profile: { include: { fields: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } }, uploads: { where: { isVisible: true }, orderBy: { createdAt: "desc" } } } } } } } } } });
    tag = alias?.tag || null;
  }
  if (!tag) return <PublicStatus type="notFound"/>;
  const decision = decideTagResolution(tag);
  if (decision.kind === "status") return <PublicStatus type={decision.status}/>;
  if (decision.kind === "unconfigured") return <PublicStatus type="fallback"/>;

  const incoming = await headers();
  const context = { ipAddress: incoming.get("x-forwarded-for")?.split(",")[0]?.trim() || incoming.get("x-real-ip"), userAgent: incoming.get("user-agent"), referrer: incoming.get("referer") };
  try {
    await prisma.$transaction([
      prisma.tag.update({ where: { id: tag.id }, data: { scanCount: { increment: 1 }, lastScannedAt: new Date() } }),
      prisma.tagEvent.create({ data: { tagId: tag.id, type: TagEventType.SCAN, ...context } }),
    ]);
  } catch (error) { console.error("public tag analytics failed", { operation: "tag.scan", route: lookup === "token" ? `/t/${code}` : `/${code}`, tagId: tag.id, error: error instanceof Error ? error.name : "unknown" }); }

  if (decision.kind === "redirect") {
    if (!isSafeDestinationUrl(decision.url)) return <PublicStatus type="fallback"/>;
    try { await prisma.tagEvent.create({ data: { tagId: tag.id, type: TagEventType.REDIRECT, ...context, metadata: { destinationId: tag.activeDestinationId } } }); } catch {}
    redirect(decision.url);
  }
  const profile = tag.activeDestination?.profile;
  if (!profile?.isPublic) return <PublicStatus type="unavailable"/>;
  try { await prisma.tagEvent.create({ data: { tagId: tag.id, type: TagEventType.PROFILE_VIEW, ...context, metadata: { profileId: profile.id } } }); } catch {}
  return <PublicProfile profile={profile}/>;
}

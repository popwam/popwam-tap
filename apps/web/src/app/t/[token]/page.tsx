import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, TagEventType } from "@popwam/db";
import { isSafeDestinationUrl } from "@/lib/url";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";

export const dynamic = "force-dynamic";

export default async function TokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tag = await prisma.tag.findUnique({ where: { token }, include: { activeDestination: true, profile: true } });
  if (!tag) return <PublicStatus type="notFound"/>;
  if (tag.status === "PAUSED") return <PublicStatus type="paused"/>;
  if (tag.status === "LOST") return <PublicStatus type="lost"/>;
  if (tag.status === "DISABLED") return <PublicStatus type="disabled"/>;

  const incoming = await headers();
  const context = {
    ipAddress: incoming.get("x-forwarded-for")?.split(",")[0]?.trim() || incoming.get("x-real-ip"),
    userAgent: incoming.get("user-agent"), referrer: incoming.get("referer"),
  };
  await prisma.$transaction([
    prisma.tag.update({ where: { id: tag.id }, data: { scanCount: { increment: 1 }, lastScannedAt: new Date() } }),
    prisma.tagEvent.create({ data: { tagId: tag.id, type: TagEventType.SCAN, ...context } }),
  ]);
  if (tag.mode === "REDIRECT") {
    if (!tag.activeDestination || !isSafeDestinationUrl(tag.activeDestination.url)) return <PublicStatus type="fallback"/>;
    await prisma.tagEvent.create({ data: { tagId: tag.id, type: TagEventType.REDIRECT, ...context, metadata: { destinationId: tag.activeDestination.id } } });
    redirect(tag.activeDestination.url);
  }
  if (!tag.profile?.isPublic) return <PublicStatus type="fallback"/>;
  await prisma.tagEvent.create({ data: { tagId: tag.id, type: TagEventType.PROFILE_VIEW, ...context, metadata: { profileId: tag.profile.id } } });
  return <PublicProfile profile={tag.profile}/>;
}

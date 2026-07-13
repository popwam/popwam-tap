import { prisma } from "@popwam/db";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";

export const dynamic = "force-dynamic";

export default async function IdProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return <PublicStatus type="notFound"/>;
  if (!profile.isPublic) return <PublicStatus type="unavailable"/>;
  return <PublicProfile profile={profile}/>;
}

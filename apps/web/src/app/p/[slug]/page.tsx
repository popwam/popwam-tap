import { prisma } from "@popwam/db";
import { PublicProfile } from "@/components/public-profile";
import { PublicStatus } from "@/components/public-status";

export const dynamic = "force-dynamic";

export default async function SlugProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await prisma.profile.findUnique({ where: { slug } });
  if (!profile) return <PublicStatus type="notFound"/>;
  if (!profile.isPublic) return <PublicStatus type="unavailable"/>;
  return <PublicProfile profile={profile}/>;
}

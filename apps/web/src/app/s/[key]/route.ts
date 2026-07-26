import { redirect } from "next/navigation";
import { prisma } from "@popwam/db";
import { getPublicProfileProjectionById } from "@/lib/profile-projection";
import { shareDestinationIsCurrentlyPublished } from "@/lib/share-center";
import { isSafeDestinationUrl } from "@/lib/url";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key;
  if (!/^[A-Za-z0-9_-]{12,120}$/.test(key)) return new Response("Not found", { status: 404 });
  const destination = await prisma.destination.findUnique({
    where: { publicShareKey: key },
    select: { id: true, profileId: true, isActive: true, isVisible: true, url: true },
  });
  if (!destination?.profileId || !destination.isActive || !destination.isVisible || !isSafeDestinationUrl(destination.url)) {
    return new Response("Not found", { status: 404 });
  }
  const projection = await getPublicProfileProjectionById(destination.profileId);
  if (!shareDestinationIsCurrentlyPublished(projection, destination.id)) return new Response("Unavailable", { status: 404 });
  redirect(destination.url);
}


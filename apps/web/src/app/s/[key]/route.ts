import { redirect } from "next/navigation";
import { prisma } from "@popwam/db";
import { getPublicProfileProjectionById } from "@/lib/profile-projection";
import { publishedShareDestination } from "@/lib/share-center";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key;
  if (!/^[A-Za-z0-9_-]{12,120}$/.test(key)) return new Response("Not found", { status: 404 });
  const destination = await prisma.destination.findUnique({
    where: { publicShareKey: key },
    select: { id: true, profileId: true },
  });
  if (!destination?.profileId) {
    return new Response("Not found", { status: 404 });
  }
  const projection = await getPublicProfileProjectionById(destination.profileId);
  const published = publishedShareDestination(projection, destination.id);
  if (!published) return new Response("Unavailable", { status: 404 });
  redirect(published.url);
}

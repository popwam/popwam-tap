import { prisma } from "@popwam/db";
import { publicProfileVCardResponse } from "@/lib/public-profile-vcard";
import { normalizeProfileSlug } from "@/lib/profile-slugs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = normalizeProfileSlug((await params).slug);
  const profile = await prisma.profile.findFirst({
    where: { OR: [{ slug }, { slugHistory: { some: { slug } } }] },
    select: { id: true },
  });
  return profile ? publicProfileVCardResponse(profile.id) : new Response("Not found", { status: 404 });
}


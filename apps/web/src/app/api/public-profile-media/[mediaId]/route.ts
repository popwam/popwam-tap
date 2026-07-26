import { prisma } from "@popwam/db";
import { readDraftObject } from "@popwam/storage";

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const revisionId = new URL(request.url).searchParams.get("revision");
  if (!revisionId) return new Response("Not found", { status: 404 });
  const reference = await prisma.profileRevisionMedia.findFirst({
    where: {
      mediaId,
      visibility: "PUBLIC",
      revisionId,
      revision: {
        currentFor: { is: { profile: { lifecycle: "PUBLISHED" } } },
        access: { in: ["PUBLIC", "UNLISTED"] },
      },
    },
    select: { mediaId: true },
  });
  if (!reference) return new Response("Not found", { status: 404 });
  const asset = await prisma.profileMediaAsset.findUnique({ where: { id: mediaId }, select: { storageKey: true, mimeType: true, state: true } });
  if (!asset || asset.state !== "PUBLISHED") return new Response("Not found", { status: 404 });
  try {
    const object = await readDraftObject(asset.storageKey);
    return new Response(object.bytes, {
      headers: {
        "content-type": asset.mimeType,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Unavailable", { status: 503 });
  }
}

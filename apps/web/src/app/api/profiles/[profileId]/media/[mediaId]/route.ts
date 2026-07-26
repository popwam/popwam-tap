import { prisma } from "@popwam/db";
import { deleteDraftObject, readDraftObject } from "@popwam/storage";
import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { managedProfileWhere } from "@/lib/profile-publishing";

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string; mediaId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const { profileId, mediaId } = await params;
  const managed = await prisma.profile.findFirst({ where: managedProfileWhere(user.id, profileId), select: { id: true } });
  if (!managed) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const asset = await prisma.profileMediaAsset.findFirst({ where: { id: mediaId, profileId, state: { not: "DELETED" } } });
  if (!asset) return Response.json({ ok: false, error: "MEDIA_NOT_FOUND" }, { status: 404 });
  try {
    const object = await readDraftObject(asset.storageKey);
    return new Response(object.bytes, { headers: { "content-type": object.contentType, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch {
    return Response.json({ ok: false, error: "MEDIA_UNAVAILABLE" }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ profileId: string; mediaId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const { profileId, mediaId } = await params;
  const expectedRaw = new URL(request.url).searchParams.get("expectedDraftRevision");
  const expectedDraftRevision = expectedRaw === null ? null : Number(expectedRaw);
  if (expectedDraftRevision !== null && (!Number.isInteger(expectedDraftRevision) || expectedDraftRevision < 0)) return Response.json({ ok: false, error: "DRAFT_REVISION_REQUIRED" }, { status: 400 });
  const managed = await prisma.profile.findFirst({ where: managedProfileWhere(user.id, profileId), select: { id: true } });
  if (!managed) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const asset = await prisma.profileMediaAsset.findFirst({ where: { id: mediaId, profileId, state: { not: "DELETED" } } });
  if (!asset) return Response.json({ ok: false, error: "MEDIA_NOT_FOUND" }, { status: 404 });
  const referenced = await prisma.profileRevisionMedia.findFirst({ where: { mediaId, revision: { currentFor: { isNot: null } } }, select: { id: true } });
  try {
    await prisma.$transaction(async tx=>{
    if (expectedDraftRevision !== null) {
      const current = await tx.profile.findFirst({ where: { ...managedProfileWhere(user.id, profileId), draftRevision: expectedDraftRevision }, select: { id: true } });
      if (!current) throw new Error("STALE_DRAFT");
    }
    await tx.profileMediaAsset.update({ where: { id: mediaId }, data: referenced ? { state: "ORPHANED", orphanedAt: new Date(), profileId: null } : { state: "DELETED", deletedAt: new Date(), profileId: null } });
    const updated = await tx.profile.updateMany({ where: { id: profileId, ...(expectedDraftRevision === null ? {} : { draftRevision: expectedDraftRevision }) }, data: { draftRevision: { increment: 1 } } });
    if (!updated.count) throw new Error("STALE_DRAFT");
    await tx.auditLog.create({ data: { actorId: user.id, operation: "profile.media.removed", targetId: mediaId, metadata: { retainedForPublishedRevision: Boolean(referenced) } } });
  });
  } catch (error) {
    const code = error instanceof Error ? error.message : "MEDIA_REMOVE_FAILED";
    return Response.json({ ok: false, error: code }, { status: code === "STALE_DRAFT" ? 409 : 400 });
  }
  if (!referenced) await deleteDraftObject(asset.storageKey).catch(() => undefined);
  return Response.json({ ok: true, retainedForPublishedRevision: Boolean(referenced) });
}

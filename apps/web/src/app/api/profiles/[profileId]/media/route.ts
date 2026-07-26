import { prisma, type ProfileMediaPurpose } from "@popwam/db";
import { createDraftStorageKey, deleteDraftObject, detectImageContentType, isDraftStorageEnabled, uploadDraftImage, validateImageUpload } from "@popwam/storage";
import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { managedProfileWhere } from "@/lib/profile-publishing";

const purposes = new Set<ProfileMediaPurpose>(["AVATAR", "COVER", "LOGO", "GALLERY", "ONBOARDING_IMAGE"]);

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const { profileId } = await params;
  const profile = await prisma.profile.findFirst({ where: managedProfileWhere(user.id, profileId), select: { id: true } });
  if (!profile) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const items = await prisma.profileMediaAsset.findMany({
    where: { profileId, state: { in: ["DRAFT_ATTACHED", "PUBLISHED"] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, purpose: true, state: true, visibility: true, originalFilename: true, mimeType: true, sizeBytes: true, width: true, height: true, sortOrder: true },
  });
  return Response.json({ ok: true, items: items.map((item) => ({ ...item, sizeBytes: item.sizeBytes.toString(), previewUrl: `/api/profiles/${profileId}/media/${item.id}` })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  if (!isDraftStorageEnabled()) return Response.json({ ok: false, error: "DRAFT_MEDIA_STORAGE_NOT_CONFIGURED" }, { status: 503 });
  const { profileId } = await params;
  const profile = await prisma.profile.findFirst({ where: managedProfileWhere(user.id, profileId), select: { id: true } });
  if (!profile) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const data = await request.formData();
  const file = data.get("file");
  const purpose = String(data.get("purpose") || "") as ProfileMediaPurpose;
  const expectedRaw = data.get("expectedDraftRevision");
  const expectedDraftRevision = expectedRaw === null ? null : Number(expectedRaw);
  if (expectedDraftRevision !== null && (!Number.isInteger(expectedDraftRevision) || expectedDraftRevision < 0)) return Response.json({ ok: false, error: "DRAFT_REVISION_REQUIRED" }, { status: 400 });
  if (!(file instanceof File) || !purposes.has(purpose)) return Response.json({ ok: false, error: "MEDIA_INVALID" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageContentType(bytes);
  const validation = validateImageUpload({ filename: file.name, contentType: file.type, size: file.size });
  if (!validation.valid || !detected || detected !== file.type.toLowerCase()) {
    return Response.json({ ok: false, error: validation.valid ? "IMAGE_SIGNATURE_MISMATCH" : validation.error }, { status: 400 });
  }
  const key = createDraftStorageKey({ userId: user.id, profileId, type: purpose.toLowerCase(), filename: file.name });
  await uploadDraftImage(bytes, { key, contentType: detected });
  try {
    const asset = await prisma.$transaction(async (tx) => {
      if (expectedDraftRevision !== null) {
        const current = await tx.profile.findFirst({ where: { ...managedProfileWhere(user.id, profileId), draftRevision: expectedDraftRevision }, select: { id: true } });
        if (!current) throw new Error("STALE_DRAFT");
      }
      const created = await tx.profileMediaAsset.create({
        data: { userId: user.id, profileId, purpose, state: "DRAFT_ATTACHED", storageKey: key, originalFilename: file.name.slice(0, 255), mimeType: detected, sizeBytes: file.size },
        select: { id: true, purpose: true, state: true },
      });
      await tx.auditLog.create({ data: { actorId: user.id, operation: "profile.media.draft_uploaded", targetId: created.id, metadata: { purpose } } });
      const updated = await tx.profile.updateMany({ where: { id: profileId, ...(expectedDraftRevision === null ? {} : { draftRevision: expectedDraftRevision }) }, data: { draftRevision: { increment: 1 } } });
      if (!updated.count) throw new Error("STALE_DRAFT");
      return created;
    });
    return Response.json({ ok: true, asset: { ...asset, previewUrl: `/api/profiles/${profileId}/media/${asset.id}` } }, { status: 201 });
  } catch (error) {
    await deleteDraftObject(key).catch(() => undefined);
    const code = error instanceof Error && error.message === "STALE_DRAFT" ? "STALE_DRAFT" : "MEDIA_RECORD_FAILED";
    return Response.json({ ok: false, error: code }, { status: code === "STALE_DRAFT" ? 409 : 500 });
  }
}

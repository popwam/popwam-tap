import { Prisma, prisma } from "@popwam/db";
import { createStorageKey, deleteObject, isStorageEnabled, uploadPublicFile, validateFileUpload } from "@popwam/storage";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { assertWithinLimitLocked, getUserEntitlements } from "@/lib/plans";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request); if (!user) return mobileUnauthorized();
  if (!isStorageEnabled()) return Response.json({ ok: false, error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  const { id } = await params;
  if (!await prisma.profile.findFirst({ where: { id, userId: user.id }, select: { id: true } })) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  const data = await request.formData(); const file = data.get("file");
  if (!(file instanceof File)) return Response.json({ ok: false, error: "FILE_REQUIRED" }, { status: 400 });
  const validation = validateFileUpload({ filename: file.name, contentType: file.type, size: file.size });
  if (!validation.valid) return Response.json({ ok: false, error: validation.error }, { status: 400 });
  const { effective } = await getUserEntitlements(user.id);
  if (!effective.allowFileUploads) return Response.json({ ok: false, error: "FILE_UPLOAD_NOT_ALLOWED" }, { status: 403 });
  const key = createStorageKey({ userId: user.id, type: "files", filename: file.name });
  const uploaded = await uploadPublicFile(new Uint8Array(await file.arrayBuffer()), { key, contentType: file.type, cacheControl: "public, max-age=3600" });
  try {
    const record = await prisma.$transaction(async tx => {
      const { effective: locked } = await assertWithinLimitLocked(tx, user.id, "files");
      await assertWithinLimitLocked(tx, user.id, "uploads");
      await assertWithinLimitLocked(tx, user.id, "links");
      if (!locked.allowFileUploads) throw new Error("FILE_UPLOAD_NOT_ALLOWED");
      if (!await tx.profile.findFirst({ where: { id, userId: user.id }, select: { id: true } })) throw new Error("PROFILE_NOT_FOUND");
      const storage = await tx.uploadedFile.aggregate({ where: { uploaderUserId: user.id }, _sum: { sizeBytes: true } });
      if ((storage._sum.sizeBytes || 0n) + BigInt(file.size) > BigInt(locked.maxStorageBytes)) throw new Error("STORAGE_LIMIT_REACHED");
      const titleAr = String(data.get("titleAr") || "").trim() || null; const titleEn = String(data.get("titleEn") || "").trim() || null;
      const sortOrder = await tx.uploadedFile.count({ where: { profileId: id } });
      const created = await tx.uploadedFile.create({ data: { profileId: id, uploaderUserId: user.id, storageKey: key, publicUrl: uploaded.url, originalFilename: file.name, originalName: file.name, mimeType: file.type, sizeBytes: file.size, title: titleAr || titleEn, displayTitleAr: titleAr, displayTitleEn: titleEn, sortOrder } });
      await tx.destination.create({ data: { userId: user.id, profileId: id, type: "FILE", title: created.title || file.name, titleAr, titleEn, url: uploaded.url, iconKey: "file", sortOrder: await tx.destination.count({ where: { profileId: id } }) } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ ok: true, file: { ...record, sizeBytes: record.sizeBytes.toString() } }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    await deleteObject(key).catch(() => undefined);
    const code = error instanceof Error ? error.message : "";
    if (code === "PROFILE_NOT_FOUND") return Response.json({ ok: false, error: code }, { status: 404 });
    if (code.startsWith("LIMIT_REACHED:") || code === "FILE_UPLOAD_NOT_ALLOWED" || code === "STORAGE_LIMIT_REACHED") return Response.json({ ok: false, error: code.startsWith("LIMIT_REACHED:") ? "FILE_LIMIT_REACHED" : code }, { status: 403 });
    console.error("mobile file upload failed", { operation: "mobile.file.upload", userId: user.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ ok: false, error: "UPLOAD_FAILED" }, { status: 500 });
  }
}

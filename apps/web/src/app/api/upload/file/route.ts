import { Prisma, prisma } from "@popwam/db";
import { createStorageKey, deleteObject, isStorageEnabled, uploadPublicFile, validateFileUpload } from "@popwam/storage";
import { csrfRejected, getApiUser, isSameOriginMutation, unauthorized } from "@/lib/api-auth";
import { assertWithinLimitLocked, getUserEntitlements } from "@/lib/plans";

function planFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code.startsWith("LIMIT_REACHED:")) return "FILE_LIMIT_REACHED";
  if (code === "STORAGE_LIMIT_REACHED") return code;
  if (code === "PROFILE_NOT_FOUND") return code;
  return null;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const user = await getApiUser(); if (!user) return unauthorized();
  if (!isStorageEnabled()) return Response.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  let key: string | null = null;
  try {
    const data = await request.formData(); const file = data.get("file");
    if (!(file instanceof File)) return Response.json({ error: "FILE_REQUIRED" }, { status: 400 });
    const validation = validateFileUpload({ filename: file.name, contentType: file.type, size: file.size });
    if (!validation.valid) return Response.json({ error: validation.error }, { status: 400 });
    const { effective } = await getUserEntitlements(user.id);
    if (!effective.allowFileUploads) return Response.json({ error: "FILE_UPLOAD_NOT_ALLOWED" }, { status: 403 });
    const profileId = String(data.get("profileId") || "");
    if (!await prisma.profile.findFirst({ where: { id: profileId, userId: user.id }, select: { id: true } })) return Response.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });

    key = createStorageKey({ userId: user.id, type: "files", filename: file.name });
    const uploaded = await uploadPublicFile(new Uint8Array(await file.arrayBuffer()), { key, contentType: file.type, cacheControl: "public, max-age=3600" });
    const record = await prisma.$transaction(async tx => {
      const { effective: locked } = await assertWithinLimitLocked(tx, user.id, "files");
      await assertWithinLimitLocked(tx, user.id, "uploads");
      await assertWithinLimitLocked(tx, user.id, "links");
      if (!locked.allowFileUploads) throw new Error("LIMIT_REACHED:files");
      if (!await tx.profile.findFirst({ where: { id: profileId, userId: user.id }, select: { id: true } })) throw new Error("PROFILE_NOT_FOUND");
      const storage = await tx.uploadedFile.aggregate({ where: { uploaderUserId: user.id }, _sum: { sizeBytes: true } });
      if ((storage._sum.sizeBytes || 0n) + BigInt(file.size) > BigInt(locked.maxStorageBytes)) throw new Error("STORAGE_LIMIT_REACHED");
      const titleAr = String(data.get("displayTitleAr") || "").trim() || null; const titleEn = String(data.get("displayTitleEn") || "").trim() || null;
      const sortOrder = await tx.uploadedFile.count({ where: { profileId } });
      const created = await tx.uploadedFile.create({ data: { profileId, uploaderUserId: user.id, storageKey: key!, publicUrl: uploaded.url, originalFilename: file.name, originalName: file.name, mimeType: file.type, sizeBytes: file.size, title: titleAr || titleEn, displayTitleAr: titleAr, displayTitleEn: titleEn, sortOrder } });
      const linkOrder = await tx.destination.count({ where: { profileId } });
      await tx.destination.create({ data: { userId: user.id, profileId, title: created.title || created.originalFilename, titleAr, titleEn, type: "FILE", url: created.publicUrl, iconKey: "file", sortOrder: linkOrder } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ ...record, sizeBytes: record.sizeBytes.toString() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (key) await deleteObject(key).catch(() => undefined);
    const failure = planFailure(error);
    if (failure) return Response.json({ error: failure }, { status: failure === "PROFILE_NOT_FOUND" ? 404 : 403 });
    console.error("file upload failed", { operation: "file.upload", route: "/api/upload/file", userId: user.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const user = await getApiUser(); if (!user) return unauthorized(); const id = new URL(request.url).searchParams.get("id");
  const file = id ? await prisma.uploadedFile.findFirst({ where: { id, ...(user.role === "ADMIN" ? {} : { uploaderUserId: user.id }) } }) : null;
  if (!file) return Response.json({ error: "FILE_NOT_FOUND" }, { status: 404 });
  await prisma.$transaction([prisma.uploadedFile.delete({ where: { id: file.id } }), prisma.destination.deleteMany({ where: { userId: file.uploaderUserId, url: file.publicUrl, type: "FILE" } })]);
  await deleteObject(file.storageKey).catch(error => console.error("orphaned R2 object", { operation: "file.delete", userId: user.id, fileId: file.id, error: error instanceof Error ? error.name : "unknown" }));
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const user = await getApiUser(); if (!user) return unauthorized();
  if (!isStorageEnabled()) return Response.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  let newKey: string | null = null;
  try {
    const data = await request.formData(); const id = String(data.get("id") || ""); const file = data.get("file");
    if (!(file instanceof File)) return Response.json({ error: "FILE_REQUIRED" }, { status: 400 });
    const current = await prisma.uploadedFile.findFirst({ where: { id, uploaderUserId: user.id } });
    if (!current) return Response.json({ error: "FILE_NOT_FOUND" }, { status: 404 });
    const validation = validateFileUpload({ filename: file.name, contentType: file.type, size: file.size });
    if (!validation.valid) return Response.json({ error: validation.error }, { status: 400 });
    newKey = createStorageKey({ userId: user.id, type: "files", filename: file.name });
    const uploaded = await uploadPublicFile(new Uint8Array(await file.arrayBuffer()), { key: newKey, contentType: file.type, cacheControl: "public, max-age=3600" });
    await prisma.$transaction(async tx => {
      const { effective } = await assertWithinLimitLocked(tx, user.id, "files", 0);
      const storage = await tx.uploadedFile.aggregate({ where: { uploaderUserId: user.id }, _sum: { sizeBytes: true } });
      if ((storage._sum.sizeBytes || 0n) - current.sizeBytes + BigInt(file.size) > BigInt(effective.maxStorageBytes)) throw new Error("STORAGE_LIMIT_REACHED");
      const updated = await tx.uploadedFile.updateMany({ where: { id, uploaderUserId: user.id, storageKey: current.storageKey }, data: { storageKey: newKey!, publicUrl: uploaded.url, originalFilename: file.name, originalName: file.name, mimeType: file.type, sizeBytes: file.size } });
      if (updated.count !== 1) throw new Error("FILE_STATE_CHANGED");
      await tx.destination.updateMany({ where: { userId: user.id, type: "FILE", url: current.publicUrl }, data: { url: uploaded.url } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await deleteObject(current.storageKey).catch(() => undefined);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (newKey) await deleteObject(newKey).catch(() => undefined);
    const failure = planFailure(error); if (failure) return Response.json({ error: failure }, { status: 403 });
    console.error("file replace failed", { operation: "file.replace", userId: user.id, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: "REPLACE_FAILED" }, { status: 500 });
  }
}

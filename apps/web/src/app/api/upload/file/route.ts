import { prisma } from "@popwam/db";
import { createStorageKey, deleteObject, isStorageEnabled, uploadPublicFile, validateFileUpload } from "@popwam/storage";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { assertWithinLimit, getUserEntitlements, getUserUsage } from "@/lib/plans";

export async function POST(request: Request) {
  const user = await getApiUser(); if (!user) return unauthorized();
  if (!isStorageEnabled()) return Response.json({ error: "STORAGE_NOT_CONFIGURED" }, { status: 503 });
  try {
    const data = await request.formData(); const file = data.get("file"); if (!(file instanceof File)) return Response.json({ error: "FILE_REQUIRED" }, { status: 400 });
    const validation = validateFileUpload({ filename: file.name, contentType: file.type, size: file.size }); if (!validation.valid) return Response.json({ error: validation.error }, { status: 400 });
    const [{ effective }, usage] = await Promise.all([getUserEntitlements(user.id), getUserUsage(user.id)]);
    if (!effective.allowFileUploads) return Response.json({ error: "FILE_UPLOAD_NOT_ALLOWED" }, { status: 403 });
    await Promise.all([assertWithinLimit(user.id, "uploads"), assertWithinLimit(user.id, "links")]); if (usage.storageBytes + BigInt(file.size) > BigInt(effective.maxStorageBytes)) return Response.json({ error: "STORAGE_LIMIT_REACHED" }, { status: 403 });
    const profile = await prisma.profile.findFirst({ where: { id: String(data.get("profileId") || ""), userId: user.id } }); if (!profile) return Response.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    const key = createStorageKey({ userId: user.id, type: "files", filename: file.name }); const uploaded = await uploadPublicFile(new Uint8Array(await file.arrayBuffer()), { key, contentType: file.type, cacheControl: "public, max-age=3600" });
    try { const record = await prisma.$transaction(async tx => { const created = await tx.uploadedFile.create({ data: { profileId: profile.id, uploaderUserId: user.id, storageKey: key, publicUrl: uploaded.url, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, title: String(data.get("title") || "").trim() || null } }); await tx.destination.create({ data: { userId: user.id, profileId: profile.id, title: created.title || created.originalFilename, type: "FILE", url: created.publicUrl, iconKey: "file" } }); return created; }); return Response.json({ ...record, sizeBytes: record.sizeBytes.toString() }); }
    catch (error) { await deleteObject(key).catch(() => undefined); throw error; }
  } catch (error) { console.error("file upload failed", { operation: "file.upload", route: "/api/upload/file", userId: user.id, error: error instanceof Error ? error.name : "unknown" }); return Response.json({ error: "UPLOAD_FAILED" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const user = await getApiUser(); if (!user) return unauthorized(); const id = new URL(request.url).searchParams.get("id");
  const file = id ? await prisma.uploadedFile.findFirst({ where: { id, ...(user.role === "ADMIN" ? {} : { uploaderUserId: user.id }) } }) : null; if (!file) return Response.json({ error: "FILE_NOT_FOUND" }, { status: 404 });
  await prisma.$transaction([prisma.uploadedFile.delete({ where: { id: file.id } }), prisma.destination.deleteMany({ where: { userId: file.uploaderUserId, url: file.publicUrl, type: "FILE" } })]); await deleteObject(file.storageKey).catch(error => console.error("orphaned R2 object", { operation: "file.delete", userId: user.id, fileId: file.id, error: error instanceof Error ? error.name : "unknown" })); return Response.json({ ok: true });
}

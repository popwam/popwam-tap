import { prisma, type ProfileAccess, type ProfileModuleVisibility } from "@popwam/db";
import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { validateProfileSlug } from "@/lib/profile-slugs";
import { managedProfileWhere } from "@/lib/profile-publishing";

const accesses = new Set<ProfileAccess>(["PUBLIC", "UNLISTED", "PRIVATE"]);
const moduleVisibilities = new Set<ProfileModuleVisibility>(["PUBLIC", "UNLISTED", "FRIENDS", "ONLY_ME"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const { profileId } = await params;
  const body = await request.json().catch(() => ({})) as {
    expectedDraftRevision?: number;
    access?: ProfileAccess;
    slug?: string;
    module?: { key?: string; visibility?: ProfileModuleVisibility; enabled?: boolean };
    media?: { id?: string; visibility?: ProfileModuleVisibility };
  };
  if (!Number.isInteger(body.expectedDraftRevision)) return Response.json({ ok: false, error: "DRAFT_REVISION_REQUIRED" }, { status: 400 });
  let normalizedSlug: string | undefined;
  if (body.slug !== undefined) {
    const result = validateProfileSlug(body.slug);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    normalizedSlug = result.slug;
  }
  if (body.access && !accesses.has(body.access)) return Response.json({ ok: false, error: "ACCESS_INVALID" }, { status: 400 });
  if (body.module?.visibility && !moduleVisibilities.has(body.module.visibility)) return Response.json({ ok: false, error: "MODULE_VISIBILITY_INVALID" }, { status: 400 });
  if (body.media?.visibility && !moduleVisibilities.has(body.media.visibility)) return Response.json({ ok: false, error: "MEDIA_VISIBILITY_INVALID" }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findFirst({ where: managedProfileWhere(user.id, profileId), select: { slug: true, draftSlug: true, draftRevision: true } });
      if (!profile) throw new Error("PROFILE_NOT_FOUND");
      if (profile.draftRevision !== body.expectedDraftRevision) throw new Error("STALE_DRAFT");
      if (normalizedSlug) {
        const [current, old] = await Promise.all([
          tx.profile.findFirst({ where: { slug: normalizedSlug, id: { not: profileId } }, select: { id: true } }),
          tx.profileSlugHistory.findUnique({ where: { slug: normalizedSlug }, select: { profileId: true } }),
        ]);
        if (current || (old && old.profileId !== profileId)) throw new Error("SLUG_TAKEN");
      }
      if (body.module?.key) {
        const definition = await tx.profileModuleDefinition.findUnique({ where: { key: body.module.key }, select: { id: true } });
        if (!definition) throw new Error("MODULE_NOT_FOUND");
        const updated = await tx.profileModule.updateMany({
          where: { profileId, moduleDefinitionId: definition.id },
          data: {
            ...(body.module.visibility ? { visibility: body.module.visibility } : {}),
            ...(body.module.enabled === undefined ? {} : { enabled: body.module.enabled }),
          },
        });
        if (!updated.count) throw new Error("MODULE_NOT_FOUND");
      }
      if (body.media?.id && body.media.visibility) {
        const updated = await tx.profileMediaAsset.updateMany({ where: { id: body.media.id, profileId, state: { in: ["DRAFT_ATTACHED", "PUBLISHED"] } }, data: { visibility: body.media.visibility } });
        if (!updated.count) throw new Error("MEDIA_NOT_FOUND");
      }
      if (body.access) await tx.auditLog.create({ data: { actorId: user.id, operation: "profile.visibility.changed", targetId: profileId, metadata: { visibility: body.access } } });
      if (normalizedSlug && normalizedSlug !== (profile.draftSlug ?? profile.slug)) await tx.auditLog.create({ data: { actorId: user.id, operation: "profile.slug.draft_changed", targetId: profileId } });
      return tx.profile.updateMany({
        where: { id: profileId, draftRevision: body.expectedDraftRevision },
        data: {
          ...(body.access ? { access: body.access } : {}),
          ...(normalizedSlug ? { draftSlug: normalizedSlug } : {}),
          draftRevision: { increment: 1 },
        },
      });
    }, { isolationLevel: "Serializable" });
    if (!result.count) throw new Error("STALE_DRAFT");
    return Response.json({ ok: true, draftRevision: body.expectedDraftRevision! + 1 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "VISIBILITY_UPDATE_FAILED";
    return Response.json({ ok: false, error: code }, { status: code === "STALE_DRAFT" ? 409 : code === "PROFILE_NOT_FOUND" ? 404 : 400 });
  }
}

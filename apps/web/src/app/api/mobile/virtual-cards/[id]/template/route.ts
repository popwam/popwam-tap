import { prisma } from "@popwam/db";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { mutateProfileEditor } from "@/lib/profile-editor";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const card = await prisma.virtualCard.findFirst({ where: { id, userId: user.id, status: { not: "ARCHIVED" } }, select: { profileId: true, profile: { select: { draftRevision: true } } } });
  if (!card) return Response.json({ ok: false, error: "PROFILE_NOT_FOUND" }, { status: 404 });
  try {
    return Response.json(await mutateProfileEditor(user.id, card.profileId, body.expectedDraftRevision ?? card.profile.draftRevision, { type: "TEMPLATE_SELECT", templateId: body.templateId }));
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z0-9_]{1,80}$/.test(error.message) ? error.message : "PROFILE_SAVE_FAILED";
    return Response.json({ ok: false, error: code }, { status: code === "STALE_DRAFT" ? 409 : 400 });
  }
}

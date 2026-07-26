import { getCurrentPopUser, isTrustedPopMutation, csrfRejected, unauthorized } from "@/lib/api-auth";
import { buildOwnerPreviewProjection } from "@/lib/profile-preview";
import { evaluateProfileReadiness, getOwnedDraft, publishProfile, transitionProfile } from "@/lib/profile-publishing";

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "PUBLISHING_FAILED";
  const status = code === "PROFILE_NOT_FOUND" ? 404 : code === "STALE_DRAFT" ? 409 : 400;
  return Response.json({ ok: false, error: code }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const { profileId } = await params;
  const profile = await getOwnedDraft(user.id, profileId);
  if (!profile) return failure(new Error("PROFILE_NOT_FOUND"));
  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  return Response.json({
    ok: true,
    readiness: evaluateProfileReadiness(profile),
    preview: buildOwnerPreviewProjection(profile, locale),
    publishedRevision: profile.publication?.publishedRevision ?? null,
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const { profileId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string; draftRevision?: number };
  try {
    if (body.action === "publish") {
      if (!Number.isInteger(body.draftRevision)) throw new Error("DRAFT_REVISION_REQUIRED");
      return Response.json(await publishProfile(user.id, profileId, body.draftRevision!));
    }
    if (body.action === "pause" || body.action === "resume" || body.action === "archive") {
      return Response.json({ ok: true, lifecycle: await transitionProfile(user.id, profileId, body.action) });
    }
    throw new Error("ACTION_INVALID");
  } catch (error) {
    return failure(error);
  }
}

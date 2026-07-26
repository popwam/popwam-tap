import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { getProfileEditor, mutateProfileEditor, type ProfileEditorAction } from "@/lib/profile-editor";

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "PROFILE_EDITOR_FAILED";
  const status = code === "PROFILE_NOT_FOUND" ? 404
    : code === "STALE_DRAFT" ? 409
      : code === "PROFILE_ARCHIVED" ? 410
        : code === "MODULE_REQUIRED" || code === "MODULE_NOT_ALLOWED" ? 422
          : 400;
  return Response.json({ ok: false, error: code }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const { profileId } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  try {
    return Response.json(await getProfileEditor(user.id, profileId, locale), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const { profileId } = await params;
  const body = await request.json().catch(() => ({})) as { expectedDraftRevision?: number; action?: ProfileEditorAction };
  try {
    if (!body.action) throw new Error("ACTION_INVALID");
    return Response.json(await mutateProfileEditor(user.id, profileId, body.expectedDraftRevision ?? -1, body.action));
  } catch (error) {
    return failure(error);
  }
}

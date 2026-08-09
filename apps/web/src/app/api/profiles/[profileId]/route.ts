import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { archiveProfile } from "@/lib/profile-domain";
import { getProfileSelector } from "@/lib/profile-editor";

/** Profile deletion is a recoverable archive operation. Account deletion is a
 * separate security workflow and cannot be reached through this route. */
export async function DELETE(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const { profileId } = await params;
  const body = await request.json().catch(() => ({})) as { replacementProfileId?: string };
  try {
    await archiveProfile(user.id, profileId, body.replacementProfileId);
    const selector = await getProfileSelector(user.id, body.replacementProfileId);
    return Response.json({ ok: true, activeProfileId: selector.selectedProfileId });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFILE_ARCHIVE_FAILED";
    const status = code === "PROFILE_ARCHIVE_TARGET_INVALID" ? 404
      : code.startsWith("PRIMARY_PROFILE_REPLACEMENT") ? 409
        : 400;
    return Response.json({ ok: false, error: code }, { status });
  }
}

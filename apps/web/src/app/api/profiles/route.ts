import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { getProfileSelector } from "@/lib/profile-editor";
import { createAdditionalProfile } from "@/lib/profile-domain";
import { profileRuntimeFailure } from "@/lib/profile-runtime-errors";
import type { ProfileKind } from "@popwam/db";

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const url = new URL(request.url);
  return Response.json(
    { ok: true, ...(await getProfileSelector(user.id, url.searchParams.get("selected"))) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const body = await request.json().catch(() => ({})) as {
    displayName?: string;
    displayLabel?: string;
    profileKind?: ProfileKind;
    categorySlug?: string;
    templateId?: string;
    primaryLanguage?: "ar" | "en";
    creationKey?: string;
  };
  if (body.profileKind !== "PERSONAL" && body.profileKind !== "BUSINESS") {
    return Response.json({ ok: false, error: "PROFILE_KIND_INVALID" }, { status: 400 });
  }
  try {
    const profile = await createAdditionalProfile({
      userId: user.id,
      displayName: body.displayName || "",
      displayLabel: body.displayLabel,
      profileKind: body.profileKind,
      categorySlug: body.categorySlug,
      templateId: body.templateId,
      primaryLanguage: body.primaryLanguage,
      creationKey: body.creationKey,
    });
    return Response.json({ ok: true, profileId: profile.id }, { status: 201 });
  } catch (error) {
    const { code } = profileRuntimeFailure("CREATE", error, "PROFILE_CREATE_DATABASE_ERROR");
    const status = code === "PROFILE_LIMIT_REACHED" || code === "BUSINESS_PROFILES_NOT_ALLOWED" ? 403
      : code === "PROFILE_CREATION_KEY_CONFLICT" ? 409
        : 400;
    return Response.json({ ok: false, error: code }, { status });
  }
}

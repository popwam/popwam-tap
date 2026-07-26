import { getCurrentPopUser, isTrustedPopMutation, csrfRejected, unauthorized } from "@/lib/api-auth";
import { completeInitialProfileBootstrap, getProfileBootstrapStatus } from "@/lib/profile-bootstrap";

const localeFrom = (value: unknown) => value === "ar" ? "ar" : "en";

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const locale = localeFrom(new URL(request.url).searchParams.get("locale"));
  return Response.json({ ok: true, ...(await getProfileBootstrapStatus(user.id, locale)) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const profileKind = body?.profileKind;
  if (!body || (profileKind !== "PERSONAL" && profileKind !== "BUSINESS")) return Response.json({ ok: false, error: "PROFILE_KIND_INVALID" }, { status: 400 });
  try {
    const profile = await completeInitialProfileBootstrap({ userId: user.id, locale: localeFrom(body.locale), displayName: typeof body.displayName === "string" ? body.displayName : "", profileKind, categorySlug: typeof body.categorySlug === "string" ? body.categorySlug : "", templateId: typeof body.templateId === "string" ? body.templateId : null });
    return Response.json({ ok: true, profile: { id: profile.id, profileKind: profile.profileKind, categoryId: profile.categoryId, templateId: profile.templateId } });
  } catch (error) {
    const safe = error instanceof Error ? error.message : "PROFILE_BOOTSTRAP_FAILED";
    return Response.json({ ok: false, error: safe }, { status: safe === "PROFILE_BOOTSTRAP_COMPATIBILITY_REQUIRED" ? 409 : 400 });
  }
}

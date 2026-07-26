import { getCurrentPopUser, unauthorized } from "@/lib/api-auth";
import { getShareTargets } from "@/lib/share-center";

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const { profileId } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  try {
    return Response.json({ ok: true, ...(await getShareTargets(user.id, profileId, locale)) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "SHARE_TARGETS_FAILED" }, { status: 404 });
  }
}


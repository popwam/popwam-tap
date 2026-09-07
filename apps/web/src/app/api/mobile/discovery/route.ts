import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { discoverPublic } from "@/lib/discovery-domain";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  if (!authRequestAllowed(request, `mobile-discovery:${user.id}`, 30, 60_000)) {
    return Response.json({ ok: false, error: "SEARCH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store" } });
  }
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";
  const query = url.searchParams.get("q");
  if (query !== null && query.trim().length < 2) return Response.json({ ok: false, error: "SEARCH_QUERY_INVALID" }, { status: 400 });
  try {
    return Response.json({ ok: true, ...(await discoverPublic(locale, query)) }, { headers: { "cache-control": "private, max-age=60" } });
  } catch {
    return Response.json({ ok: false, error: "DISCOVERY_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

import { getCurrentPopUser, unauthorized } from "@/lib/api-auth";
import { getProfileSelector } from "@/lib/profile-editor";

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const url = new URL(request.url);
  return Response.json(
    { ok: true, ...(await getProfileSelector(user.id, url.searchParams.get("selected"))) },
    { headers: { "cache-control": "no-store" } },
  );
}


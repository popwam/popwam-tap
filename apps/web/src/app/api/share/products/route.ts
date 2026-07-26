import { getCurrentPopUser, unauthorized } from "@/lib/api-auth";
import { getShareProducts } from "@/lib/share-center";

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  return Response.json({ ok: true, products: await getShareProducts(user.id) }, { headers: { "cache-control": "no-store" } });
}


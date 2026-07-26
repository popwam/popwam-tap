import { getPublicLocalizationBootstrap } from "@/lib/localization-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { ok: true, ...(await getPublicLocalizationBootstrap()) },
    { headers: { "cache-control": "no-store" } },
  );
}

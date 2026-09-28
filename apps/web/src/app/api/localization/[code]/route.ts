import { getRuntimeLocalizationConfig } from "@/lib/localization-runtime";
import { publicLocalizationPack } from "@/lib/localization-policy";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const pack = publicLocalizationPack(await getRuntimeLocalizationConfig(), code);
  if (!pack) {
    return Response.json(
      { ok: false, error: "LOCALIZATION_LOCALE_UNAVAILABLE" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(
    { ok: true, ...pack },
    { headers: { "cache-control": "no-store" } },
  );
}

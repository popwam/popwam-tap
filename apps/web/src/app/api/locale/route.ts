export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})); const locale = body.locale === "en" ? "en" : "ar";
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(":")[0];
  const sharedDomain = host === "popwam.com" || host.endsWith(".popwam.com") ? "; Domain=.popwam.com" : "";
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json({ locale }, { headers: { "set-cookie": `popwam_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain}${secure}; HttpOnly` } });
}

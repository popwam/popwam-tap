export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})); const locale = body.locale === "en" ? "en" : "ar";
  return Response.json({ locale }, { headers: { "set-cookie": `popwam_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly` } });
}

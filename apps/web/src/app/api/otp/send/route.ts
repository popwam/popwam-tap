/**
 * Web phone verification is gated until its Firebase reCAPTCHA/session-cookie
 * flow is completed. The former provider-backed route is intentionally inert.
 */
export async function POST() {
  return Response.json(
    { ok: false, error: "WEB_FIREBASE_PHONE_AUTH_PENDING" },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}

/**
 * Web session establishment from phone proof is deliberately disabled until
 * Firebase Web Phone Auth is integrated with the existing secure cookie flow.
 */
export async function POST() {
  return Response.json(
    { ok: false, error: "WEB_FIREBASE_PHONE_AUTH_PENDING" },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}

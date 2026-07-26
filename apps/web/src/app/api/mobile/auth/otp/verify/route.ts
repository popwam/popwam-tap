/**
 * Compatibility tombstone. No unauthenticated POP session can be issued from
 * a client-claimed challenge/code; Firebase proof exchange is required.
 */
export async function POST() {
  return Response.json(
    { ok: false, error: "FIREBASE_PHONE_AUTH_REQUIRED" },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}

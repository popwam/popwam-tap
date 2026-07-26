/**
 * Compatibility tombstone. Android SMS initiation moved to Firebase Phone
 * Auth; this endpoint must never send a second provider message.
 */
export async function POST() {
  return Response.json(
    { ok: false, error: "FIREBASE_PHONE_AUTH_REQUIRED" },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}

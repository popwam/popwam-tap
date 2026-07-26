/** Linking now occurs only inside verified Firebase phone proof resolution. */
export async function POST() {
  return Response.json(
    { ok: false, error: "FIREBASE_PHONE_PROOF_EXCHANGE_REQUIRED" },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}

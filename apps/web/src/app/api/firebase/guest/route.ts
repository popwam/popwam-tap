/** Anonymous Firebase Authentication is retired. This compatibility route is inert. */
export async function POST() {
  return Response.json(
    { ok: false, error: "FIREBASE_ANONYMOUS_AUTH_RETIRED" },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}

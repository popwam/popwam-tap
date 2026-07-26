export async function GET() {
  return Response.json(
    { channels: [], primary: "firebase" },
    { headers: { "cache-control": "no-store" } },
  );
}

import { authorizeEnrollment, enrollmentErrorResponse, enrollmentView } from "@/lib/mobile-enrollment";

export async function GET(request: Request) {
  try {
    const { record } = await authorizeEnrollment(request);
    return Response.json({ ok: true, ...enrollmentView(record) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return enrollmentErrorResponse(error);
  }
}


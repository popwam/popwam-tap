import { prisma } from "@popwam/db";
import { authorizeEnrollment, enrollmentErrorResponse } from "@/lib/mobile-enrollment";

export async function POST(request: Request) {
  try {
    const { record } = await authorizeEnrollment(request);
    await prisma.$transaction(async tx => {
      await tx.mobileEnrollmentSession.updateMany({ where: { id: record.id, completedAt: null }, data: { state: "ABORTED", abortedAt: new Date() } });
      await tx.mobileAuthChallenge.updateMany({ where: { id: record.challengeId, consumedAt: null }, data: { state: "REVOKED", revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: record.userId, operation: "auth.mobile_enrollment.aborted" } });
    });
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return enrollmentErrorResponse(error);
  }
}


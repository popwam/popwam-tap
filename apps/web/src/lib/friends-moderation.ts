import { UserReportStatus, prisma } from "@popwam/db";

const moderationStatuses = new Set<UserReportStatus>(["OPEN", "REVIEWING", "ACTIONED", "DISMISSED", "RESOLVED"]);

export function parseModerationStatus(value: unknown) {
  return typeof value === "string" && moderationStatuses.has(value as UserReportStatus)
    ? value as UserReportStatus
    : null;
}

export async function listUserReportsForModeration(cursor?: string | null) {
  return prisma.userReport.findMany({
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: 51,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      category: true,
      status: true,
      createdAt: true,
      reporter: { select: { name: true, username: true } },
      subject: { select: { name: true, username: true } },
      targetProfile: { select: { slug: true } },
    },
  });
}

export async function getUserReportForModeration(reportId: string) {
  if (!/^[a-z0-9_-]{10,100}$/i.test(reportId)) return null;
  return prisma.userReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      category: true,
      details: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      reviewNote: true,
      resolutionCode: true,
      reporter: { select: { name: true, username: true } },
      subject: { select: { name: true, username: true } },
      targetProfile: { select: { slug: true } },
      reviewedBy: { select: { name: true, username: true } },
    },
  });
}

export async function updateUserReportModeration(
  adminId: string,
  reportId: string,
  input: { status: UserReportStatus; reviewNote?: string | null; resolutionCode?: string | null },
) {
  if (!moderationStatuses.has(input.status)) throw new Error("REPORT_STATUS_INVALID");
  const reviewNote = input.reviewNote?.trim().slice(0, 2_000) || null;
  const resolutionCode = input.resolutionCode?.trim().replace(/[^A-Z0-9_-]/gi, "").slice(0, 64).toUpperCase() || null;
  return prisma.$transaction(async tx => {
    const report = await tx.userReport.update({
      where: { id: reportId },
      data: {
        status: input.status,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNote,
        resolutionCode,
      },
      select: { id: true, status: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        operation: "moderation.user_report.updated",
        targetId: report.id,
        metadata: { status: report.status, resolutionCode },
      },
    });
    return report;
  });
}

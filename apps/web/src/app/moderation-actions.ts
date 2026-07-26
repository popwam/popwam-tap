"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { parseModerationStatus, updateUserReportModeration } from "@/lib/friends-moderation";

export async function updateUserReport(data: FormData) {
  const admin = await requireAdmin();
  const reportId = String(data.get("reportId") || "");
  const status = parseModerationStatus(data.get("status"));
  if (!status) throw new Error("REPORT_STATUS_INVALID");
  await updateUserReportModeration(admin.id, reportId, {
    status,
    reviewNote: String(data.get("reviewNote") || ""),
    resolutionCode: String(data.get("resolutionCode") || ""),
  });
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/reports/users/${reportId}`);
}

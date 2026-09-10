"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { reviewQuotaIncreaseRequest } from "@/lib/quota-requests";

export async function reviewQuotaRequest(data: FormData) {
  const admin = await requireAdmin();
  const requestId = String(data.get("requestId") || "");
  const status = String(data.get("status") || "");
  if (!requestId || !["APPROVED", "REJECTED"].includes(status)) throw new Error("QUOTA_REVIEW_INVALID");
  const result = await reviewQuotaIncreaseRequest({
    requestId,
    adminId: admin.id,
    status: status as "APPROVED" | "REJECTED",
    adminNote: String(data.get("adminNote") || ""),
  });
  revalidatePath("/admin/quota-requests");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/users/${result.request.userId}`);
}

import { prisma } from "@popwam/db";
import { getActivationQrValue } from "@popwam/shared";
import { getApiUser } from "@/lib/api-auth";
import { isAdminRole } from "@/lib/admin-access";
import { csvCell, openActivationCode } from "@/lib/card-tokens";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getApiUser();
  if (!admin || !isAdminRole(admin.role)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const batch = await prisma.productionBatch.findFirst({
    where: { OR: [{ id }, { legacyCardBatchId: id }] },
    include: { tags: { include: { card: { select: { serialNumber: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!batch) return Response.json({ error: "BATCH_NOT_FOUND" }, { status: 404 });
  const header = ["serialNumber","batchCode","permanentUrl","activationCode","activationUrl","assignmentStatus"];
  const rows = batch.tags.map(tag => { const disabled = tag.activationCode.startsWith("legacy-disabled:"); const activationCode = disabled ? "DISABLED" : openActivationCode(tag.activationCode); return [tag.card?.serialNumber, batch.batchCode, tag.permanentUrl, activationCode, disabled ? "" : getActivationQrValue(activationCode), tag.status]; });
  const csv = `\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${batch.batchCode}.csv"`, "cache-control": "no-store, private" } });
}

import { Prisma, prisma } from "@popwam/db";
import { csrfRejected, getApiUser, isSameOriginMutation } from "@/lib/api-auth";
import { isAdminRole } from "@/lib/admin-access";
import { csvCell, openActivationCode } from "@/lib/card-tokens";

const batchInclude = {
  tags: {
    include: { card: { select: { serialNumber: true, publicSlug: true, activationSecretState: true } } },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ProductionBatchInclude;

type ExportBatch = Prisma.ProductionBatchGetPayload<{ include: typeof batchInclude }>;

async function adminUser() {
  const user = await getApiUser();
  return user && isAdminRole(user.role) ? user : null;
}

function csvResponse(batch: ExportBatch, allowScratch: boolean) {
  const app = (process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "https://go.popwam.com").replace(/\/$/, "");
  const header = ["serialNumber", "batchCode", "permanentUrl", "activationIdentifierUrl", "scratchCode", "activationPolicy", "assignmentStatus"];
  const rows = batch.tags.map(tag => {
    const scratch = allowScratch && tag.scratchSecretExportCiphertext
      ? openActivationCode(tag.scratchSecretExportCiphertext)
      : "";
    const legacy = !tag.activationCode.startsWith("legacy-disabled:");
    const legacyCode = legacy ? openActivationCode(tag.activationCode) : "";
    return [
      tag.card?.serialNumber,
      batch.batchCode,
      tag.permanentUrl,
      tag.card?.publicSlug ? `${app}/activate/card/${encodeURIComponent(tag.card.publicSlug)}` : "",
      scratch || legacyCode || "ALREADY_EXPORTED",
      scratch ? "SCRATCH_V1" : legacy ? "LEGACY_TOKEN" : "SCRATCH_EXPORTED",
      tag.status,
    ];
  });
  const csv = `\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, { headers: {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${batch.batchCode}.csv"`,
    "cache-control": "no-store, private",
  } });
}

/** Legacy CSV remains read-only compatible. New scratch batches require an
 * explicit same-origin POST so browser/link prefetch cannot consume secrets. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminUser();
  if (!admin) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const batch = await prisma.productionBatch.findFirst({
    where: { OR: [{ id }, { legacyCardBatchId: id }] },
    include: batchInclude,
  });
  if (!batch) return Response.json({ error: "BATCH_NOT_FOUND" }, { status: 404 });
  if (batch.tags.some(tag => tag.activationSecretVersion)) {
    return Response.json({ error: "EXPLICIT_ONE_TIME_EXPORT_REQUIRED" }, { status: 405, headers: { allow: "POST", "cache-control": "no-store" } });
  }
  return csvResponse(batch, false);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const admin = await adminUser();
  if (!admin) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const batch = await prisma.$transaction(async tx => {
    const match = await tx.productionBatch.findFirst({
      where: { OR: [{ id }, { legacyCardBatchId: id }] },
      select: { id: true },
    });
    if (!match) return null;
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ProductionBatch" WHERE "id" = ${match.id} FOR UPDATE`);
    const candidate = await tx.productionBatch.findUnique({ where: { id: match.id }, include: batchInclude });
    if (!candidate) return null;
    const exportable = candidate.tags.filter(tag => tag.scratchSecretExportCiphertext && !tag.scratchSecretExportedAt);
    if (exportable.length) {
      const consumed = await tx.producedTag.updateMany({
        where: {
          id: { in: exportable.map(tag => tag.id) },
          scratchSecretExportedAt: null,
          scratchSecretExportCiphertext: { not: null },
        },
        data: { scratchSecretExportedAt: new Date(), scratchSecretExportCiphertext: null },
      });
      if (consumed.count !== exportable.length) throw new Error("SCRATCH_EXPORT_CONFLICT");
      await tx.auditLog.create({
        data: { actorId: admin.id, operation: "admin.activation_scratch.exported", targetId: candidate.id, metadata: { count: exportable.length, version: 1 } },
      });
    }
    return candidate;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return batch ? csvResponse(batch, true) : Response.json({ error: "BATCH_NOT_FOUND" }, { status: 404 });
}

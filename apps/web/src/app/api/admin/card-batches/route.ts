import { CardType, Prisma, prisma } from "@popwam/db";
import { csrfRejected, getApiUser, isSameOriginMutation } from "@/lib/api-auth";
import { isAdminRole } from "@/lib/admin-access";
import { createOpaqueToken, csvCell, hashActivationToken, MAX_BATCH_QUANTITY, normalizeBatchPrefix } from "@/lib/card-tokens";
import { getActivationQrValue, getPermanentCardUrl } from "@popwam/shared";

const value = (form: FormData, key: string) => String(form.get(key) || "").trim();
const money = (form: FormData, key: string) => {
  const raw = value(form, key) || "0";
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(raw)) throw new Error("INVALID_MONEY");
  return new Prisma.Decimal(raw);
};

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const admin = await getApiUser();
  if (!admin || !isAdminRole(admin.role)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const form = await request.formData();
  const name = value(form, "name");
  const quantity = Number(value(form, "quantity"));
  const startingSerialNumber = Number(value(form, "startingSerialNumber"));
  const cardType = value(form, "cardType") as CardType;
  if (!name || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_BATCH_QUANTITY || !Number.isSafeInteger(startingSerialNumber) || startingSerialNumber < 0 || !Object.values(CardType).includes(cardType)) {
    return Response.json({ error: "INVALID_BATCH", maxQuantity: MAX_BATCH_QUANTITY }, { status: 400 });
  }
  const serialPrefix = value(form, "serialPrefix").toUpperCase().replace(/[^A-Z0-9-]/g, "") || "PW";
  const publicSlugPrefix = normalizeBatchPrefix(value(form, "publicSlugPrefix"), "pw");
  const supplierId = value(form, "supplierId") || null;
  const inventoryItemId = value(form, "inventoryItemId") || null;
  const width = Math.max(6, String(startingSerialNumber + quantity - 1).length);
  const rows = Array.from({ length: quantity }, (_, index) => {
    const sequence = startingSerialNumber + index;
    const suffix = String(sequence).padStart(width, "0");
    const activationToken = createOpaqueToken();
    return { serialNumber: `${serialPrefix}${suffix}`, publicSlug: `${publicSlugPrefix}${suffix}`, publicToken: createOpaqueToken(24), activationToken, activationTokenHash: hashActivationToken(activationToken) };
  });
  try {
    const batch = await prisma.$transaction(async (tx) => {
      if (inventoryItemId) {
        const stock = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
        if (!stock || stock.quantityOnHand - stock.quantityReserved < quantity) throw new Error("INSUFFICIENT_STOCK");
        const updated = await tx.inventoryItem.updateMany({ where: { id: inventoryItemId, quantityOnHand: { gte: quantity } }, data: { quantityOnHand: { decrement: quantity } } });
        if (updated.count !== 1) throw new Error("INSUFFICIENT_STOCK");
      }
      const created = await tx.cardBatch.create({ data: {
        name, supplierId, inventoryItemId, cardType, quantity, serialPrefix, startingSerialNumber, publicSlugPrefix,
        unitPurchaseCost: money(form, "unitPurchaseCost"), unitProgrammingCost: money(form, "unitProgrammingCost"),
        unitPackagingCost: money(form, "unitPackagingCost"), expectedSellingPrice: money(form, "expectedSellingPrice"),
        notes: value(form, "notes") || null, createdBy: admin.id,
        cards: { create: rows.map(({ activationToken: _plain, ...card }) => ({ ...card, cardType })) },
      }});
      if (inventoryItemId) await tx.inventoryMovement.create({ data: { inventoryItemId, type: "CARD_BATCH_CREATED", quantity: -quantity, referenceType: "CARD_BATCH", referenceId: created.id, notes: `Generated ${name}`, createdBy: admin.id } });
      await tx.auditLog.create({ data: { actorId: admin.id, operation: "admin.card_batch.create", targetId: created.id, metadata: { quantity, cardType } } });
      return created;
    }, { isolationLevel: "Serializable" });
    const header = ["serialNumber","publicSlug","permanentUrl","activationToken","activationQrValue","cardType","batchName","status"];
    const csvRows = rows.map(row => [row.serialNumber,row.publicSlug,getPermanentCardUrl(row.publicSlug),row.activationToken,getActivationQrValue(row.activationToken),cardType,batch.name,"AVAILABLE"]);
    const csv = `\uFEFF${[header, ...csvRows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, { status: 201, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${publicSlugPrefix}-${batch.id}-activation.csv"`, "cache-control": "no-store, private" } });
  } catch (error) {
    const code = error instanceof Error && error.message === "INSUFFICIENT_STOCK" ? "INSUFFICIENT_STOCK" : "BATCH_CREATE_FAILED";
    console.error("card batch creation failed", { operation: "card_batch.create", adminId: admin.id, code, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: code }, { status: code === "INSUFFICIENT_STOCK" ? 409 : 400 });
  }
}

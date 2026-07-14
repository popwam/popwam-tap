import { CardType, Prisma, prisma } from "@popwam/db";
import { csrfRejected, getApiUser, isSameOriginMutation } from "@/lib/api-auth";
import { isAdminRole } from "@/lib/admin-access";
import {
  MAX_BATCH_QUANTITY,
  normalizeBatchPrefix,
  sealActivationCode,
} from "@/lib/card-tokens";
import { createProductionRows } from "@/lib/production";

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
  const batchCode = value(form, "batchCode").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const productId = value(form, "inventoryItemId");
  const quantity = Number(value(form, "quantity"));
  const startingSerialNumber = Number(value(form, "startingSerialNumber"));
  const cardType = value(form, "cardType") as CardType;
  if (!name || batchCode.length < 3 || !productId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_BATCH_QUANTITY || !Number.isSafeInteger(startingSerialNumber) || startingSerialNumber < 0 || !Object.values(CardType).includes(cardType)) {
    return Response.json({ error: "INVALID_BATCH", maxQuantity: MAX_BATCH_QUANTITY }, { status: 400 });
  }
  const serialPrefix = value(form, "serialPrefix").toUpperCase().replace(/[^A-Z0-9-]/g, "") || "PW";
  const publicSlugPrefix = normalizeBatchPrefix(value(form, "publicSlugPrefix"), "pw");
  const supplierId = value(form, "supplierId") || null;
  const rows = createProductionRows({ quantity, startingSerialNumber, serialPrefix, publicSlugPrefix });
  try {
    const unitPurchaseCost = money(form, "unitPurchaseCost");
    const unitProgrammingCost = money(form, "unitProgrammingCost");
    const unitPackagingCost = money(form, "unitPackagingCost");
    const producedUnitCost = unitPurchaseCost.plus(unitProgrammingCost).plus(unitPackagingCost);
    const batch = await prisma.$transaction(async tx => {
      const stock = await tx.inventoryItem.findUnique({ where: { id: productId } });
      if (!stock || stock.quantityOnHand - stock.quantityReserved < quantity) throw new Error("INSUFFICIENT_STOCK");
      const updated = await tx.inventoryItem.updateMany({ where: { id: productId, quantityOnHand: { gte: quantity } }, data: { quantityOnHand: { decrement: quantity } } });
      if (updated.count !== 1) throw new Error("INSUFFICIENT_STOCK");

      const legacyBatch = await tx.cardBatch.create({ data: {
        name, supplierId, inventoryItemId: productId, cardType, quantity, serialPrefix, startingSerialNumber, publicSlugPrefix,
        unitPurchaseCost, unitProgrammingCost, unitPackagingCost,
        expectedSellingPrice: money(form, "expectedSellingPrice"), notes: value(form, "notes") || null, createdBy: admin.id,
      } });
      const productionBatch = await tx.productionBatch.create({ data: { batchCode, productId, quantity, status: "GENERATED", createdById: admin.id, legacyCardBatchId: legacyBatch.id } });
      const cards = await tx.card.createManyAndReturn({
        data: rows.map(row => ({ serialNumber: row.serialNumber, publicSlug: row.publicSlug, publicToken: row.immutableToken, activationTokenHash: row.activationTokenHash, cardType, batchId: legacyBatch.id })),
        select: { id: true, publicSlug: true },
      });
      const cardIdBySlug = new Map(cards.map(card => [card.publicSlug, card.id]));
      await tx.producedTag.createMany({ data: rows.map(row => ({
        batchId: productionBatch.id,
        cardId: cardIdBySlug.get(row.publicSlug),
        immutableToken: row.immutableToken,
        shortCode: row.publicSlug,
        permanentUrl: row.permanentUrl,
        activationCode: sealActivationCode(row.activationCode),
        activationTokenHash: row.activationTokenHash,
      })) });
      await tx.inventoryBatch.create({ data: { productId, batchCode, producedQuantity: quantity, availableQuantity: quantity, unitCost: producedUnitCost } });
      await tx.inventoryMovement.create({ data: { inventoryItemId: productId, type: "CARD_BATCH_CREATED", quantity: -quantity, unitCost: producedUnitCost, referenceType: "PRODUCTION_BATCH", referenceId: productionBatch.id, notes: `Generated ${batchCode}`, createdBy: admin.id } });
      await tx.auditLog.create({ data: { actorId: admin.id, operation: "admin.production_batch.create", targetId: productionBatch.id, metadata: { batchCode, quantity, cardType, legacyCardBatchId: legacyBatch.id } } });
      return legacyBatch;
    }, { isolationLevel: "Serializable" });
    return new Response(null, { status: 303, headers: { location: `/admin/cards/batches/${batch.id}`, "cache-control": "no-store, private" } });
  } catch (error) {
    const code = error instanceof Error && error.message === "INSUFFICIENT_STOCK" ? "INSUFFICIENT_STOCK" : "BATCH_CREATE_FAILED";
    console.error("production batch creation failed", { operation: "production_batch.create", adminId: admin.id, code, error: error instanceof Error ? error.name : "unknown" });
    return Response.json({ error: code }, { status: code === "INSUFFICIENT_STOCK" ? 409 : 400 });
  }
}

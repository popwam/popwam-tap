import { randomBytes } from "node:crypto";
import { CardType, prisma } from "@popwam/db";
import { csrfRejected, getApiUser, isSameOriginMutation } from "@/lib/api-auth";
import { isAdminRole } from "@/lib/admin-access";
import {
  MAX_BATCH_QUANTITY,
  sealActivationCode,
} from "@/lib/card-tokens";
import { cardTypeForInventoryItem, createProductionRows, serialPrefixForProduct } from "@/lib/production";

const value = (form: FormData, key: string) => String(form.get(key) || "").trim();
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const admin = await getApiUser();
  if (!admin || !isAdminRole(admin.role)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const form = await request.formData();
  const productId = value(form, "inventoryItemId");
  const quantity = Number(value(form, "quantity"));
  if (!productId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_BATCH_QUANTITY) {
    return Response.json({ error: "INVALID_BATCH", maxQuantity: MAX_BATCH_QUANTITY }, { status: 400 });
  }
  const dateCode = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const batchCode = `PB-${dateCode}-${randomBytes(3).toString("hex").toUpperCase()}`;
  try {
    const batch = await prisma.$transaction(async tx => {
      const stock = await tx.inventoryItem.findUnique({ where: { id: productId } });
      if (!stock || stock.quantityOnHand - stock.quantityReserved < quantity) throw new Error("INSUFFICIENT_STOCK");
      const updated = await tx.inventoryItem.updateMany({ where: { id: productId, quantityOnHand: { gte: quantity } }, data: { quantityOnHand: { decrement: quantity } } });
      if (updated.count !== 1) throw new Error("INSUFFICIENT_STOCK");

      const startingSerialNumber = await tx.card.count() + 1;
      const serialPrefix = serialPrefixForProduct(stock.sku);
      const publicSlugPrefix = "c-";
      const cardType = cardTypeForInventoryItem(stock.type) as CardType;
      const rows = createProductionRows({ quantity, startingSerialNumber, serialPrefix, publicSlugPrefix });

      const legacyBatch = await tx.cardBatch.create({ data: {
        name: `${stock.nameEn} · ${batchCode}`,
        inventoryItemId: productId,
        cardType,
        quantity,
        serialPrefix,
        startingSerialNumber,
        publicSlugPrefix,
        unitPurchaseCost: stock.unitCost,
        expectedSellingPrice: stock.sellingPrice,
        notes: value(form, "notes") || null,
        createdBy: admin.id,
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
      await tx.inventoryBatch.create({ data: { productId, batchCode, producedQuantity: quantity, availableQuantity: quantity, unitCost: stock.unitCost } });
      await tx.inventoryMovement.create({ data: { inventoryItemId: productId, type: "CARD_BATCH_CREATED", quantity: -quantity, unitCost: stock.unitCost, referenceType: "PRODUCTION_BATCH", referenceId: productionBatch.id, notes: `Generated ${batchCode}`, createdBy: admin.id } });
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

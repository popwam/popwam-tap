import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const publicBase = (process.env.NEXT_PUBLIC_APP_URL || "https://go.popwam.com").replace(/\/$/, "");

const movementDelta = (type: string, quantity: number) => {
  if (["PURCHASE", "PRODUCTION", "RETURN", "RETURNED", "ADJUSTMENT_IN"].includes(type)) return Math.abs(quantity);
  if (["ASSIGNMENT", "SALE", "SOLD", "DAMAGE", "DAMAGED", "LOST", "RESERVED", "ADJUSTMENT_OUT", "CARD_BATCH_CREATED"].includes(type)) return -Math.abs(quantity);
  return quantity;
};

async function main() {
  let virtualCards = 0, producedTags = 0, inventoryItems = 0;
  const profiles = await prisma.profile.findMany({ orderBy: [{ userId: "asc" }, { createdAt: "asc" }] });
  const defaultSeen = new Set<string>();
  for (const profile of profiles) {
    const existing = await prisma.virtualCard.findUnique({ where: { profileId: profile.id } });
    if (!existing) {
      await prisma.virtualCard.create({ data: { userId: profile.userId, organizationId: profile.organizationId, name: profile.displayName, type: profile.type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL", profileId: profile.id, isDefault: !defaultSeen.has(profile.userId) } });
      virtualCards++;
    }
    defaultSeen.add(profile.userId);
  }
  const virtualByProfile = new Map((await prisma.virtualCard.findMany({ select: { id: true, profileId: true } })).map(card => [card.profileId, card.id]));
  const cards = await prisma.card.findMany({ include: { batch: true, producedTag: true } });
  for (const card of cards) {
    if (card.profileId && !card.virtualCardId) await prisma.card.update({ where: { id: card.id }, data: { virtualCardId: virtualByProfile.get(card.profileId) } });
    if (card.producedTag || !card.batch?.inventoryItemId) continue;
    const batchCode = `LEGACY-${card.batch.id}`;
    const production = await prisma.productionBatch.upsert({ where: { legacyCardBatchId: card.batch.id }, update: {}, create: { batchCode, productId: card.batch.inventoryItemId, quantity: card.batch.quantity, status: "CLOSED", createdById: card.batch.createdBy, legacyCardBatchId: card.batch.id } });
    await prisma.producedTag.create({ data: { batchId: production.id, cardId: card.id, immutableToken: card.publicToken, shortCode: card.publicSlug, permanentUrl: `${publicBase}/${card.publicSlug}`, activationCode: `legacy-disabled:${card.id}`, activationTokenHash: card.activationTokenHash, status: card.ownerId ? "ASSIGNED" : card.inventoryStatus === "DAMAGED" ? "DAMAGED" : card.cardStatus === "DISABLED" ? "DISABLED" : "UNASSIGNED", assignedUserId: card.ownerId, activatedAt: card.activatedAt } });
    producedTags++;
  }
  const [items, movements] = await Promise.all([prisma.inventoryItem.findMany(), prisma.inventoryMovement.findMany({ select: { inventoryItemId: true, type: true, quantity: true } })]);
  for (const item of items) {
    const quantity = movements.filter(move => move.inventoryItemId === item.id).reduce((sum, move) => sum + movementDelta(move.type, move.quantity), 0);
    if (quantity >= 0 && quantity !== item.quantityOnHand) { await prisma.inventoryItem.update({ where: { id: item.id }, data: { quantityOnHand: quantity } }); inventoryItems++; }
  }
  const planRules = { free: [1, false, false, false], personal: [2, false, true, false], pro: [3, false, true, true], business: [25, true, true, true] } as const;
  for (const [slug, [maxVirtualCards, allowBusinessCards, allowWalletPasses, allowCustomLinks]] of Object.entries(planRules)) await prisma.plan.updateMany({ where: { slug }, data: { maxVirtualCards, allowBusinessCards, allowWalletPasses, allowCustomLinks } });
  console.info(`Tap upgrade backfill complete: ${virtualCards} virtual cards, ${producedTags} produced tags, ${inventoryItems} inventory caches reconciled.`);
}

main().catch(error => { console.error("Tap upgrade backfill failed", error instanceof Error ? error.message : "Unknown error"); process.exit(1); }).finally(() => prisma.$disconnect());

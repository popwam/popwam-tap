"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CardStatus, DestinationType, InventoryItemType, InventoryMovementType, Prisma, prisma } from "@popwam/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { assertWithinLimit } from "@/lib/plans";
import { parseMoney } from "@/lib/money";
import { calculateInventoryByProduct } from "@/lib/inventory";
import { isSafeDestinationUrl, normalizeAndValidate } from "@/lib/url";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;
const number = (data: FormData, key: string) => Number(text(data, key) || 0);
const money = (data: FormData, key: string) => parseMoney(text(data, key), key);

async function syncProducedTagAssignment(tx: Prisma.TransactionClient, cardId: string, ownerId: string | null) {
  const produced = await tx.producedTag.findUnique({ where: { cardId }, include: { batch: { select: { batchCode: true } } } });
  if (!produced) return;
  const wasAssigned = produced.status === "ASSIGNED" || produced.status === "ACTIVATED";
  if (ownerId) {
    if (!wasAssigned) await tx.inventoryBatch.updateMany({ where: { batchCode: produced.batch.batchCode, availableQuantity: { gt: 0 } }, data: { availableQuantity: { decrement: 1 }, assignedQuantity: { increment: 1 } } });
    await tx.producedTag.update({ where: { id: produced.id }, data: { status: "ASSIGNED", assignedUserId: ownerId } });
  } else {
    if (wasAssigned) await tx.inventoryBatch.updateMany({ where: { batchCode: produced.batch.batchCode, assignedQuantity: { gt: 0 } }, data: { availableQuantity: { increment: 1 }, assignedQuantity: { decrement: 1 } } });
    await tx.producedTag.update({ where: { id: produced.id }, data: { status: "UNASSIGNED", assignedUserId: null, activatedAt: null } });
  }
}

export async function createInventoryItem(data: FormData) {
  const admin = await requireAdmin(); const type = text(data, "type") as InventoryItemType;
  if (!text(data, "sku") || !text(data, "nameAr") || !text(data, "nameEn") || !Object.values(InventoryItemType).includes(type)) throw new Error("INVENTORY_ITEM_INVALID");
  const quantityOnHand = Math.max(0, Math.trunc(number(data, "quantityOnHand"))); const unitCost = money(data, "unitCost");
  const imageUrl=optional(data,"imageUrl");if(imageUrl&&!isSafeDestinationUrl(imageUrl))throw new Error("INVALID_URL");
  await prisma.$transaction(async tx => {
    const item = await tx.inventoryItem.create({ data: { sku: text(data, "sku").toUpperCase(), nameAr: text(data, "nameAr"), nameEn: text(data, "nameEn"), type, quantityOnHand, reorderLevel: Math.max(0, Math.trunc(number(data, "reorderLevel"))), unitCost, sellingPrice: money(data, "sellingPrice"),imageUrl,isActive:data.get("isActive")==="on" } });
    if (quantityOnHand > 0) await tx.inventoryMovement.create({ data: { inventoryItemId: item.id, type: "ADJUSTMENT_IN", quantity: quantityOnHand, unitCost, referenceType: "OPENING_BALANCE", referenceId: item.id, notes: "Opening inventory balance", createdBy: admin.id } });
    await tx.auditLog.create({ data: { actorId: admin.id, operation: "admin.inventory_item.create", targetId: item.id, metadata: { openingQuantity: quantityOnHand } } });
  }); revalidatePath("/admin/inventory"); revalidatePath("/admin/inventory/items");
}

export async function adjustInventory(data: FormData) {
  const admin = await requireAdmin(); const inventoryItemId = text(data, "inventoryItemId"); const type = text(data, "type") as InventoryMovementType; const raw = Math.trunc(number(data, "quantity"));
  if (!Object.values(InventoryMovementType).includes(type) || (type === "ADJUSTMENT" ? raw === 0 : raw <= 0)) throw new Error("INVENTORY_ADJUSTMENT_INVALID");
  const incoming = ["PURCHASE","PRODUCTION","RETURN","RETURNED","ADJUSTMENT_IN"].includes(type);
  const outgoing = ["ASSIGNMENT","SALE","SOLD","DAMAGE","DAMAGED","LOST","RESERVED","ADJUSTMENT_OUT","CARD_BATCH_CREATED"].includes(type);
  const delta = type === "ADJUSTMENT" ? raw : incoming ? Math.abs(raw) : outgoing ? -Math.abs(raw) : raw;
  await prisma.$transaction(async tx => {
    const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } }); if (!item) throw new Error("INVENTORY_ITEM_NOT_FOUND");
    if (item.quantityOnHand + delta < item.quantityReserved) throw new Error("STOCK_CANNOT_BE_NEGATIVE");
    await tx.inventoryItem.update({ where: { id: item.id }, data: { quantityOnHand: { increment: delta } } });
    const unitCost = text(data, "unitCost") ? money(data, "unitCost") : null;
    await tx.inventoryMovement.create({ data: { inventoryItemId, type, quantity: delta, unitCost, notes: optional(data, "notes"), createdBy: admin.id } });
    await tx.auditLog.create({ data: { actorId: admin.id, operation: "admin.inventory.adjust", targetId: item.id, metadata: { type, delta } } });
  }, { isolationLevel: "Serializable" }); revalidatePath("/admin/inventory"); revalidatePath("/admin/inventory/movements");
}

export async function reconcileInventory() {
  const admin = await requireAdmin();
  await prisma.$transaction(async tx => {
    const [items, movements] = await Promise.all([
      tx.inventoryItem.findMany({ select: { id: true, quantityOnHand: true } }),
      tx.inventoryMovement.findMany({ select: { inventoryItemId: true, type: true, quantity: true } }),
    ]);
    const balances = calculateInventoryByProduct(movements.map(movement => ({
      productId: movement.inventoryItemId,
      type: movement.type,
      quantity: movement.quantity,
    })));
    const differences: Array<{ productId: string; from: number; to: number }> = [];
    for (const item of items) {
      const ledgerQuantity = balances.get(item.id) ?? 0;
      if (ledgerQuantity < 0) throw new Error("INVENTORY_LEDGER_NEGATIVE");
      if (ledgerQuantity !== item.quantityOnHand) {
        differences.push({ productId: item.id, from: item.quantityOnHand, to: ledgerQuantity });
        await tx.inventoryItem.update({ where: { id: item.id }, data: { quantityOnHand: ledgerQuantity } });
      }
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        operation: "admin.inventory.reconcile",
        metadata: { changedProducts: differences.length, differences },
      },
    });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/movements");
}

export async function updateCardState(data: FormData) {
  const admin=await requireAdmin();const id=text(data,"cardId");const action=text(data,"cardAction");const card=await prisma.card.findUnique({where:{id}});if(!card)throw new Error("CARD_NOT_FOUND");
  if(action==="damaged"){
    await prisma.$transaction(async tx=>{
      const produced=await tx.producedTag.findUnique({where:{cardId:id},include:{batch:{select:{batchCode:true}}}});
      await tx.card.update({where:{id},data:{cardStatus:"DISABLED",inventoryStatus:"DAMAGED"}});
      if(produced&&produced.status!=="DAMAGED"){
        const wasAvailable=produced.status==="UNASSIGNED"||produced.status==="RESERVED";
        const wasAssigned=produced.status==="ASSIGNED"||produced.status==="ACTIVATED";
        await tx.inventoryBatch.updateMany({where:{batchCode:produced.batch.batchCode},data:{damagedQuantity:{increment:1},...(wasAvailable?{availableQuantity:{decrement:1}}:{}),...(wasAssigned?{assignedQuantity:{decrement:1}}:{})}});
        await tx.producedTag.update({where:{id:produced.id},data:{status:"DAMAGED"}});
      }
      await tx.auditLog.create({data:{actorId:admin.id,operation:"admin.card.damaged",targetId:id}});
    },{isolationLevel:"Serializable"});
    revalidatePath("/admin/cards");revalidatePath(`/admin/cards/${id}`);return;
  }
  const statusMap:Record<string,CardStatus>={pause:"PAUSED",restore:"ACTIVE",lost:"LOST",disable:"DISABLED",archive:"ARCHIVED"};const status=statusMap[action];if(!status)throw new Error("CARD_ACTION_INVALID");
  await prisma.card.update({where:{id},data:{cardStatus:status,...(action==="lost"?{inventoryStatus:"LOST"}:{}),...(action==="restore"&&card.inventoryStatus==="LOST"?{inventoryStatus:card.ownerId?"ASSIGNED":"AVAILABLE"}: {})}});await prisma.auditLog.create({data:{actorId:admin.id,operation:`admin.card.${action}`,targetId:id}});revalidatePath("/admin/cards");revalidatePath(`/admin/cards/${id}`);
}

export async function updateOwnedCard(data: FormData){const user=await requireUser();const id=text(data,"cardId");const card=await prisma.card.findFirst({where:{id,ownerId:user.id}});if(!card)throw new Error("CARD_NOT_FOUND");const requested=text(data,"cardStatus");if(requested==="LOST")throw new Error("STEP_UP_REQUIRED");const allowed=["ACTIVE","PAUSED"] as const;const cardStatus=allowed.includes(requested as typeof allowed[number])?requested as typeof allowed[number]:card.cardStatus;const activeDestinationId=optional(data,"activeDestinationId");if(activeDestinationId&&!await prisma.destination.findFirst({where:{id:activeDestinationId,userId:user.id,isActive:true}}))throw new Error("DESTINATION_NOT_FOUND");await prisma.card.update({where:{id},data:{cardStatus,activeDestinationId}});await prisma.auditLog.create({data:{actorId:user.id,operation:"card.update",targetId:id}});revalidatePath("/dashboard/tags");revalidatePath(`/dashboard/tags/${id}`);revalidatePath(`/${card.publicSlug}`);}

export async function createAdminUserDestination(data: FormData) {
  const admin = await requireAdmin();
  const userId = text(data, "userId");
  const profileId = text(data, "profileId");
  const type = text(data, "type") as DestinationType;
  const title = text(data, "title");
  if (!title || !Object.values(DestinationType).includes(type)) throw new Error("DESTINATION_INVALID");
  const profile = await prisma.profile.findFirst({ where: { id: profileId, userId }, select: { id: true } });
  if (!profile) throw new Error("PROFILE_NOT_FOUND");
  const normalized = type === "PROFILE" ? { valid: true as const, url: `/p/id/${profile.id}` } : normalizeAndValidate(type, text(data, "url"));
  if (!normalized.valid) throw new Error("INVALID_URL");
  await assertWithinLimit(userId, "links");
  const sortOrder = await prisma.destination.count({ where: { profileId } });
  const destination = await prisma.destination.create({ data: { userId, profileId, title, titleAr: optional(data, "titleAr"), titleEn: optional(data, "titleEn"), type, url: normalized.url, customIconUrl: optional(data, "customIconUrl"), isActive: true, isVisible: true, sortOrder } });
  await prisma.auditLog.create({ data: { actorId: admin.id, operation: "admin.destination.create", targetId: destination.id, metadata: { userId, profileId } } });
  revalidatePath("/admin/links");
}

export async function assignCard(data: FormData) { const admin=await requireAdmin();const id=text(data,"cardId");const ownerId=text(data,"ownerId");await assertWithinLimit(ownerId,"cards");const profile=await prisma.profile.findFirst({where:{userId:ownerId,organizationId:null},include:{virtualCard:true}});const destination=profile?await prisma.destination.findFirst({where:{profileId:profile.id,type:"PROFILE",isActive:true}}):null;await prisma.$transaction(async tx=>{await tx.card.update({where:{id},data:{ownerId,profileId:profile?.id,virtualCardId:profile?.virtualCard?.id,activeDestinationId:destination?.id,assignmentStatus:"ADMIN_ASSIGNED",cardStatus:"ACTIVE",inventoryStatus:"ASSIGNED",assignedAt:new Date()}});await syncProducedTagAssignment(tx,id,ownerId);await tx.auditLog.create({data:{actorId:admin.id,operation:"admin.card.assign",targetId:id,metadata:{ownerId}}});},{isolationLevel:"Serializable"});revalidatePath("/admin/cards");revalidatePath("/admin/links");revalidatePath(`/admin/cards/${id}`); }
export async function unassignCard(data: FormData) { const admin=await requireAdmin();const id=text(data,"cardId");const card=await prisma.card.findUnique({where:{id}});if(!card)throw new Error("CARD_NOT_FOUND");await prisma.$transaction(async tx=>{await tx.card.update({where:{id},data:{ownerId:null,organizationId:null,profileId:null,virtualCardId:null,activeDestinationId:null,assignmentStatus:"UNASSIGNED",cardStatus:card.programmedAt?"PROGRAMMED":"CREATED",inventoryStatus:card.programmedAt?"PROGRAMMED":"AVAILABLE",assignedAt:null,activatedAt:null}});await syncProducedTagAssignment(tx,id,null);await tx.auditLog.create({data:{actorId:admin.id,operation:"admin.card.unassign",targetId:id}});},{isolationLevel:"Serializable"});revalidatePath("/admin/cards");revalidatePath("/admin/links");revalidatePath(`/admin/cards/${id}`); }

export async function deleteUserSafely(data: FormData) {
  const admin=await requireAdmin();const userId=text(data,"userId");const disposition=text(data,"cardDisposition");const targetUserId=optional(data,"reassignUserId");if(userId===admin.id)redirect(`/admin/users/${userId}?error=CANNOT_DELETE_SELF`);if(!["unassign","reassign","disable"].includes(disposition))redirect(`/admin/users/${userId}?error=CARD_DISPOSITION_REQUIRED`);if(disposition==="reassign"&&!targetUserId)redirect(`/admin/users/${userId}?error=REASSIGN_USER_REQUIRED`);if(disposition==="reassign"&&targetUserId){const ownedCards=await prisma.card.count({where:{ownerId:userId}});try{await assertWithinLimit(targetUserId,"cards",ownedCards);}catch{redirect(`/admin/users/${userId}?error=TARGET_CARD_LIMIT_REACHED`);}}
  try { await prisma.$transaction(async tx=>{
    const ownedCards=await tx.card.findMany({where:{ownerId:userId},select:{id:true}});
    if(disposition==="unassign")for(const card of ownedCards)await syncProducedTagAssignment(tx,card.id,null);
    if(disposition==="disable")for(const card of ownedCards){const produced=await tx.producedTag.findUnique({where:{cardId:card.id},include:{batch:{select:{batchCode:true}}}});if(produced){if(produced.status==="ASSIGNED"||produced.status==="ACTIVATED")await tx.inventoryBatch.updateMany({where:{batchCode:produced.batch.batchCode,assignedQuantity:{gt:0}},data:{assignedQuantity:{decrement:1}}});await tx.producedTag.update({where:{id:produced.id},data:{status:"DISABLED",assignedUserId:null}});}}
    if(disposition==="reassign"&&targetUserId)await tx.producedTag.updateMany({where:{cardId:{in:ownedCards.map(card=>card.id)}},data:{assignedUserId:targetUserId,status:"ASSIGNED"}});
    if(disposition==="unassign")await tx.card.updateMany({where:{ownerId:userId},data:{ownerId:null,organizationId:null,profileId:null,virtualCardId:null,activeDestinationId:null,assignmentStatus:"UNASSIGNED",cardStatus:"PROGRAMMED",inventoryStatus:"PROGRAMMED",assignedAt:null,activatedAt:null}});
    if(disposition==="disable")await tx.card.updateMany({where:{ownerId:userId},data:{ownerId:null,organizationId:null,profileId:null,virtualCardId:null,activeDestinationId:null,assignmentStatus:"REVOKED",cardStatus:"DISABLED"}});
    if(disposition==="reassign")await tx.card.updateMany({where:{ownerId:userId},data:{ownerId:targetUserId,organizationId:null,profileId:null,virtualCardId:null,activeDestinationId:null,assignmentStatus:"TRANSFERRED",assignedAt:new Date()}});
    await tx.tag.updateMany({where:{ownerId:userId},data:{ownerId:disposition==="reassign"&&targetUserId?targetUserId:admin.id,organizationId:null,profileId:null,activeDestinationId:null,status:disposition==="reassign"?"PAUSED":"DISABLED",mode:"REDIRECT"}});
    const organizations=await tx.organization.findMany({where:{ownerId:userId},select:{id:true}});for(const organization of organizations){await tx.organization.update({where:{id:organization.id},data:{ownerId:admin.id}});await tx.membership.upsert({where:{organizationId_userId:{organizationId:organization.id,userId:admin.id}},create:{organizationId:organization.id,userId:admin.id,role:"OWNER"},update:{role:"OWNER"}});}
    await tx.cardBatch.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});await tx.productionBatch.updateMany({where:{createdById:userId},data:{createdById:admin.id}});await tx.inventoryMovement.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});await tx.order.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});
    await tx.auditLog.create({data:{actorId:admin.id,operation:"admin.user.delete",targetId:userId,metadata:{cardDisposition:disposition,reassignUserId:targetUserId}}});await tx.user.delete({where:{id:userId}});
  }); } catch(error){console.error("safe user deletion failed",{operation:"admin.user.delete",adminId:admin.id,userId,error:error instanceof Error?error.name:"unknown"});redirect(`/admin/users/${userId}?error=DELETE_RELATION_CONFLICT`);}revalidatePath("/admin/users");redirect("/admin/users?deleted=1");
}

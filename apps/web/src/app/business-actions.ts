"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CardStatus, InventoryItemType, InventoryMovementType, OrderStatus, PaymentStatus, prisma, PurchaseStatus } from "@popwam/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { assertWithinLimit } from "@/lib/plans";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;
const number = (data: FormData, key: string) => Number(text(data, key) || 0);
const date = (data: FormData, key: string) => new Date(`${text(data, key)}T12:00:00.000Z`);

export async function createSupplier(data: FormData) {
  const admin = await requireAdmin(); const name = text(data, "name"); if (!name) throw new Error("SUPPLIER_NAME_REQUIRED");
  await prisma.supplier.create({ data: { name, contactName: optional(data, "contactName"), phone: optional(data, "phone"), email: optional(data, "email"), address: optional(data, "address"), notes: optional(data, "notes") } });
  await prisma.auditLog.create({ data: { actorId: admin.id, operation: "admin.supplier.create" } }); revalidatePath("/admin/suppliers");
}

export async function createInventoryItem(data: FormData) {
  const admin = await requireAdmin(); const type = text(data, "type") as InventoryItemType;
  if (!text(data, "sku") || !text(data, "nameAr") || !text(data, "nameEn") || !Object.values(InventoryItemType).includes(type)) throw new Error("INVENTORY_ITEM_INVALID");
  await prisma.inventoryItem.create({ data: { sku: text(data, "sku").toUpperCase(), nameAr: text(data, "nameAr"), nameEn: text(data, "nameEn"), type, supplierId: optional(data, "supplierId"), quantityOnHand: Math.max(0, Math.trunc(number(data, "quantityOnHand"))), reorderLevel: Math.max(0, Math.trunc(number(data, "reorderLevel"))), unitCost: Math.max(0, number(data, "unitCost")), sellingPrice: Math.max(0, number(data, "sellingPrice")) } });
  await prisma.auditLog.create({ data: { actorId: admin.id, operation: "admin.inventory_item.create" } }); revalidatePath("/admin/inventory"); revalidatePath("/admin/inventory/items");
}

export async function adjustInventory(data: FormData) {
  const admin = await requireAdmin(); const inventoryItemId = text(data, "inventoryItemId"); const type = text(data, "type") as InventoryMovementType; const raw = Math.trunc(number(data, "quantity"));
  if (!Object.values(InventoryMovementType).includes(type) || raw <= 0) throw new Error("INVENTORY_ADJUSTMENT_INVALID");
  const incoming = ["PURCHASE","RETURNED","ADJUSTMENT_IN"].includes(type); const delta = incoming ? raw : -raw;
  await prisma.$transaction(async tx => {
    const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } }); if (!item) throw new Error("INVENTORY_ITEM_NOT_FOUND");
    if (item.quantityOnHand + delta < item.quantityReserved) throw new Error("STOCK_CANNOT_BE_NEGATIVE");
    await tx.inventoryItem.update({ where: { id: item.id }, data: { quantityOnHand: { increment: delta } } });
    await tx.inventoryMovement.create({ data: { inventoryItemId, type, quantity: delta, unitCost: number(data, "unitCost") || null, notes: optional(data, "notes"), createdBy: admin.id } });
    await tx.auditLog.create({ data: { actorId: admin.id, operation: "admin.inventory.adjust", targetId: item.id, metadata: { type, delta } } });
  }, { isolationLevel: "Serializable" }); revalidatePath("/admin/inventory"); revalidatePath("/admin/inventory/movements");
}

export async function createPurchase(data: FormData) {
  const admin = await requireAdmin(); const quantity = Math.trunc(number(data, "quantity")); const unitCost = number(data, "unitCost"); const subtotal = quantity * unitCost; const shippingCost = number(data, "shippingCost"); const customsCost = number(data, "customsCost"); const otherCost = number(data, "otherCost");
  if (!text(data, "supplierId") || !text(data, "inventoryItemId") || quantity <= 0 || unitCost < 0) throw new Error("PURCHASE_INVALID");
  const purchase = await prisma.purchase.create({ data: { supplierId: text(data, "supplierId"), invoiceNumber: optional(data, "invoiceNumber"), status: PurchaseStatus.ORDERED, subtotal, shippingCost, customsCost, otherCost, totalCost: subtotal + shippingCost + customsCost + otherCost, paidAmount: Math.max(0, number(data, "paidAmount")), purchaseDate: date(data, "purchaseDate"), notes: optional(data, "notes"), createdBy: admin.id, items: { create: { inventoryItemId: text(data, "inventoryItemId"), quantity, unitCost, totalCost: subtotal } } } });
  await prisma.auditLog.create({ data: { actorId: admin.id, operation: "admin.purchase.create", targetId: purchase.id } }); revalidatePath("/admin/purchases"); redirect(`/admin/purchases/${purchase.id}`);
}

export async function receivePurchase(data: FormData) {
  const admin = await requireAdmin(); const id = text(data, "purchaseId");
  await prisma.$transaction(async tx => {
    const purchase = await tx.purchase.findUnique({ where: { id }, include: { items: true } }); if (!purchase) throw new Error("PURCHASE_NOT_FOUND"); if (purchase.status === "RECEIVED") return; if (purchase.status === "CANCELLED") throw new Error("PURCHASE_CANCELLED");
    for (const item of purchase.items) { await tx.inventoryItem.update({ where: { id: item.inventoryItemId }, data: { quantityOnHand: { increment: item.quantity }, unitCost: item.unitCost } }); await tx.inventoryMovement.create({ data: { inventoryItemId: item.inventoryItemId, type: "PURCHASE", quantity: item.quantity, unitCost: item.unitCost, referenceType: "PURCHASE", referenceId: purchase.id, createdBy: admin.id } }); }
    await tx.purchase.update({ where: { id }, data: { status: "RECEIVED", receivedDate: new Date() } }); await tx.auditLog.create({ data: { actorId: admin.id, operation: "admin.purchase.receive", targetId: id } });
  }, { isolationLevel: "Serializable" }); revalidatePath(`/admin/purchases/${id}`); revalidatePath("/admin/inventory");
}

export async function createExpenseCategory(data: FormData) { const admin=await requireAdmin();if(!text(data,"nameAr")||!text(data,"nameEn"))throw new Error("CATEGORY_INVALID");const category=await prisma.expenseCategory.create({data:{nameAr:text(data,"nameAr"),nameEn:text(data,"nameEn")}});await prisma.auditLog.create({data:{actorId:admin.id,operation:"admin.expense_category.create",targetId:category.id}});revalidatePath("/admin/expense-categories"); }
export async function createExpense(data: FormData) { const admin=await requireAdmin();if(!text(data,"categoryId")||!text(data,"title")||number(data,"amount")<=0)throw new Error("EXPENSE_INVALID");const expense=await prisma.expense.create({data:{categoryId:text(data,"categoryId"),title:text(data,"title"),description:optional(data,"description"),amount:number(data,"amount"),expenseDate:date(data,"expenseDate"),paymentMethod:optional(data,"paymentMethod"),referenceNumber:optional(data,"referenceNumber"),attachmentFileId:optional(data,"attachmentFileId"),createdBy:admin.id}});await prisma.auditLog.create({data:{actorId:admin.id,operation:"admin.expense.create",targetId:expense.id}});revalidatePath("/admin/expenses");redirect("/admin/expenses"); }

export async function createCustomer(data: FormData) { const admin=await requireAdmin();if(!text(data,"name")||!text(data,"phone"))throw new Error("CUSTOMER_INVALID");const customer=await prisma.customer.create({data:{userId:optional(data,"userId"),name:text(data,"name"),phone:text(data,"phone"),email:optional(data,"email"),organizationName:optional(data,"organizationName"),notes:optional(data,"notes")}});await prisma.auditLog.create({data:{actorId:admin.id,operation:"admin.customer.create",targetId:customer.id}});revalidatePath("/admin/customers"); }
export async function createOrder(data: FormData) { const admin=await requireAdmin();const quantity=Math.trunc(number(data,"quantity"));const unitPrice=number(data,"unitPrice");const subtotal=quantity*unitPrice;const discount=Math.max(0,number(data,"discount"));const shippingCost=Math.max(0,number(data,"shippingCost"));if(!text(data,"customerId")||!text(data,"description")||quantity<=0||unitPrice<0)throw new Error("ORDER_INVALID");const order=await prisma.order.create({data:{customerId:text(data,"customerId"),status:OrderStatus.DRAFT,subtotal,discount,shippingCost,total:Math.max(0,subtotal-discount+shippingCost),paidAmount:0,paymentStatus:PaymentStatus.UNPAID,notes:optional(data,"notes"),createdBy:admin.id,items:{create:{cardId:optional(data,"cardId"),inventoryItemId:optional(data,"inventoryItemId"),description:text(data,"description"),quantity,unitPrice,total:subtotal}}}});await prisma.auditLog.create({data:{actorId:admin.id,operation:"admin.order.create",targetId:order.id}});revalidatePath("/admin/orders");redirect(`/admin/orders/${order.id}`); }

export async function updateCardState(data: FormData) {
  const admin=await requireAdmin();const id=text(data,"cardId");const action=text(data,"cardAction");const card=await prisma.card.findUnique({where:{id}});if(!card)throw new Error("CARD_NOT_FOUND");
  const statusMap:Record<string,CardStatus>={pause:"PAUSED",restore:"ACTIVE",lost:"LOST",disable:"DISABLED",archive:"ARCHIVED"};const status=statusMap[action];if(!status)throw new Error("CARD_ACTION_INVALID");
  await prisma.card.update({where:{id},data:{cardStatus:status,...(action==="lost"?{inventoryStatus:"LOST"}:{}),...(action==="restore"&&card.inventoryStatus==="LOST"?{inventoryStatus:card.ownerId?"ASSIGNED":"AVAILABLE"}: {})}});await prisma.auditLog.create({data:{actorId:admin.id,operation:`admin.card.${action}`,targetId:id}});revalidatePath("/admin/cards");revalidatePath(`/admin/cards/${id}`);
}

export async function updateOwnedCard(data: FormData){const user=await requireUser();const id=text(data,"cardId");const card=await prisma.card.findFirst({where:{id,ownerId:user.id}});if(!card)throw new Error("CARD_NOT_FOUND");const requested=text(data,"cardStatus");const allowed=["ACTIVE","PAUSED","LOST"] as const;const cardStatus=allowed.includes(requested as typeof allowed[number])?requested as typeof allowed[number]:card.cardStatus;const activeDestinationId=optional(data,"activeDestinationId");if(activeDestinationId&&!await prisma.destination.findFirst({where:{id:activeDestinationId,userId:user.id,isActive:true}}))throw new Error("DESTINATION_NOT_FOUND");await prisma.card.update({where:{id},data:{cardStatus,activeDestinationId,...(cardStatus==="LOST"?{inventoryStatus:"LOST"}:{})}});await prisma.auditLog.create({data:{actorId:user.id,operation:"card.update",targetId:id}});revalidatePath("/dashboard/tags");revalidatePath(`/dashboard/tags/${id}`);revalidatePath(`/${card.publicSlug}`);}

export async function assignCard(data: FormData) { const admin=await requireAdmin();const id=text(data,"cardId");const ownerId=text(data,"ownerId");await assertWithinLimit(ownerId,"cards");const profile=await prisma.profile.findFirst({where:{userId:ownerId,organizationId:null}});const destination=profile?await prisma.destination.findFirst({where:{profileId:profile.id,type:"PROFILE",isActive:true}}):null;await prisma.card.update({where:{id},data:{ownerId,profileId:profile?.id,activeDestinationId:destination?.id,assignmentStatus:"ADMIN_ASSIGNED",cardStatus:"ACTIVE",inventoryStatus:"ASSIGNED",assignedAt:new Date(),activatedAt:new Date()}});await prisma.auditLog.create({data:{actorId:admin.id,operation:"admin.card.assign",targetId:id,metadata:{ownerId}}});revalidatePath("/admin/cards");revalidatePath(`/admin/cards/${id}`); }
export async function unassignCard(data: FormData) { const admin=await requireAdmin();const id=text(data,"cardId");const card=await prisma.card.findUnique({where:{id}});if(!card)throw new Error("CARD_NOT_FOUND");await prisma.card.update({where:{id},data:{ownerId:null,organizationId:null,profileId:null,activeDestinationId:null,assignmentStatus:"UNASSIGNED",cardStatus:card.programmedAt?"PROGRAMMED":"CREATED",inventoryStatus:card.programmedAt?"PROGRAMMED":"AVAILABLE",assignedAt:null,activatedAt:null}});await prisma.auditLog.create({data:{actorId:admin.id,operation:"admin.card.unassign",targetId:id}});revalidatePath("/admin/cards");revalidatePath(`/admin/cards/${id}`); }

export async function deleteUserSafely(data: FormData) {
  const admin=await requireAdmin();const userId=text(data,"userId");const disposition=text(data,"cardDisposition");const targetUserId=optional(data,"reassignUserId");if(userId===admin.id)redirect(`/admin/users/${userId}?error=CANNOT_DELETE_SELF`);if(!["unassign","reassign","disable"].includes(disposition))redirect(`/admin/users/${userId}?error=CARD_DISPOSITION_REQUIRED`);if(disposition==="reassign"&&!targetUserId)redirect(`/admin/users/${userId}?error=REASSIGN_USER_REQUIRED`);if(disposition==="reassign"&&targetUserId){const ownedCards=await prisma.card.count({where:{ownerId:userId}});try{await assertWithinLimit(targetUserId,"cards",ownedCards);}catch{redirect(`/admin/users/${userId}?error=TARGET_CARD_LIMIT_REACHED`);}}
  try { await prisma.$transaction(async tx=>{
    if(disposition==="unassign")await tx.card.updateMany({where:{ownerId:userId},data:{ownerId:null,organizationId:null,profileId:null,activeDestinationId:null,assignmentStatus:"UNASSIGNED",cardStatus:"PROGRAMMED",inventoryStatus:"PROGRAMMED",assignedAt:null,activatedAt:null}});
    if(disposition==="disable")await tx.card.updateMany({where:{ownerId:userId},data:{ownerId:null,organizationId:null,profileId:null,activeDestinationId:null,assignmentStatus:"REVOKED",cardStatus:"DISABLED"}});
    if(disposition==="reassign")await tx.card.updateMany({where:{ownerId:userId},data:{ownerId:targetUserId,organizationId:null,profileId:null,activeDestinationId:null,assignmentStatus:"TRANSFERRED",assignedAt:new Date()}});
    const organizations=await tx.organization.findMany({where:{ownerId:userId},select:{id:true}});for(const organization of organizations){await tx.organization.update({where:{id:organization.id},data:{ownerId:admin.id}});await tx.membership.upsert({where:{organizationId_userId:{organizationId:organization.id,userId:admin.id}},create:{organizationId:organization.id,userId:admin.id,role:"OWNER"},update:{role:"OWNER"}});}
    await tx.cardBatch.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});await tx.inventoryMovement.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});await tx.purchase.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});await tx.expense.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});await tx.order.updateMany({where:{createdBy:userId},data:{createdBy:admin.id}});
    await tx.auditLog.create({data:{actorId:admin.id,operation:"admin.user.delete",targetId:userId,metadata:{cardDisposition:disposition,reassignUserId:targetUserId}}});await tx.user.delete({where:{id:userId}});
  }); } catch(error){console.error("safe user deletion failed",{operation:"admin.user.delete",adminId:admin.id,userId,error:error instanceof Error?error.name:"unknown"});redirect(`/admin/users/${userId}?error=DELETE_RELATION_CONFLICT`);}revalidatePath("/admin/users");redirect("/admin/users?deleted=1");
}

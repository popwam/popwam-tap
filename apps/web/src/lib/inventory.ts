export type InventoryLedgerMovement = {
  productId: string;
  type: string;
  quantity: number;
};

export type InventoryCost = {
  productId: string;
  unitCost: number;
};

const INCOMING = new Set(["PURCHASE", "PRODUCTION", "RETURN", "RETURNED", "ADJUSTMENT_IN"]);
const OUTGOING = new Set([
  "ASSIGNMENT",
  "SALE",
  "SOLD",
  "DAMAGE",
  "DAMAGED",
  "ADJUSTMENT_OUT",
  "CARD_BATCH_CREATED",
  "RESERVED",
  "LOST",
]);

/**
 * Returns a signed physical-unit delta. Money is intentionally absent from
 * this function so a price can never affect the item count.
 */
export function inventoryMovementDelta(movement: Pick<InventoryLedgerMovement, "type" | "quantity">) {
  const quantity = Number(movement.quantity);
  if (!Number.isSafeInteger(quantity)) throw new Error("INVENTORY_QUANTITY_INVALID");
  if (movement.type === "ADJUSTMENT") return quantity;
  if (INCOMING.has(movement.type)) return Math.abs(quantity);
  if (OUTGOING.has(movement.type)) return -Math.abs(quantity);
  throw new Error(`INVENTORY_MOVEMENT_TYPE_UNSUPPORTED:${movement.type}`);
}

export function calculatePhysicalStock(movements: InventoryLedgerMovement[]) {
  return movements.reduce((total, movement) => total + inventoryMovementDelta(movement), 0);
}

export function calculateInventoryByProduct(movements: InventoryLedgerMovement[]) {
  const balances = new Map<string, number>();
  for (const movement of movements) {
    balances.set(
      movement.productId,
      (balances.get(movement.productId) ?? 0) + inventoryMovementDelta(movement),
    );
  }
  return balances;
}

export function calculateInventoryValue(
  balances: ReadonlyMap<string, number>,
  costs: InventoryCost[],
) {
  const costByProduct = new Map(costs.map((row) => [row.productId, row.unitCost]));
  let value = 0;
  for (const [productId, quantity] of balances) {
    value += Math.max(0, quantity) * (costByProduct.get(productId) ?? 0);
  }
  return value;
}

export function inventoryReconciliation(
  cached: Array<{ productId: string; quantityOnHand: number }>,
  movements: InventoryLedgerMovement[],
) {
  const ledger = calculateInventoryByProduct(movements);
  return cached.map((row) => ({
    productId: row.productId,
    cachedQuantity: row.quantityOnHand,
    ledgerQuantity: ledger.get(row.productId) ?? 0,
    difference: (ledger.get(row.productId) ?? 0) - row.quantityOnHand,
  }));
}

import { describe, expect, it } from "vitest";
import {
  calculateInventoryByProduct,
  calculateInventoryValue,
  calculatePhysicalStock,
  inventoryReconciliation,
} from "./inventory";

describe("physical inventory ledger", () => {
  it("shows 1000 units even when their value is 2000", () => {
    const movements = [{ productId: "nfc", type: "PURCHASE", quantity: 1000 }];
    const balances = calculateInventoryByProduct(movements);
    expect(calculatePhysicalStock(movements)).toBe(1000);
    expect(calculateInventoryValue(balances, [{ productId: "nfc", unitCost: 2 }])).toBe(2000);
  });

  it("never adds unit cost or sale price to physical quantity", () => {
    const movements = [
      { productId: "nfc", type: "PURCHASE", quantity: 1000 },
      { productId: "nfc", type: "ASSIGNMENT", quantity: 125 },
      { productId: "nfc", type: "RETURN", quantity: 5 },
      { productId: "nfc", type: "DAMAGE", quantity: 10 },
      { productId: "nfc", type: "ADJUSTMENT", quantity: -20 },
    ];
    const balances = calculateInventoryByProduct(movements);
    expect(balances.get("nfc")).toBe(850);
    expect(calculateInventoryValue(balances, [{ productId: "nfc", unitCost: 99 }])).toBe(84_150);
  });

  it("detects a stale cached balance for safe reconciliation", () => {
    expect(
      inventoryReconciliation(
        [{ productId: "nfc", quantityOnHand: 2000 }],
        [{ productId: "nfc", type: "PURCHASE", quantity: 1000 }],
      ),
    ).toEqual([{ productId: "nfc", cachedQuantity: 2000, ledgerQuantity: 1000, difference: -1000 }]);
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateInventoryByProduct,
  calculateInventoryValue,
  calculatePhysicalStock,
  inventoryReconciliation,
} from "./inventory";
import { ORDER_TRANSITIONS, storeAvailability, SUBSCRIPTION_TRANSITIONS, transitionAllowed } from "./commerce";

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

describe("store and manual approval workflows",()=>{
  it("uses produced stock for NFC products and raw stock for accessories",()=>{expect(storeAvailability({type:"BLANK_CARD",rawAvailable:1000,producedAvailable:25})).toBe(25);expect(storeAvailability({type:"ACCESSORY",rawAvailable:40,producedAvailable:0})).toBe(40);});
  it("requires admin subscription approval before activation",()=>{expect(transitionAllowed(SUBSCRIPTION_TRANSITIONS,"REQUESTED","ACTIVE")).toBe(false);expect(transitionAllowed(SUBSCRIPTION_TRANSITIONS,"APPROVED","ACTIVE")).toBe(true);});
  it("allows store orders to follow fulfillment states",()=>{expect(transitionAllowed(ORDER_TRANSITIONS,"NEW","PAID")).toBe(true);expect(transitionAllowed(ORDER_TRANSITIONS,"NEW","DELIVERED")).toBe(false);});
});

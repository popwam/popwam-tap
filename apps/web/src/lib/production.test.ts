import { describe, expect, it } from "vitest";
import { activationCodeCanBeConsumed, cardTypeForInventoryItem, createProductionRows, serialPrefixForProduct } from "./production";

describe("production batches", () => {
  it("creates unique permanent URLs and separate hashed scratch secrets", () => {
    const rows = createProductionRows({
      quantity: 12,
      startingSerialNumber: 1,
      serialPrefix: "PW",
      publicSlugPrefix: "mamdouh-",
      scratchHashCost: 16384,
    });
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map(row => row.permanentUrl)).size).toBe(12);
    expect(new Set(rows.map(row => row.scratchSecret)).size).toBe(12);
    for (const row of rows) {
      expect(row.permanentUrl).toContain(`/${row.publicSlug}`);
      expect(row.scratchSecret).toMatch(/^\d{6}$/);
      expect(row.activationSecretHash).toMatch(/^scrypt\$v1\$/);
      expect(row.activationTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(row.immutableToken).not.toBe(row.scratchSecret);
      expect(row.activationSecretHash).not.toContain(row.scratchSecret);
    }
  });

  it("makes activation single-use at the state gate", () => {
    expect(activationCodeCanBeConsumed({ ownerId: null, assignmentStatus: "UNASSIGNED", consumedAt: null })).toBe(true);
    expect(activationCodeCanBeConsumed({ ownerId: "user", assignmentStatus: "SELF_CLAIMED", consumedAt: new Date() })).toBe(false);
  });

  it("derives production metadata from the selected inventory product",()=>{expect(cardTypeForInventoryItem("BLANK_STICKER")).toBe("NFC_STICKER");expect(cardTypeForInventoryItem("BLANK_CARD")).toBe("NFC_CARD");expect(serialPrefixForProduct("pw-card-01")).toBe("PWCARD");});
});

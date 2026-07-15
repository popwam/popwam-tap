import { describe, expect, it } from "vitest";
import { appleWalletConfigured, appleWalletReadiness, buildApplePassData, buildGoogleWalletObject, googleWalletConfigured, googleWalletReadiness } from "./wallet";

const card = { id: "vc_1", serialNumber: "POPWAM-VC-1", name: "Mina", title: "Designer", company: "Studio", publicUrl: "https://go.popwam.com/p/mina", email: "mina@example.test", updatedAt: new Date("2026-07-14T00:00:00Z") };

describe("wallet pass payloads", () => {
  it("generates a Google Generic Object with a QR public URL", () => {
    const object = buildGoogleWalletObject(card, "issuer", "popwam");
    expect(object.classId).toBe("issuer.popwam");
    expect(object.barcode).toEqual(expect.objectContaining({ type: "QR_CODE", value: card.publicUrl }));
  });

  it("generates Apple pass data with QR destination data and no NFC claim", () => {
    const pass = buildApplePassData(card, { passTypeIdentifier: "pass.com.popwam.tap", teamIdentifier: "TEAM" });
    expect(pass.generic.backFields[0].value).toBe(card.publicUrl);
    expect(pass).not.toHaveProperty("nfc");
  });

  it("requires all external signing credentials", () => {
    expect(googleWalletConfigured({})).toBe(false);
    expect(appleWalletConfigured({})).toBe(false);
    expect(googleWalletReadiness({}).items.find(item => item.key === "issuerId")).toMatchObject({ configured:false });
    expect(appleWalletReadiness({}).items.find(item => item.key === "wwdr")).toMatchObject({ configured:false });
  });
});

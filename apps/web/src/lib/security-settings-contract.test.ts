import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const settings = readFileSync(new URL("../components/settings-center.tsx", import.meta.url), "utf8");
const stepUp = readFileSync(new URL("../components/step-up-dialog.tsx", import.meta.url), "utf8");
const inventory = readFileSync(new URL("./security-inventory.ts", import.meta.url), "utf8");
const grant = readFileSync(new URL("./security-step-up.ts", import.meta.url), "utf8");
const passkeys = readFileSync(new URL("./security-passkeys.ts", import.meta.url), "utf8");
const transfer = readFileSync(new URL("../app/transfer-actions.ts", import.meta.url), "utf8");
const lost = readFileSync(new URL("../app/api/security/products/[cardId]/lost/route.ts", import.meta.url), "utf8");
const en = JSON.parse(readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8"));
const ar = JSON.parse(readFileSync(new URL("../../locales/ar.json", import.meta.url), "utf8"));

describe("Phase H Web security settings contract", () => {
  it("provides organized settings navigation, appearance, notifications, retry, and RTL-complete copy", () => {
    for (const route of ["appearance", "notifications", "privacy", "permissions", "security", "devices", "sessions", "passkeys", "account", "legal"]) {
      expect(settings).toContain(route);
    }
    expect(settings).toContain('["SYSTEM", copy.system]');
    expect(settings).toContain("osNotificationPermission");
    expect(settings).toContain("loadFailed");
    expect(Object.keys(en.settingsCenter).sort()).toEqual(Object.keys(ar.settingsCenter).sort());
    expect(Object.keys(en.settingsCenter.stepUp).sort()).toEqual(Object.keys(ar.settingsCenter.stepUp).sort());
  });

  it("shows current sessions and revokes actual Web rows or Android refresh families", () => {
    expect(settings).toContain("session.current");
    expect(settings).toContain("REVOKE_SESSION");
    expect(settings).toContain("REVOKE_OTHER_SESSIONS");
    expect(inventory).toContain("tx.session.delete");
    expect(inventory).toContain("familyId");
    expect(inventory).toContain("mobileRefreshToken.updateMany");
    expect(inventory).toContain("devicePushToken.updateMany");
    expect(inventory).toContain("catch");
  });

  it("enforces purpose/session-bound, expiring, single-use step-up grants", () => {
    expect(stepUp).toContain("startAuthentication");
    expect(stepUp).toContain('method: "OTP"');
    expect(grant).toContain("sessionBindingHash: context.bindingHash");
    expect(grant).toContain("expiresAt: { gt: now }");
    expect(grant).toContain("consumedAt: null");
    expect(grant).toContain("consumedAt: now");
    expect(grant).toContain("consumed.count !== 1");
  });

  it("protects passkey, lost-product, and transfer mutations without exposing raw credentials", () => {
    expect(passkeys).toContain('"REMOVE_PASSKEY"');
    expect(passkeys).toContain("phoneVerifiedAt");
    expect(passkeys).not.toContain("credentialPublicKey:");
    expect(lost).toContain('"PRODUCT_LOST"');
    expect(lost).toContain("FOR UPDATE");
    expect(transfer).toContain('"PRODUCT_TRANSFER"');
    expect(transfer).toContain("FOR UPDATE");
  });
});

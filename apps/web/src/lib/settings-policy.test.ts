import { describe, expect, it } from "vitest";
import { parseNotificationPatch, parseSettingsPatch, permissionStateIsDeviceOwned } from "./settings-policy";

describe("Phase H settings policy", () => {
  it("accepts only controlled themes, languages, and fonts", () => {
    expect(parseSettingsPatch({ theme: "SYSTEM", language: "ARABIC", font: "CAIRO" })).toEqual({ theme: "SYSTEM", language: "ARABIC", font: "CAIRO" });
    expect(parseSettingsPatch({ theme: "LIGHT", language: "ENGLISH", font: "ABEEZEE" })).toEqual({ theme: "LIGHT", language: "ENGLISH", font: "ABEEZEE" });
    expect(parseSettingsPatch({ theme: "DARK", font: "DEFAULT" })).toEqual({ theme: "DARK", font: "DEFAULT" });
    expect(parseSettingsPatch({ theme: "NEON" })).toBeNull();
    expect(parseSettingsPatch({ font: "remote-font-url" })).toBeNull();
  });

  it("accepts typed privacy and notification values and rejects unknown preferences", () => {
    expect(parseSettingsPatch({ shareActivityIdentity: true })).toEqual({ shareActivityIdentity: true });
    expect(parseSettingsPatch({ nearby: true })).toBeNull();
    expect(parseSettingsPatch({ osPermission: "ALLOWED" })).toBeNull();
    expect(parseNotificationPatch({ generalEnabled: false, securityEnabled: true, productsEnabled: false, marketingEnabled: false })).toEqual({
      generalEnabled: false, securityEnabled: true, productsEnabled: false, marketingEnabled: false,
    });
    expect(parseNotificationPatch({ socialEnabled: false })).toEqual({ socialEnabled: false });
    expect(parseNotificationPatch({ pushToken: true })).toBeNull();
    expect(parseNotificationPatch({ marketingEnabled: "yes" })).toBeNull();
  });

  it("keeps operating-system permission state device-owned", () => {
    for (const state of ["ALLOWED", "DENIED", "NOT_REQUESTED", "UNAVAILABLE"]) expect(permissionStateIsDeviceOwned(state)).toBe(true);
    expect(permissionStateIsDeviceOwned("SERVER_ALLOWED")).toBe(false);
  });
});

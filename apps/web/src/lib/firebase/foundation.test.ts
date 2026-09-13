import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { normalizeFirebasePrivateKey, validFirebasePrivateKey } from "./admin";
import { safeFirebaseAnalyticsProperties } from "./analytics";
describe("FCM credential formatting",()=>{
  it("normalizes Railway escaped PEM newlines without exposing key material", () => {
    const escaped = "-----BEGIN PRIVATE KEY-----\\nexample-body\\n-----END PRIVATE KEY-----";
    const normalized = normalizeFirebasePrivateKey(escaped);
    expect(normalized).toContain("\n");
    expect(normalized).not.toContain("\\n");
    expect(validFirebasePrivateKey(escaped)).toBe(true);
    expect(validFirebasePrivateKey("not-a-private-key")).toBe(false);
  });

});
describe("Firebase analytics privacy contract", () => {
  it("allows only the documented non-sensitive properties", () => {
    expect(safeFirebaseAnalyticsProperties({ user_type: "guest", platform: "web", otp_code: "123456", access_token: "secret", phone: "+201" })).toEqual({ user_type: "guest", platform: "web" });
  });
});

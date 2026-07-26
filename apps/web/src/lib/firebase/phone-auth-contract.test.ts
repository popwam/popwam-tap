import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Firebase phone exchange security contract", () => {
  const externalIdentity = readFileSync("src/lib/external-identity.ts", "utf8");
  const phonePolicy = readFileSync("src/lib/firebase/phone-policy.ts", "utf8");
  const admin = readFileSync("src/lib/firebase/admin.ts", "utf8");
  const route = readFileSync("src/app/api/mobile/auth/firebase/phone/exchange/route.ts", "utf8");
  const schema = readFileSync("../../packages/db/prisma/schema.prisma", "utf8");

  it("derives phone server-side and accepts no client phone assertion", () => {
    expect(admin).toContain("auth.getUser(claims.uid)");
    expect(admin).toContain("user.phoneNumber");
    expect(route).not.toMatch(/body\.phone|verified\s*:\s*true|body\.userId/);
    expect(route).toContain("verifyFirebasePhoneIdToken");
  });

  it("uses POP sessions rather than Firebase tokens as ordinary bearers", () => {
    expect(externalIdentity).toContain("issueMobileSession");
    expect(route).toContain("firebaseIdTokenFromRequest");
    expect(route).not.toContain("getMobileUser");
    expect(route).not.toContain('authorization: `Bearer ${');
  });

  it("has race-safe unique canonical phone and provider subject constraints", () => {
    expect(schema).toContain("phoneE164                String?                  @unique");
    expect(schema).toContain("@@unique([provider, providerSubject])");
    expect(externalIdentity).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(phonePolicy).toContain('code === "P2002" || code === "P2034"');
  });

  it("never stores Firebase SMS codes", () => {
    expect(externalIdentity).not.toContain("otpHash");
    expect(externalIdentity).not.toContain("OtpChallenge");
    expect(route).not.toContain("verificationCode");
  });
});

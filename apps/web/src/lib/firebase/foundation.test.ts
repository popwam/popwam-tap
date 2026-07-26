import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  FirebaseIdentityError,
  normalizeFirebasePrivateKey,
  validFirebasePrivateKey,
  verifyFirebaseIdToken,
  verifyFirebasePhoneIdToken,
} from "./admin";
import { safeFirebaseAnalyticsProperties } from "./analytics";
import {
  isRetryableFirebasePhoneResolutionError,
  planFirebasePhoneResolution,
} from "./phone-policy";

describe("Firebase server token verification", () => {
  it("normalizes Railway escaped PEM newlines without exposing key material", () => {
    const escaped = "-----BEGIN PRIVATE KEY-----\\nexample-body\\n-----END PRIVATE KEY-----";
    const normalized = normalizeFirebasePrivateKey(escaped);
    expect(normalized).toContain("\n");
    expect(normalized).not.toContain("\\n");
    expect(validFirebasePrivateKey(escaped)).toBe(true);
    expect(validFirebasePrivateKey("not-a-private-key")).toBe(false);
  });

  it("accepts only a valid mocked verification result and derives its UID from claims", async () => {
    await expect(verifyFirebaseIdToken("header.payload.signature", async () => ({ uid: "firebase-uid", auth_time: 10, iat: 20, firebase: { sign_in_provider: "anonymous" } }))).resolves.toEqual({ uid: "firebase-uid", signInProvider: "anonymous", authTime: 10, issuedAt: 20 });
  });

  it("rejects missing, malformed, and verifier-rejected tokens", async () => {
    await expect(verifyFirebaseIdToken(null)).rejects.toMatchObject({ code: "FIREBASE_TOKEN_MISSING" } satisfies Partial<FirebaseIdentityError>);
    await expect(verifyFirebaseIdToken("not-a-token")).rejects.toMatchObject({ code: "FIREBASE_TOKEN_INVALID" });
    await expect(verifyFirebaseIdToken("header.payload.signature", async () => { throw new Error("invalid"); })).rejects.toMatchObject({ code: "FIREBASE_TOKEN_INVALID" });
  });

  it("derives the authoritative phone from the Admin verifier and requires a phone sign-in", async () => {
    await expect(verifyFirebasePhoneIdToken("header.payload.signature", async () => ({
      claims: { uid: "firebase-phone-uid", auth_time: 10, iat: 20, firebase: { sign_in_provider: "phone" } },
      phoneNumber: "+201001234567",
    }))).resolves.toMatchObject({
      uid: "firebase-phone-uid",
      phoneNumber: "+201001234567",
      signInProvider: "phone",
    });
    await expect(verifyFirebasePhoneIdToken("header.payload.signature", async () => ({
      claims: { uid: "anonymous-uid", auth_time: 10, iat: 20, firebase: { sign_in_provider: "anonymous" } },
      phoneNumber: null,
    }))).rejects.toMatchObject({ code: "FIREBASE_PHONE_IDENTITY_REQUIRED" });
  });
});

describe("Firebase phone to canonical POP identity policy", () => {
  const phone = "+201001234567";
  const user = { id: "pop-user", status: "ACTIVE", phone, phoneE164: phone };
  const identity = { id: "identity", userId: "pop-user", status: "ACTIVE" as const };

  it("first verified phone login creates only when no canonical user exists", () => {
    expect(planFirebasePhoneResolution({ verifiedPhone: phone, identity: null, linkedUser: null, phoneUser: null }))
      .toEqual({ action: "CREATE_USER" });
  });

  it.each([
    "second login",
    "after POP logout",
    "after Firebase local sign-out",
    "from another installation",
    "after app-data reset",
    "after reinstall",
    "after installation ID changes",
  ])("same phone %s resolves the same POP user", () => {
    expect(planFirebasePhoneResolution({ verifiedPhone: phone, identity, linkedUser: user, phoneUser: user }))
      .toEqual({ action: "USE_USER", userId: "pop-user", identityAction: "TOUCH" });
  });

  it("a safe new Firebase UID for the same authoritative phone links to the existing POP user", () => {
    expect(planFirebasePhoneResolution({ verifiedPhone: phone, identity: null, linkedUser: null, phoneUser: user }))
      .toEqual({ action: "USE_USER", userId: "pop-user", identityAction: "CREATE" });
  });

  it("an old unlinked anonymous identity can only upgrade to the matching phone user", () => {
    expect(planFirebasePhoneResolution({
      verifiedPhone: phone,
      identity: { id: "old-anonymous", userId: null, status: "ACTIVE" },
      linkedUser: null,
      phoneUser: user,
    })).toEqual({ action: "USE_USER", userId: "pop-user", identityAction: "LINK" });
  });

  it("Firebase UID and phone ownership conflicts fail closed", () => {
    const other = { id: "other-user", status: "ACTIVE", phone: "+37360000000", phoneE164: "+37360000000" };
    expect(() => planFirebasePhoneResolution({ verifiedPhone: phone, identity, linkedUser: other, phoneUser: user }))
      .toThrow("EXTERNAL_IDENTITY_CONFLICT");
  });

  it("different verified phones have different canonical resolution", () => {
    expect(planFirebasePhoneResolution({ verifiedPhone: "+37360000000", identity: null, linkedUser: null, phoneUser: null }))
      .toEqual({ action: "CREATE_USER" });
  });

  it("unique and serializable race errors are retried", () => {
    expect(isRetryableFirebasePhoneResolutionError({ code: "P2002" })).toBe(true);
    expect(isRetryableFirebasePhoneResolutionError({ code: "P2034" })).toBe(true);
    expect(isRetryableFirebasePhoneResolutionError({ code: "P2025" })).toBe(false);
  });
});

describe("Firebase analytics privacy contract", () => {
  it("allows only the documented non-sensitive properties", () => {
    expect(safeFirebaseAnalyticsProperties({ user_type: "guest", platform: "web", otp_code: "123456", access_token: "secret", phone: "+201" })).toEqual({ user_type: "guest", platform: "web" });
  });
});

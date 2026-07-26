import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allowed: vi.fn(() => true),
  verify: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock("@/lib/auth-request-rate-limit", () => ({ authRequestAllowed: mocks.allowed }));
vi.mock("@/lib/firebase/admin", () => ({
  FirebaseIdentityError: class FirebaseIdentityError extends Error {
    constructor(readonly code: string) { super(code); }
  },
  firebaseIdTokenFromRequest: (request: Request) => request.headers.get("x-firebase-id-token"),
  verifyFirebasePhoneIdToken: mocks.verify,
}));
vi.mock("@/lib/external-identity", () => ({
  ExternalIdentityError: class ExternalIdentityError extends Error {
    constructor(readonly code: string) { super(code); }
  },
  resolveFirebasePhoneSession: mocks.resolve,
}));

import { POST } from "../../app/api/mobile/auth/firebase/phone/exchange/route";

describe("Firebase phone exchange route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.allowed.mockReturnValue(true);
    mocks.verify.mockResolvedValue({ uid: "firebase-phone-subject", phoneNumber: "+201001234567" });
    mocks.resolve.mockResolvedValue({
      session: { accessToken: "pop-access", refreshToken: "pop-refresh", expiresIn: 900 },
      user: { id: "pop-user", role: "USER", phone: "+201001234567" },
      isNewUser: false,
    });
  });

  it("accepts the Android proof contract and returns the normal POP session shape", async () => {
    const response = await POST(new Request("https://pop.popwam.com/api/mobile/auth/firebase/phone/exchange", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-firebase-id-token": "header.payload.signature",
        "x-pop-app-version": "0.0.12-debug",
      },
      body: JSON.stringify({ deviceName: "Motorola moto g85 5G", phone: "+19999999999", verified: true }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      accessToken: "pop-access",
      refreshToken: "pop-refresh",
      user: { id: "pop-user" },
      isNewAccount: false,
    });
    expect(mocks.verify).toHaveBeenCalledWith("header.payload.signature");
    expect(mocks.resolve).toHaveBeenCalledWith(
      { uid: "firebase-phone-subject", phoneNumber: "+201001234567" },
      "Motorola moto g85 5G",
      "0.0.12-debug",
    );
  });

  it("does not require an existing POP bearer or cookie", async () => {
    const response = await POST(new Request("https://pop.popwam.com/api/mobile/auth/firebase/phone/exchange", {
      method: "POST",
      headers: { "x-firebase-id-token": "header.payload.signature" },
      body: "{}",
    }));
    expect(response.status).toBe(200);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
  createChallenge: vi.fn(),
  consumeStepUpGrant: vi.fn(),
  generateOptions: vi.fn(),
  StepUpRequiredError: class StepUpRequiredError extends Error {},
}));

vi.mock("@popwam/db", () => ({
  prisma: {
    passkeyCredential: { findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/api-auth", () => ({
  isTrustedPopMutation: () => true,
  getCurrentPopSessionContext: mocks.context,
  unauthorized: () => Response.json({ ok: false }, { status: 401 }),
  csrfRejected: () => Response.json({ ok: false }, { status: 403 }),
}));
vi.mock("@/lib/passkeys", () => ({
  passkeyConfig: () => ({ rpName: "POP", rpID: "pop.example" }),
  passkeyChallengeHash: () => "challenge-hash",
}));
vi.mock("@/lib/passkey-registration-policy", () => ({
  passkeyRegistrationEligibility: (input: { activePasskeyCount: number; authMethod: string; lastAuthenticatedAt: Date | null }) => {
    const freshnessSatisfied = Boolean(input.lastAuthenticatedAt && input.lastAuthenticatedAt.getTime() > Date.now() - 10 * 60_000 && input.authMethod !== "LEGACY");
    const hasExistingPasskey = input.activePasskeyCount > 0;
    const stepUpRequired = hasExistingPasskey || !freshnessSatisfied;
    return { hasExistingPasskey, freshnessSatisfied, stepUpRequired, passkeyEnrollmentEligible: !stepUpRequired };
  },
}));
vi.mock("@/lib/security-step-up", () => ({
  consumeStepUpGrant: mocks.consumeStepUpGrant,
  StepUpRequiredError: mocks.StepUpRequiredError,
  stepUpGrantFromRequest: () => null,
}));
vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: mocks.generateOptions,
}));

import { POST } from "./route";

const request = () => new Request("https://pop.example/api/passkeys/register/options", { method: "POST", headers: { authorization: "Bearer test" } });
const context = (overrides: Partial<{ authMethod: string; lastAuthenticatedAt: Date | null }> = {}) => ({
  user: { id: "user-not-logged", name: "POP user", email: "user@example.invalid" },
  bindingHash: "binding-hash",
  authMethod: "OTP",
  lastAuthenticatedAt: new Date(),
  ...overrides,
});

describe("passkey registration options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.context.mockResolvedValue(context());
    mocks.findMany.mockResolvedValue([]);
    mocks.createChallenge.mockResolvedValue({ id: "challenge" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({ passkeyChallenge: { create: mocks.createChallenge } }));
    mocks.consumeStepUpGrant.mockResolvedValue({});
    mocks.generateOptions.mockResolvedValue({
      challenge: "not-logged",
      rp: { id: "pop.example" },
      user: { id: "not-logged" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
      extensions: { credProps: true },
    });
  });

  it("permits fresh OTP first-passkey registration without step-up", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    });
    expect(mocks.generateOptions).toHaveBeenCalledWith(expect.objectContaining({
      authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
      supportedAlgorithmIDs: [-7, -8, -257],
      userID: Buffer.from("user-not-logged"),
    }));
    expect(mocks.consumeStepUpGrant).not.toHaveBeenCalled();
    expect(mocks.createChallenge).toHaveBeenCalledOnce();
  });

  it("returns the canonical provider-neutral options without credProps rewriting on Android", async () => {
    const response = await POST(request());
    const options = await response.json();
    expect(options.extensions).toBeUndefined();
    expect(options.authenticatorSelection.authenticatorAttachment).toBeUndefined();
    expect(options.user.id).toBe("not-logged");
  });

  it("returns 428 only when a stale session cannot satisfy ADD_PASSKEY step-up", async () => {
    mocks.context.mockResolvedValue(context({ lastAuthenticatedAt: new Date(Date.now() - 10 * 60_000) }));
    mocks.consumeStepUpGrant.mockRejectedValue(new mocks.StepUpRequiredError());
    const response = await POST(request());
    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "STEP_UP_REQUIRED" });
    expect(mocks.createChallenge).not.toHaveBeenCalled();
  });

  it("returns 428 when adding another passkey has no valid grant", async () => {
    mocks.findMany.mockResolvedValue([{ credentialId: "credential-not-logged", transports: [] }]);
    mocks.consumeStepUpGrant.mockRejectedValue(new mocks.StepUpRequiredError());
    const response = await POST(request());
    expect(response.status).toBe(428);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "STEP_UP_REQUIRED" });
  });

  it("accepts a valid ADD_PASSKEY grant for another passkey", async () => {
    mocks.findMany.mockResolvedValue([{ credentialId: "credential-not-logged", transports: [] }]);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.consumeStepUpGrant).toHaveBeenCalledOnce();
    expect(mocks.createChallenge).toHaveBeenCalledOnce();
  });

  it("does not misclassify an unexpected step-up storage failure as 428", async () => {
    mocks.findMany.mockResolvedValue([{ credentialId: "credential-not-logged", transports: [] }]);
    mocks.consumeStepUpGrant.mockRejectedValue(new Error("storage unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "PASSKEY_OPTIONS_FAILED" });
  });

  it("returns a safe 500 rather than 428 when challenge persistence fails", async () => {
    mocks.createChallenge.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "PASSKEY_OPTIONS_FAILED" });
    expect(mocks.consumeStepUpGrant).not.toHaveBeenCalled();
  });
});

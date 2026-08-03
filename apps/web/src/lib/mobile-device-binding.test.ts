import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMobileDeviceBinding } from "./mobile-device-binding";

function proof() {
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const challenge = Buffer.alloc(32, 7).toString("base64url");
  const publicKey = keys.publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const signature = sign("sha256", Buffer.from(challenge, "utf8"), keys.privateKey);
  return {
    challenge,
    credentialId: "device_credential_1234567890",
    publicKey: publicKey.toString("base64url"),
    signature: signature.toString("base64url"),
    biometricType: "FINGERPRINT",
  };
}

describe("mobile device binding", () => {
  it("accepts a valid ES256 possession proof", () => {
    expect(verifyMobileDeviceBinding(proof())).not.toBeNull();
  });

  it("rejects replay material changed after signing", () => {
    const value = proof();
    value.challenge = Buffer.alloc(32, 9).toString("base64url");
    expect(verifyMobileDeviceBinding(value)).toBeNull();
  });

  it("rejects unknown biometric claims and malformed keys", () => {
    expect(verifyMobileDeviceBinding({ ...proof(), biometricType: "IRIS" })).toBeNull();
    expect(verifyMobileDeviceBinding({ ...proof(), publicKey: "not-a-key" })).toBeNull();
  });
});


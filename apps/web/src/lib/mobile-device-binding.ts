import { createPublicKey, verify } from "node:crypto";

const base64url = /^[A-Za-z0-9_-]+$/;
const biometricTypes = new Set(["FINGERPRINT", "FACE", "GENERIC_BIOMETRIC", "UNAVAILABLE"]);

export type MobileDeviceBindingProof = {
  challenge: string;
  credentialId: string;
  publicKey: string;
  signature: string;
  biometricType: string;
};

export function verifyMobileDeviceBinding(proof: MobileDeviceBindingProof): { publicKey: Buffer } | null {
  if (
    !base64url.test(proof.challenge) || proof.challenge.length < 40 || proof.challenge.length > 128 ||
    !/^[A-Za-z0-9_-]{16,120}$/.test(proof.credentialId) ||
    !base64url.test(proof.publicKey) || proof.publicKey.length > 4096 ||
    !base64url.test(proof.signature) || proof.signature.length > 1024 ||
    !biometricTypes.has(proof.biometricType)
  ) return null;
  try {
    const publicKey = Buffer.from(proof.publicKey, "base64url");
    const signature = Buffer.from(proof.signature, "base64url");
    const key = createPublicKey({ key: publicKey, format: "der", type: "spki" });
    if (key.asymmetricKeyType !== "ec") return null;
    return verify("sha256", Buffer.from(proof.challenge, "utf8"), key, signature) ? { publicKey } : null;
  } catch {
    return null;
  }
}

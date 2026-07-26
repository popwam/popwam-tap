import { describe, expect, it } from "vitest";
import {
  activationScratchSecretMatches,
  createActivationScratchSecret,
  hashActivationScratchSecret,
  normalizeActivationScratchSecret,
} from "./card-tokens";

describe("activation scratch secret", () => {
  const pepper = "test-only-distinct-scratch-pepper";

  it("generates a six-digit packaging secret", () => {
    expect(createActivationScratchSecret()).toMatch(/^\d{6}$/);
  });

  it("stores a salted slow hash and never embeds the secret", () => {
    const secret = "104729";
    const first = hashActivationScratchSecret(secret, pepper, 16384);
    const second = hashActivationScratchSecret(secret, pepper, 16384);
    expect(first).toMatch(/^scrypt\$v1\$16384\$/);
    expect(first).not.toContain(secret);
    expect(second).not.toBe(first);
  });

  it("accepts only the correct secret and supports pasted whitespace", () => {
    const encoded = hashActivationScratchSecret("104729", pepper, 16384);
    expect(activationScratchSecretMatches("104729", encoded, pepper)).toBe(true);
    expect(activationScratchSecretMatches(" 104 729 ", encoded, pepper)).toBe(true);
    expect(activationScratchSecretMatches("104728", encoded, pepper)).toBe(false);
  });

  it("rejects malformed, short, and unsupported hashes safely", () => {
    expect(() => hashActivationScratchSecret("1234", pepper, 16384)).toThrow("ACTIVATION_SECRET_INVALID");
    expect(activationScratchSecretMatches("123456", "not-a-hash", pepper)).toBe(false);
    expect(activationScratchSecretMatches("123456", "scrypt$v1$2$salt$hash", pepper)).toBe(false);
    expect(activationScratchSecretMatches("12345", "scrypt$v1$16384$salt$hash", pepper)).toBe(false);
  });

  it("normalizes input without transforming its value", () => {
    expect(normalizeActivationScratchSecret(" 10 47 29 ")).toBe("104729");
  });
});

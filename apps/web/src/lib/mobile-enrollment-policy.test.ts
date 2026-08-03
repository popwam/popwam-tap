import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  constantTimeTokenEquals,
  enrollmentTokenFromRequest,
  mobileCompletionKeyHash,
  mobileEnrollmentTokenHash,
} from "./mobile-enrollment";

const previousSecret = process.env.MOBILE_ENROLLMENT_SECRET;

afterEach(() => {
  if (previousSecret === undefined) delete process.env.MOBILE_ENROLLMENT_SECRET;
  else process.env.MOBILE_ENROLLMENT_SECRET = previousSecret;
});

describe("restricted mobile enrollment policy", () => {
  it("accepts only the bounded Enrollment authorization scheme", () => {
    const token = "r".repeat(64);
    expect(enrollmentTokenFromRequest(new Request("https://pop.popwam.com", { headers: { authorization: `Enrollment ${token}` } }))).toBe(token);
    expect(enrollmentTokenFromRequest(new Request("https://pop.popwam.com", { headers: { authorization: `Bearer ${token}` } }))).toBeNull();
    expect(enrollmentTokenFromRequest(new Request("https://pop.popwam.com", { headers: { authorization: "Enrollment short" } }))).toBeNull();
  });

  it("hashes enrollment and retry credentials with separate domains", () => {
    process.env.MOBILE_ENROLLMENT_SECRET = "e".repeat(64);
    const value = "opaque-secret-value-that-is-never-stored-raw";
    expect(mobileEnrollmentTokenHash(value)).not.toContain(value);
    expect(mobileEnrollmentTokenHash(value)).not.toBe(mobileCompletionKeyHash(value));
    expect(constantTimeTokenEquals(mobileEnrollmentTokenHash(value), mobileEnrollmentTokenHash(value))).toBe(true);
    expect(constantTimeTokenEquals(mobileEnrollmentTokenHash(value), mobileCompletionKeyHash(value))).toBe(false);
  });
});

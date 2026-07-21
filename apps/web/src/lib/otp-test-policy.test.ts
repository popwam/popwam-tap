import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverOtpCode } from "./otp-delivery";
import { hashOtp, otpMatches } from "./otp-crypto";
import { isOtpUsable, otpHourlyLimitReached, otpRetryAfter } from "./otp-policy";
import { normalizePhone } from "./phone";
import { decideOtpTestDelivery, evaluateOtpTestConfig, parseOtpTestPhones, type OtpTestEnvironment } from "./otp-test-policy";

const egyptTestPhone = (network: string) => `+20${network}${"0".repeat(8)}`;
const PHONE_A = egyptTestPhone("10");
const PHONE_B = egyptTestPhone("11");
const PHONE_OTHER = egyptTestPhone("12");

const base: OtpTestEnvironment = {
  OTP_TEST_MODE: "true",
  OTP_TEST_PHONES: `${PHONE_A},${PHONE_B}`,
  OTP_TEST_CODE: "654321",
  OTP_EXPOSE_IN_RESPONSE: "true",
  SMSMISR_ENVIRONMENT: "2",
  NODE_ENV: "development",
  STAGING: "false",
};

afterEach(() => { delete process.env.OTP_PEPPER; });

describe("strict OTP testing mode", () => {
  it("gives an allowlisted phone the configured test OTP without provider delivery", async () => {
    const decision = decideOtpTestDelivery(PHONE_A, base, () => "111111");
    const sendOtp = vi.fn();
    expect(decision).toEqual({ testDelivery: true, expose: true, code: "654321" });
    await expect(deliverOtpCode({ testDelivery: decision.testDelivery, provider: { name: "smsmisr", sendOtp }, otp: { to: PHONE_A, code: decision.code!, expiresMinutes: 5, locale: "ar" } })).resolves.toMatchObject({ status: "SENT", provider: "test-allowlist" });
    expect(sendOtp).not.toHaveBeenCalled();
  });

  it("leaves a non-allowlisted phone on the SMS Misr path and never exposes its OTP", async () => {
    const decision = decideOtpTestDelivery(PHONE_OTHER, base, () => "111111");
    const sendOtp = vi.fn().mockResolvedValue({ status: "SENT", provider: "smsmisr", responseCode: "4901" });
    expect(decision).toEqual({ testDelivery: false, expose: false, code: undefined });
    await expect(deliverOtpCode({ testDelivery: decision.testDelivery, provider: { name: "smsmisr", sendOtp }, otp: { to: PHONE_OTHER, code: "111111", expiresMinutes: 5, locale: "ar" } })).resolves.toMatchObject({ provider: "smsmisr", responseCode: "4901" });
    expect(sendOtp).toHaveBeenCalledOnce();
  });

  it("never exposes or bypasses SMS in live production", () => {
    const live = { ...base, NODE_ENV: "production", STAGING: "false", OTP_EXPOSE_IN_RESPONSE: "true" };
    expect(evaluateOtpTestConfig(live).effective).toBe(false);
    expect(decideOtpTestDelivery(PHONE_A, live, () => "111111")).toEqual({ testDelivery: false, expose: false, code: undefined });
  });

  it("allows an explicitly marked production staging deployment", () => {
    const staging = { ...base, NODE_ENV: "production", STAGING: "true" };
    expect(decideOtpTestDelivery(PHONE_A, staging, () => "111111")).toMatchObject({ testDelivery: true, expose: true });
  });

  it("generates a secure-path OTP when no fixed test code is configured", () => {
    const generateCode = vi.fn(() => "112233");
    expect(decideOtpTestDelivery(PHONE_A, { ...base, OTP_TEST_CODE: "" }, generateCode)).toMatchObject({ testDelivery: true, code: "112233" });
    expect(generateCode).toHaveBeenCalledOnce();
  });

  it("rejects a malformed or partially malformed allowlist", () => {
    expect(parseOtpTestPhones(`${PHONE_A},not-a-phone`)).toMatchObject({ valid: false });
    expect(parseOtpTestPhones(`${PHONE_A},,${PHONE_B}`)).toMatchObject({ valid: false });
    expect(evaluateOtpTestConfig({ ...base, OTP_TEST_PHONES: `${PHONE_A},${"010"}${"0".repeat(8)}` }).effective).toBe(false);
    expect(evaluateOtpTestConfig({ ...base, OTP_TEST_PHONES: "" }).effective).toBe(false);
  });

  it("matches an Egyptian input only after server-side normalization", () => {
    const normalized = normalizePhone(`010${"0".repeat(8)}`);
    expect(normalized).toMatchObject({ valid: true, e164: PHONE_A, countryIso2: "EG", callingCode: "+20" });
    expect(normalized.valid && decideOtpTestDelivery(normalized.e164, base, () => "111111").testDelivery).toBe(true);
  });

  it("stores a HMAC hash rather than the test OTP", () => {
    process.env.OTP_PEPPER = "test-only-pepper-with-at-least-32-characters";
    const stored = hashOtp(PHONE_A, "654321");
    expect(stored).toMatch(/^[a-f0-9]{64}$/);
    expect(stored).not.toContain("654321");
    expect(otpMatches(PHONE_A, "654321", stored)).toBe(true);
  });

  it("keeps single-use and attempt limits active", () => {
    const future = new Date(Date.now() + 60_000);
    expect(isOtpUsable({ consumedAt: new Date(), expiresAt: future, attempts: 0, maxAttempts: 10 })).toBe("USED");
    expect(isOtpUsable({ consumedAt: null, expiresAt: future, attempts: 10, maxAttempts: 10 })).toBe("RATE_LIMITED");
  });

  it("keeps cooldown and hourly limits active", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    expect(otpRetryAfter(new Date("2026-07-14T11:59:30.000Z"), now, 60)).toBe(30);
    expect(otpRetryAfter(new Date("2026-07-14T11:58:00.000Z"), now, 60)).toBe(0);
    expect(otpHourlyLimitReached(5, 5)).toBe(true);
    expect(otpHourlyLimitReached(4, 5)).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { configuredChannels, deliverWithFallback, type PhoneOtpProvider } from "./phone-otp";

const input = { phoneE164: "+201001234567", countryIso2: "EG" as const, code: "123456", expiresMinutes: 5, locale: "en" as const };
const provider = (channel: "sms" | "whatsapp", status: "SENT" | "FAILED", supports = true): PhoneOtpProvider => ({
  name: channel, channel, configured: () => true, supportsCountry: () => supports,
  sendOtp: vi.fn(async () => ({ status, provider: channel, channel })),
});

describe("phone OTP provider routing", () => {
  it("falls back without changing canonical phone", async () => {
    process.env.PHONE_OTP_FALLBACK_CHANNEL = "sms";
    const result = await deliverWithFallback(input, [provider("whatsapp", "FAILED"), provider("sms", "SENT")], "whatsapp");
    expect(result).toMatchObject({ status: "SENT", channel: "sms" });
  });
  it("does not advertise unsupported channels", () => {
    expect(configuredChannels([provider("sms", "SENT", false), provider("whatsapp", "SENT")], "SA")).toEqual(["whatsapp"]);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeAndValidate, normalizeDestination, normalizeProfilePhone } from "./url";

describe("profile contact normalization", () => {
  it.each([
    ["+37360000000", null, "+37360000000"],
    ["060000000", "MD", "+37360000000"],
    ["415 555 2671", "US", "+14155552671"],
    ["0501234567", "SA", "+966501234567"],
  ])("normalizes %s with explicit country %s", (input, country, expected) => {
    expect(normalizeProfilePhone(input, country)).toBe(expected);
  });

  it("never silently assumes Egypt for a national number", () => {
    expect(normalizeProfilePhone("01001234567")).toBeNull();
    expect(normalizeAndValidate("PHONE", "01001234567")).toEqual({ url: "", valid: false });
    expect(normalizeProfilePhone("123", "EG")).toBeNull();
    expect(normalizeProfilePhone("https://evil.example/4155552671", "US")).toBeNull();
  });

  it("builds validated international phone and WhatsApp destinations", () => {
    expect(normalizeDestination("PHONE", "+14155552671")).toBe("tel:+14155552671");
    expect(normalizeDestination("WHATSAPP_PRIVATE", "https://wa.me/966501234567")).toBe("https://wa.me/966501234567");
    expect(normalizeAndValidate("WHATSAPP_BUSINESS", "060000000", "MD")).toEqual({ url: "https://wa.me/37360000000", valid: true });
  });

  it("normalizes valid email destinations and rejects malformed email", () => {
    expect(normalizeAndValidate("EMAIL", " Person@Example.COM ")).toEqual({ url: "mailto:person@example.com", valid: true });
    expect(normalizeAndValidate("EMAIL", "not-an-email")).toEqual({ url: "", valid: false });
  });
});

import { describe, expect, it } from "vitest";
import { normalizePhone, whatsappUrl } from "./phone";

describe("global phone identity", () => {
  it.each(["+201001234567", "00201001234567", "201001234567", "01001234567", "1001234567"])(
    "normalizes Egyptian form %s",
    value => expect(normalizePhone(value, "EG")).toMatchObject({ valid: true, e164: "+201001234567", countryIso2: "EG" }),
  );
  it.each(["+966501234567", "00966501234567", "966501234567", "0501234567", "501234567"])(
    "normalizes Saudi form %s",
    value => expect(normalizePhone(value, "SA")).toMatchObject({ valid: true, e164: "+966501234567", countryIso2: "SA" }),
  );
  it("supports countries beyond MENA", () => {
    expect(normalizePhone("415 555 2671", "US")).toMatchObject({ valid: true, e164: "+14155552671", countryIso2: "US" });
  });
  it("rejects invalid phones and countries", () => {
    expect(normalizePhone("123", "EG").valid).toBe(false);
    expect(normalizePhone("01001234567", "XX")).toEqual({ valid: false, error: "COUNTRY_INVALID" });
  });
  it("builds a consent-ready WhatsApp link from E.164", () => {
    expect(whatsappUrl("+201001234567")).toBe("https://wa.me/201001234567");
  });
});

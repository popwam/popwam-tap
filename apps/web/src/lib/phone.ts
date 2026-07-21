import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

export type PhoneIdentity = {
  e164: string;
  countryIso2: CountryCode;
  callingCode: `+${string}`;
};

export type PhoneResult =
  | ({ valid: true } & PhoneIdentity)
  | { valid: false; error: "PHONE_REQUIRED" | "PHONE_INVALID" | "COUNTRY_INVALID" };

const countries = new Set<CountryCode>(getCountries());

export function isCountryCode(value: string): value is CountryCode {
  return countries.has(value.toUpperCase() as CountryCode);
}

export function defaultPhoneCountry(): CountryCode {
  const configured = process.env.DEFAULT_PHONE_COUNTRY_ISO2 || "EG";
  return isCountryCode(configured) ? configured.toUpperCase() as CountryCode : "EG";
}

/** Parse user input using libphonenumber metadata and return the sole identity format: E.164. */
export function normalizePhone(input: string, selectedCountry: string = defaultPhoneCountry()): PhoneResult {
  const raw = input.trim();
  if (!raw) return { valid: false, error: "PHONE_REQUIRED" };
  if (!isCountryCode(selectedCountry)) return { valid: false, error: "COUNTRY_INVALID" };
  const country = selectedCountry.toUpperCase() as CountryCode;
  const compact = raw.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!/^\+?\d+$/.test(compact)) return { valid: false, error: "PHONE_INVALID" };

  const callingCode = getCountryCallingCode(country);
  const candidates = compact.startsWith("+")
    ? [compact]
    : compact.startsWith(callingCode)
      ? [`+${compact}`, compact]
      : [compact];

  for (const candidate of candidates) {
    const parsed = candidate.startsWith("+")
      ? parsePhoneNumberFromString(candidate)
      : parsePhoneNumberFromString(candidate, country);
    if (!parsed?.isValid() || !parsed.country) continue;
    return {
      valid: true,
      e164: parsed.number,
      countryIso2: parsed.country,
      callingCode: `+${parsed.countryCallingCode}`,
    };
  }
  return { valid: false, error: "PHONE_INVALID" };
}

export function maskPhone(phone: string) {
  return phone.length < 7 ? "***" : `${phone.slice(0, 4)}••••${phone.slice(-3)}`;
}

export function whatsappUrl(phoneE164: string) {
  return `https://wa.me/${phoneE164.replace(/^\+/, "")}`;
}

import type { DestinationType } from "@popwam/db";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { isCountryCode } from "./phone";

export function isSafeDestinationUrl(value: string) {
  const input = value.trim();
  if (!input || /[\u0000-\u001F\u007F]/.test(input)) return false;
  // Internal application routes (for example the dynamic vCard endpoint) are
  // safe, while protocol-relative external URLs beginning with // are not.
  if (/^\/(?!\/)/.test(input) && !input.includes("\\") && !/%(?:2f|5c)/i.test(input)) return true;
  try {
    const url = new URL(input);
    if (url.username || url.password) return false;
    if (["tel:", "mailto:", "sms:"].includes(url.protocol)) return Boolean(url.pathname);
    if (url.protocol === "https:") return Boolean(url.hostname);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch { return false; }
}

function phoneInput(value: string) {
  if (value.toLowerCase().startsWith("tel:")) return value.slice(4);
  try {
    const parsed = new URL(value);
    if (["wa.me", "www.wa.me"].includes(parsed.hostname.toLowerCase())) return `+${parsed.pathname.replace(/\D/g, "")}`;
    return "";
  } catch {
    // Plain phone input is handled below.
  }
  return value;
}

/** Normalize a profile phone without assuming a country. National numbers are
 * accepted only when the caller supplies an explicit ISO-2 country context. */
export function normalizeProfilePhone(raw: string, countryIso2?: string | null) {
  const compact = phoneInput(raw.trim()).replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!/^\+?\d+$/.test(compact)) return null;
  const country = countryIso2 && isCountryCode(countryIso2) ? countryIso2.toUpperCase() as CountryCode : undefined;
  if (!compact.startsWith("+") && !country) return null;
  const parsed = compact.startsWith("+")
    ? parsePhoneNumberFromString(compact)
    : parsePhoneNumberFromString(compact, country);
  return parsed?.isValid() ? parsed.number : null;
}

export function normalizeDestination(type: DestinationType | string, raw: string, countryIso2?: string | null) {
  const value = raw.trim();
  if (!value) return "";
  if (type === "WHATSAPP_BUSINESS" || type === "WHATSAPP_PRIVATE") {
    const phone = normalizeProfilePhone(value, countryIso2);
    return phone ? `https://wa.me/${phone.slice(1)}` : "";
  }
  if (type === "PHONE") {
    const phone = normalizeProfilePhone(value, countryIso2);
    return phone ? `tel:${phone}` : "";
  }
  if (type === "EMAIL") {
    const email = (value.toLowerCase().startsWith("mailto:") ? value.slice(7) : value).trim().toLowerCase();
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : "";
  }
  if (isSafeDestinationUrl(value)) return value;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return `https://${value}`;
  return value;
}

export function normalizeAndValidate(type: DestinationType | string, raw: string, countryIso2?: string | null) {
  const url = normalizeDestination(type, raw, countryIso2);
  return { url, valid: isSafeDestinationUrl(url) };
}

import type { DestinationType } from "@popwam/db";

export function isSafeDestinationUrl(value: string) {
  const input = value.trim();
  if (!input || /[\u0000-\u001F\u007F]/.test(input)) return false;
  // Internal application routes (for example the dynamic vCard endpoint) are
  // safe, while protocol-relative external URLs beginning with // are not.
  if (/^\/(?!\/)/.test(input) && !input.includes("\\") && !/%(?:2f|5c)/i.test(input)) return true;
  try {
    const url = new URL(input);
    if (["tel:", "mailto:", "sms:"].includes(url.protocol)) return Boolean(url.pathname);
    if (url.protocol === "https:") return Boolean(url.hostname);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch { return false; }
}

function egyptPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function normalizeDestination(type: DestinationType | string, raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (type === "WHATSAPP_BUSINESS" || type === "WHATSAPP_PRIVATE") return `https://wa.me/${egyptPhone(value).replace("+", "")}`;
  if (type === "PHONE") return value.startsWith("tel:") ? value : `tel:${egyptPhone(value)}`;
  if (type === "EMAIL") return value.startsWith("mailto:") ? value : `mailto:${value}`;
  if (isSafeDestinationUrl(value)) return value;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return `https://${value}`;
  return value;
}

export function normalizeAndValidate(type: DestinationType | string, raw: string) {
  const url = normalizeDestination(type, raw);
  return { url, valid: isSafeDestinationUrl(url) };
}

export type PhoneResult = { valid: true; e164: string } | { valid: false; error: "PHONE_REQUIRED" | "PHONE_INVALID" };

export function normalizePhone(input: string): PhoneResult {
  let value = input.trim().replace(/[\s().-]/g, "");
  if (!value) return { valid: false, error: "PHONE_REQUIRED" };
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (/^01[0125]\d{8}$/.test(value)) value = `+20${value.slice(1)}`;
  else if (/^201[0125]\d{8}$/.test(value)) value = `+${value}`;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) return { valid: false, error: "PHONE_INVALID" };
  return { valid: true, e164: value };
}

export function maskPhone(phone: string) {
  return phone.length < 7 ? "***" : `${phone.slice(0, 4)}••••${phone.slice(-3)}`;
}

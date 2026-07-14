import { normalizePhone } from "./phone";

export type OtpTestEnvironment = {
  OTP_TEST_MODE?: string;
  OTP_TEST_PHONES?: string;
  OTP_TEST_CODE?: string;
  OTP_EXPOSE_IN_RESPONSE?: string;
  SMSMISR_ENVIRONMENT?: string;
  NODE_ENV?: string;
  STAGING?: string;
};

const enabled = (value?: string) => value?.trim().toLowerCase() === "true";

export function parseOtpTestPhones(raw?: string) {
  const parts = (raw || "").split(",");
  const entries = parts.map(value => value.trim()).filter(Boolean);
  const invalidEntries: string[] = [];
  if (parts.some(value => !value.trim())) invalidEntries.push("");
  const phones = new Set<string>();
  for (const entry of entries) {
    const normalized = normalizePhone(entry);
    if (!normalized.valid || normalized.e164 !== entry) invalidEntries.push(entry);
    else phones.add(entry);
  }
  return { phones, invalidEntries, valid: invalidEntries.length === 0 && phones.size > 0 };
}

export function evaluateOtpTestConfig(env: OtpTestEnvironment) {
  const allowlist = parseOtpTestPhones(env.OTP_TEST_PHONES);
  const requested = enabled(env.OTP_TEST_MODE);
  const staging = enabled(env.STAGING);
  const environmentAllowed = env.NODE_ENV !== "production" || staging;
  const smsTestEnvironment = env.SMSMISR_ENVIRONMENT?.trim() === "2";
  const fixedCode = env.OTP_TEST_CODE?.trim() || "";
  const fixedCodeValid = !fixedCode || /^\d{6}$/.test(fixedCode);
  const effective = requested && environmentAllowed && smsTestEnvironment && allowlist.valid && fixedCodeValid;
  return {
    requested,
    effective,
    staging,
    environmentAllowed,
    smsTestEnvironment,
    allowlist,
    fixedCode,
    fixedCodeValid,
    expose: effective && enabled(env.OTP_EXPOSE_IN_RESPONSE),
  };
}

export function decideOtpTestDelivery(phone: string, env: OtpTestEnvironment, generateCode: () => string) {
  const config = evaluateOtpTestConfig(env);
  const allowlisted = config.effective && config.allowlist.phones.has(phone);
  return {
    testDelivery: allowlisted,
    expose: allowlisted && config.expose,
    code: allowlisted ? (config.fixedCode || generateCode()) : undefined,
  };
}

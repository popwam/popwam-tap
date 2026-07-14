import "server-only";
import { createOtpCode } from "./otp-crypto";
import { decideOtpTestDelivery, evaluateOtpTestConfig } from "./otp-test-policy";

export function getOtpTestDelivery(phone: string) {
  return decideOtpTestDelivery(phone, process.env, createOtpCode);
}

export function getOtpTestModeSummary() {
  const config = evaluateOtpTestConfig(process.env);
  return {
    enabled: config.effective,
    allowlistedPhoneCount: config.allowlist.valid ? config.allowlist.phones.size : 0,
    exposedInStaging: config.expose,
    malformed: config.requested && (config.allowlist.invalidEntries.length > 0 || !config.fixedCodeValid),
  };
}

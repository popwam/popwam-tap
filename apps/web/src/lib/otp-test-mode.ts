import "server-only";
import { createOtpCode } from "./otp-crypto";
import { decideOtpTestDelivery } from "./otp-test-policy";

export function getOtpTestDelivery(phone: string) {
  return decideOtpTestDelivery(phone, process.env, createOtpCode);
}

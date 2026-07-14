import type { SmsDelivery, SmsOtpInput, SmsProvider } from "./sms";

export async function deliverOtpCode(input: { testDelivery: boolean; provider: SmsProvider | null; otp: SmsOtpInput }): Promise<SmsDelivery> {
  if (input.testDelivery) return { status: "SENT", provider: "test-allowlist", responseCode: "TEST_BYPASS" };
  if (!input.provider) return { status: "FAILED", provider: "unknown", error: "CONFIGURATION" };
  try { return await input.provider.sendOtp(input.otp); }
  catch { return { status: "FAILED", provider: input.provider.name, error: "NETWORK" }; }
}

import "server-only";
import { maskPhone } from "@/lib/phone";
import { parseSmsMisrResponse, smsMisrTransportFailure, toSmsMisrMobile } from "./smsmisr";
import type { SmsRuntimeSettings } from "./runtime";
export { SMSMISR_CODES, parseSmsMisrResponse, smsMisrTransportFailure, toSmsMisrMobile } from "./smsmisr";

export type SmsOtpInput = { to: string; code: string; expiresMinutes: number; locale: "ar" | "en" };
export type SmsDelivery = {
  status: "SENT" | "FAILED";
  provider: string;
  messageId?: string;
  responseCode?: string;
  cost?: string;
  error?: "CONFIGURATION" | "TIMEOUT" | "PROVIDER_REJECTED" | "INVALID_RESPONSE" | "NETWORK";
};
export interface SmsProvider { name: string; sendOtp(input: SmsOtpInput): Promise<SmsDelivery> }

class DevelopmentSmsProvider implements SmsProvider {
  name = "development";
  async sendOtp(input: SmsOtpInput): Promise<SmsDelivery> {
    if (process.env.NODE_ENV === "production") throw new Error("DEVELOPMENT_SMS_DISABLED");
    console.info("Development OTP delivery", { to: maskPhone(input.to), expiresMinutes: input.expiresMinutes, status: "SENT" });
    return { status: "SENT", provider: this.name, messageId: `dev-${Date.now()}` };
  }
}

class WebhookSmsProvider implements SmsProvider {
  name = "webhook";
  constructor(private readonly runtime?:SmsRuntimeSettings){}
  async sendOtp(input: SmsOtpInput): Promise<SmsDelivery> {
    const url = process.env.SMS_API_URL; const token = process.env.SMS_API_TOKEN;
    if (!url || !token) return { status: "FAILED", provider: this.name, error: "CONFIGURATION" };
    const source=input.locale==="ar"?this.runtime?.templateAr:this.runtime?.templateEn;const message=(source||(input.locale === "ar" ? "رمز POP by POPWAM هو {code}. صالح لمدة {minutes} دقائق." : "Your POP by POPWAM code is {code}. It expires in {minutes} minutes.")).replaceAll("{code}",input.code).replaceAll("{minutes}",String(input.expiresMinutes));
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ to: input.to, message, senderId: this.runtime?.senderName || process.env.SMS_SENDER_ID || "POPWAM" }), cache: "no-store", signal: AbortSignal.timeout(Number(process.env.SMS_TIMEOUT_MS || 10_000)) });
      if (!response.ok) return { status: "FAILED", provider: this.name, responseCode: String(response.status), error: "PROVIDER_REJECTED" };
      const result = await response.json().catch(() => ({})) as { messageId?: unknown };
      return { status: "SENT", provider: this.name, messageId: typeof result.messageId === "string" ? result.messageId : undefined };
    } catch (error) { return { status: "FAILED", provider: this.name, error: error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : "NETWORK" }; }
  }
}

class SmsMisrProvider implements SmsProvider {
  name = "smsmisr";
  async sendOtp(input: SmsOtpInput): Promise<SmsDelivery> {
    const environment = process.env.SMSMISR_ENVIRONMENT; const username = process.env.SMSMISR_USERNAME;
    const password = process.env.SMSMISR_PASSWORD; const sender = process.env.SMSMISR_SENDER_TOKEN;
    const template = process.env.SMSMISR_TEMPLATE_TOKEN; const url = process.env.SMSMISR_BASE_URL || "https://smsmisr.com/api/OTP/";
    if (!environment || !username || !password || !sender || !template) return { status: "FAILED", provider: this.name, error: "CONFIGURATION" };
    let mobile: string;
    try { mobile = toSmsMisrMobile(input.to); } catch { return { status: "FAILED", provider: this.name, responseCode: "4905", error: "PROVIDER_REJECTED" }; }
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ environment, username, password, sender, mobile, template, otp: input.code }), cache: "no-store", signal: AbortSignal.timeout(Number(process.env.SMS_TIMEOUT_MS || 10_000)) });
      const body = await response.json().catch(() => null);
      if (!response.ok && !body) return { status: "FAILED", provider: this.name, responseCode: String(response.status), error: "PROVIDER_REJECTED" };
      return parseSmsMisrResponse(body);
    } catch (error) { return smsMisrTransportFailure(error); }
  }
}

export function getSmsProvider(runtime?:SmsRuntimeSettings): SmsProvider {
  const provider = (runtime?.providerMode&&runtime.providerMode!=="environment"?runtime.providerMode:process.env.SMS_PROVIDER || "development").toLowerCase();
  if (provider === "development" || provider === "test") return new DevelopmentSmsProvider();
  if (provider === "webhook") return new WebhookSmsProvider(runtime);
  if (provider === "smsmisr") return new SmsMisrProvider();
  throw new Error("SMS_PROVIDER_UNKNOWN");
}

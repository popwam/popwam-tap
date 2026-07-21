import type { CountryCode } from "libphonenumber-js";
import type { SmsDelivery, SmsProvider } from "./sms";

export type PhoneOtpChannel = "sms" | "whatsapp";
export type PhoneOtpInput = {
  phoneE164: string;
  countryIso2: CountryCode;
  code: string;
  expiresMinutes: number;
  locale: "ar" | "en";
};
export type PhoneOtpDelivery = SmsDelivery & { channel: PhoneOtpChannel };

export interface PhoneOtpProvider {
  readonly name: string;
  readonly channel: PhoneOtpChannel;
  configured(): boolean;
  supportsCountry(countryIso2: CountryCode): boolean;
  sendOtp(input: PhoneOtpInput): Promise<PhoneOtpDelivery>;
}

export class SmsOtpProviderAdapter implements PhoneOtpProvider {
  readonly channel = "sms" as const;
  readonly name: string;
  constructor(private readonly provider: SmsProvider, private readonly countries: Set<string> | null = null) {
    this.name = provider.name;
  }
  configured() { return true; }
  supportsCountry(countryIso2: CountryCode) { return this.countries === null || this.countries.has(countryIso2); }
  async sendOtp(input: PhoneOtpInput): Promise<PhoneOtpDelivery> {
    const result = await this.provider.sendOtp({ to: input.phoneE164, code: input.code, expiresMinutes: input.expiresMinutes, locale: input.locale });
    return { ...result, channel: this.channel };
  }
}

export class WhatsAppOtpProvider implements PhoneOtpProvider {
  readonly channel = "whatsapp" as const;
  readonly name = "meta-whatsapp";
  configured() {
    return process.env.WHATSAPP_OTP_ENABLED === "true" && Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_AUTH_TEMPLATE_NAME,
    );
  }
  supportsCountry() { return this.configured(); }
  async sendOtp(input: PhoneOtpInput): Promise<PhoneOtpDelivery> {
    if (!this.configured()) return { status: "FAILED", provider: this.name, channel: this.channel, error: "CONFIGURATION" };
    const endpoint = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || "v23.0"}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.phoneE164.slice(1),
      type: "template",
      template: {
        name: process.env.WHATSAPP_AUTH_TEMPLATE_NAME,
        language: { code: process.env.WHATSAPP_AUTH_TEMPLATE_LANGUAGE || "en_US" },
        components: [
          { type: "body", parameters: [{ type: "text", text: input.code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: input.code }] },
        ],
      },
    };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(Number(process.env.PHONE_OTP_TIMEOUT_MS || 10_000)),
      });
      const result = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { code?: number } };
      if (!response.ok) return { status: "FAILED", provider: this.name, channel: this.channel, responseCode: String(result.error?.code || response.status), error: "PROVIDER_REJECTED" };
      return { status: "SENT", provider: this.name, channel: this.channel, messageId: result.messages?.[0]?.id };
    } catch (error) {
      return { status: "FAILED", provider: this.name, channel: this.channel, error: error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "TIMEOUT" : "NETWORK" };
    }
  }
}

export function configuredChannels(providers: PhoneOtpProvider[], country: CountryCode) {
  return providers.filter(provider => provider.configured() && provider.supportsCountry(country)).map(provider => provider.channel);
}

export async function deliverWithFallback(input: PhoneOtpInput, providers: PhoneOtpProvider[], requested?: PhoneOtpChannel) {
  const primary = requested || (process.env.PHONE_OTP_PRIMARY_CHANNEL === "whatsapp" ? "whatsapp" : "sms");
  const fallback = process.env.PHONE_OTP_FALLBACK_CHANNEL === "whatsapp" ? "whatsapp" : "sms";
  const order = [...new Set([primary, fallback])];
  let last: PhoneOtpDelivery | null = null;
  for (const channel of order) {
    const provider = providers.find(candidate => candidate.channel === channel && candidate.configured() && candidate.supportsCountry(input.countryIso2));
    if (!provider) continue;
    last = await provider.sendOtp(input);
    if (last.status === "SENT") return last;
  }
  return last || { status: "FAILED", provider: "none", channel: primary, error: "CONFIGURATION" as const };
}

export function parseCountryRules(value: string, providerName: string) {
  if (providerName !== "smsmisr") return null;
  const countries = value.split(/[\s,]+/).map(item => item.trim().toUpperCase()).filter(item => /^[A-Z]{2}$/.test(item));
  return new Set(countries.length ? countries : ["EG"]);
}

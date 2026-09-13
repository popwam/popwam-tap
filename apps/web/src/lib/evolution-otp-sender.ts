import "server-only";

export class OtpError extends Error {
  constructor(readonly code: string, readonly status = 503, readonly retryAfterSeconds?: number) { super(code); }
}

export function otpConfig(env: Readonly<Record<string, string | undefined>> = process.env) {
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const value = env[name] === undefined ? fallback : Number(env[name]);
    if (!Number.isInteger(value) || value < min || value > max) throw new OtpError("OTP_CONFIGURATION_UNAVAILABLE");
    return value;
  };
  if (!env.OTP_PEPPER || env.OTP_PEPPER.length < 32) throw new OtpError("OTP_CONFIGURATION_UNAVAILABLE");
  return {
    ttl: integer("OTP_TTL_SECONDS", 300, 60, 900),
    cooldown: integer("OTP_RESEND_COOLDOWN_SECONDS", 60, 30, 300),
    attempts: integer("OTP_MAX_ATTEMPTS", 5, 1, 10),
  };
}

export type OtpMessage = { phone: string; code: string; ttl: number; locale: string };
export interface OtpSender { send(input: OtpMessage): Promise<void> }

/** Evolution v2: /message/sendText/{instance}, apikey, {number,text,linkPreview}.
 * Contract: evolution-foundation/evolution-api src/api/{routes,dto}/sendMessage.*.
 * No provider body, credential, message text or phone is logged or returned.
 */
export class EvolutionOtpSender implements OtpSender {
  constructor(private readonly env: Readonly<Record<string, string | undefined>> = process.env, private readonly http: typeof fetch = fetch) {}

  async send(input: OtpMessage) {
    let base: URL;
    try { base = new URL(this.env.EVOLUTION_API_URL || ""); } catch { throw new OtpError("OTP_CONFIGURATION_UNAVAILABLE"); }
    const key = this.env.EVOLUTION_API_KEY?.trim();
    const instance = this.env.EVOLUTION_INSTANCE?.trim();
    if (!key || !instance || base.protocol !== "https:" || base.username || base.password || base.search || base.hash || !/^[\w.-]{1,120}$/.test(instance)) {
      throw new OtpError("OTP_CONFIGURATION_UNAVAILABLE");
    }
    const url = base.toString().replace(/\/$/, "");
    const signal = AbortSignal.timeout(10_000);
    try {
      // Inspect the configured installation before using the v2 contract. No v1 fallback.
      const info = await this.http(`${url}/`, { headers: { apikey: key }, cache: "no-store", redirect: "error", signal });
      const version = await info.json().catch(() => null) as { version?: unknown } | null;
      if (!info.ok || typeof version?.version !== "string" || !/^2\.\d+\.\d+(?:[-+].*)?$/.test(version.version)) throw new OtpError("OTP_PROVIDER_UNAVAILABLE");
      const text = input.locale === "ar"
        ? `رمز التحقق الخاص بك في POP هو ${input.code}. تنتهي صلاحيته خلال ${input.ttl} ثانية. لا تشارك هذا الرمز مع أي شخص.`
        : input.locale === "fr"
          ? `Votre code POP est ${input.code}. Il expire dans ${input.ttl} secondes. Ne partagez ce code avec personne.`
          : `Your POP verification code is ${input.code}. It expires in ${input.ttl} seconds. Do not share this code with anyone.`;
      const response = await this.http(`${url}/message/sendText/${encodeURIComponent(instance)}`, {
        method: "POST", headers: { apikey: key, "content-type": "application/json" },
        body: JSON.stringify({ number: input.phone.slice(1), text, linkPreview: false }),
        cache: "no-store", redirect: "error", signal,
      });
      const result = await response.json().catch(() => null) as { key?: { id?: unknown }; status?: unknown } | null;
      if (!response.ok || typeof result?.key?.id !== "string" || !result.key.id || result.status === "ERROR") throw new OtpError("OTP_DELIVERY_FAILED");
    } catch (error) {
      if (error instanceof OtpError) throw error;
      throw new OtpError(signal.aborted ? "OTP_PROVIDER_TIMEOUT" : "OTP_DELIVERY_FAILED");
    }
  }
}

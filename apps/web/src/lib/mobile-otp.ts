import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@popwam/db";
import { normalizePhone } from "./phone";
import { createOtpCode, hashOtp, hashRequestIp, otpMatches } from "./otp-crypto";
import { EvolutionOtpSender, OtpError, otpConfig, type OtpSender } from "./evolution-otp-sender";
import { issueMobileSession } from "./mobile-auth";
import { markNewAccountForProfileBootstrap } from "./profile-bootstrap";

const provider = "evolution-whatsapp";
const purpose = "LOGIN" as const;
export { OtpError };

export function loginPhone(phone: string, country?: string) {
  if (phone.length > 64 || !/^[+\d\s().-]+$/.test(phone)) throw new OtpError("PHONE_INVALID", 400);
  const normalized = normalizePhone(phone, country);
  if (!normalized.valid) throw new OtpError("PHONE_INVALID", 400);
  return normalized;
}

async function serializable<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(run, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 }); }
    catch (error) {
      if (attempt >= 3 || !(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2034", "P2002"].includes(error.code)) throw error;
    }
  }
}

export async function requestMobileOtp(input: { phone: string; countryCode?: string; locale?: string; source: string }, sender: OtpSender = new EvolutionOtpSender()) {
  const phone = loginPhone(input.phone, input.countryCode);
  const config = otpConfig();
  const country = await prisma.phoneCountryConfig.findUnique({ where: { iso2: phone.countryIso2 } });
  if (!country || !country.enabled) throw new OtpError("PHONE_COUNTRY_UNAVAILABLE", 400);
  const now = new Date();
  const code = createOtpCode();
  const id = randomUUID();
  const source = hashRequestIp(input.source);
  await serializable(async tx => {
    const latest = await tx.otpChallenge.findFirst({ where: { phone: phone.e164, purpose, provider }, orderBy: { createdAt: "desc" } });
    const wait = latest ? Math.ceil((latest.createdAt.getTime() + config.cooldown * 1000 - now.getTime()) / 1000) : 0;
    if (wait > 0) throw new OtpError("OTP_COOLDOWN", 429, wait);
    const since = new Date(now.getTime() - 3_600_000);
    const count = await tx.otpChallenge.count({ where: { phone: phone.e164, purpose, provider, createdAt: { gte: since } } });
    if (count >= 5) throw new OtpError("OTP_RATE_LIMITED", 429, 3600);
    const bySource = await tx.otpChallenge.count({ where: { requestIpHash: source, purpose, provider, createdAt: { gte: since } } });
    if (bySource >= 30) throw new OtpError("OTP_RATE_LIMITED", 429, 3600);
    await tx.otpChallenge.updateMany({ where: { phone: phone.e164, purpose, provider, consumedAt: null }, data: { consumedAt: now } });
    await tx.otpChallenge.create({ data: {
      id, phone: phone.e164, purpose, provider, channel: "WHATSAPP", otpHash: hashOtp(`${id}:${phone.e164}`, code),
      expiresAt: new Date(now.getTime() + config.ttl * 1000), maxAttempts: config.attempts, requestIpHash: source,
      createdAt: now, lastSentAt: now,
    } });
  });
  try {
    await sender.send({ phone: phone.e164, code, ttl: config.ttl, locale: input.locale || "en" });
    await prisma.otpChallenge.update({ where: { id }, data: { deliveryStatus: "SENT" } });
  } catch (error) {
    await prisma.otpChallenge.update({ where: { id }, data: { deliveryStatus: "FAILED", consumedAt: new Date() } });
    throw error instanceof OtpError ? error : new OtpError("OTP_DELIVERY_FAILED");
  }
  return { ok: true, challengeId: id, expiresInSeconds: Math.max(0, Math.floor((now.getTime() + config.ttl * 1000 - Date.now()) / 1000)), resendAfterSeconds: Math.max(0, Math.ceil((now.getTime() + config.cooldown * 1000 - Date.now()) / 1000)) };
}

export async function verifyMobileOtp(input: { challengeId: string; phone: string; code: string; deviceName?: string; appVersion?: string }) {
  const phone = loginPhone(input.phone);
  otpConfig();
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(input.challengeId) || !/^\d{6}$/.test(input.code)) throw new OtpError("OTP_INVALID", 400);
  const result = await serializable(async tx => {
    const now = new Date();
    const challenge = await tx.otpChallenge.findFirst({ where: { id: input.challengeId, phone: phone.e164, purpose, provider } });
    if (!challenge) return { error: "OTP_INVALID" } as const;
    if (challenge.consumedAt) return { error: "OTP_USED" } as const;
    if (challenge.expiresAt <= now) return { error: "OTP_EXPIRED" } as const;
    if (challenge.attempts >= challenge.maxAttempts) return { error: "OTP_ATTEMPTS_EXHAUSTED" } as const;
    if (challenge.deliveryStatus !== "SENT") return { error: "OTP_INVALID" } as const;
    if (!otpMatches(`${challenge.id}:${phone.e164}`, input.code, challenge.otpHash)) {
      // Return, do not throw: incorrect attempts must COMMIT.
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return { error: challenge.attempts + 1 >= challenge.maxAttempts ? "OTP_ATTEMPTS_EXHAUSTED" : "OTP_INVALID" } as const;
    }
    const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attempts: challenge.attempts, expiresAt: { gt: now } }, data: { consumedAt: now, deliveryStatus: "VERIFIED" } });
    if (consumed.count !== 1) return { error: "OTP_USED" } as const;
    const owners = await tx.user.findMany({ where: { OR: [{ phoneE164: phone.e164 }, { phone: phone.e164 }] }, take: 2 });
    if (owners.length > 1 || owners[0]?.status && owners[0].status !== "ACTIVE") return { error: "OTP_ACCOUNT_UNAVAILABLE" } as const;
    const isNewAccount = owners.length === 0;
    let user = owners[0];
    if (!user) {
      // User.email is required by the existing schema. This non-deliverable internal
      // identity is never copied into a public profile or used as contact email.
      user = await tx.user.create({ data: { email: `phone-${randomUUID()}@auth.popwam.invalid`, name: null,
        phone: phone.e164, phoneE164: phone.e164, phoneCountryIso2: phone.countryIso2, phoneCallingCode: phone.callingCode, phoneVerifiedAt: now, lastLoginAt: now } });
      const plan = await tx.plan.findUnique({ where: { slug: "free" } });
      if (!plan) throw new OtpError("OTP_CONFIGURATION_UNAVAILABLE");
      await tx.userPlan.create({ data: { userId: user.id, planId: plan.id } });
      await markNewAccountForProfileBootstrap(tx, user.id);
    } else {
      user = await tx.user.update({ where: { id: user.id }, data: { phoneE164: phone.e164, phoneCountryIso2: phone.countryIso2, phoneCallingCode: phone.callingCode, phoneVerifiedAt: now, lastLoginAt: now } });
    }
    const progress = await tx.onboardingProgress.findUnique({ where: { userId: user.id } });
    const setupData = progress?.data as Record<string, unknown> | undefined;
    const needsOnboarding = isNewAccount || (setupData?.phaseCNewAccount === true && (setupData?.phaseCProfileBootstrapComplete !== true || !progress?.completedAt));
    const session = await issueMobileSession(tx, user, input.deviceName, undefined, { authMethod: "OTP", appVersion: input.appVersion });
    await tx.auditLog.create({ data: { actorId: user.id, operation: "auth.whatsapp_otp.verified", metadata: { newUser: isNewAccount } } });
    return { ok: true, ...session, isNewAccount, needsOnboarding, nextAction: needsOnboarding ? "PROFILE_SETUP" : "AUTHENTICATED",
      user: { id: user.id, name: user.name, phone: user.phoneE164, email: user.email, role: user.role, locale: user.locale } };
  });
  if ("error" in result) throw new OtpError(result.error!, result.error === "OTP_ATTEMPTS_EXHAUSTED" ? 429 : 400);
  return result;
}

import "server-only";
import { OtpPurpose, Prisma, prisma } from "@popwam/db";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { createOtpCode, hashOtp, hashPhone, otpMatches } from "@/lib/otp-crypto";
import { getSmsProvider, type SmsDelivery } from "@/lib/sms";
import { getSmsRuntimeSettings } from "@/lib/sms/runtime";
import { isOtpUsable, otpHourlyLimitReached, otpPolicyFromEnv, otpRetryAfter } from "@/lib/otp-policy";
import { getOtpTestDelivery } from "@/lib/otp-test-mode";
import { deliverWithFallback, parseCountryRules, SmsOtpProviderAdapter, WhatsAppOtpProvider, type PhoneOtpChannel } from "@/lib/phone-otp";
import { ensureUserDefaultsInTransaction } from "@/lib/ensure-user";
import { issueMobileSession } from "@/lib/mobile-auth";

export async function sendMobileOtp(rawPhone: string, locale: "ar" | "en", countryIso2?: string, channel?: PhoneOtpChannel) {
  const normalized = normalizePhone(rawPhone, countryIso2);
  if (!normalized.valid) return { ok: false as const, status: 400, error: "PHONE_INVALID" };
  const now = new Date(); const policy = otpPolicyFromEnv();
  const latest = await prisma.otpChallenge.findFirst({ where: { phone: normalized.e164 }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (otpRetryAfter(latest?.createdAt || null, now, policy.resendSeconds) > 0) return { ok: false as const, status: 429, error: "OTP_COOLDOWN" };
  const phoneHash = hashPhone(normalized.e164);
  const recentSendCount = await prisma.otpSendLog.count({ where: { phoneHash, createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } } });
  if (otpHourlyLimitReached(recentSendCount, policy.hourlySendLimit)) return { ok: false as const, status: 429, error: "OTP_LIMIT_REACHED" };
  const testDelivery = getOtpTestDelivery(normalized.e164); const code = testDelivery.code || createOtpCode();const runtime=await getSmsRuntimeSettings(); const smsProvider = testDelivery.testDelivery||!runtime.enabled ? null : getSmsProvider(runtime);
  const providers = [...(smsProvider ? [new SmsOtpProviderAdapter(smsProvider, parseCountryRules(runtime.countryRules, smsProvider.name))] : []), new WhatsAppOtpProvider()];
  const delivery: SmsDelivery & { channel: PhoneOtpChannel } = testDelivery.testDelivery
    ? { status: "SENT", provider: "test-allowlist", channel: channel || "sms", responseCode: "TEST_BYPASS" }
    : await deliverWithFallback({ phoneE164: normalized.e164, countryIso2: normalized.countryIso2, code, expiresMinutes: policy.expiryMinutes, locale }, providers, channel);
  const providerName = delivery.provider;
  const challenge = await prisma.otpChallenge.create({ data: { phone: normalized.e164, purpose: OtpPurpose.LOGIN, otpHash: hashOtp(normalized.e164, code), expiresAt: new Date(now.getTime() + policy.expiryMinutes * 60_000), maxAttempts: policy.maxAttempts, provider: providerName, channel: delivery.channel.toUpperCase() as "SMS" | "WHATSAPP" } });
  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { deliveryStatus: delivery.status, providerMessageId: delivery.messageId } }),
    prisma.otpSendLog.create({ data: { phoneHash, purpose: OtpPurpose.LOGIN, status: delivery.status, provider: providerName, responseCode: delivery.responseCode, messageId: delivery.messageId, cost: delivery.cost } }),
  ]);
  if (delivery.status !== "SENT") return { ok: false as const, status: 503, error: "OTP_SEND_FAILED" };
  return { ok: true as const, challengeId: challenge.id, maskedPhone: maskPhone(normalized.e164), expiresIn: policy.expiryMinutes * 60, resendAfter: policy.resendSeconds, ...(testDelivery.expose ? { testOtp: code, testingOnly: true as const } : {}) };
}

export async function verifyMobileOtp(challengeId: string, code: string, deviceName?: string) {
  if (!challengeId || !/^[0-9]{6}$/.test(code)) return null;
  try { return await prisma.$transaction(async tx => {
    const challenge = await tx.otpChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== "LOGIN" || challenge.deliveryStatus !== "SENT" || isOtpUsable(challenge) !== "VALID") return null;
    if (!otpMatches(challenge.phone, code, challenge.otpHash)) { await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } }); return null; }
    let user = await tx.user.findFirst({ where: { OR: [{ phoneE164: challenge.phone }, { phone: challenge.phone }] } });
    if (user && user.status !== "ACTIVE") return null;
    if (!user) { const suffix = hashPhone(challenge.phone).slice(0, 24); const parsed=normalizePhone(challenge.phone);if(!parsed.valid)return null; user = await tx.user.create({ data: { email: `phone-${suffix}@otp.popwam.invalid`, phone: challenge.phone, phoneE164:parsed.e164,phoneCountryIso2:parsed.countryIso2,phoneCallingCode:parsed.callingCode, phoneVerifiedAt: new Date(), name: challenge.phone } }); }
    await ensureUserDefaultsInTransaction(tx, user.id);
    await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date(), deliveryStatus: "VERIFIED" } });
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), phoneVerifiedAt: user.phoneVerifiedAt || new Date() } });
    const session = await issueMobileSession(tx, user, deviceName);
    return { session, user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, locale: user.locale } };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10_000,
    timeout: 30_000,
  }); } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("MOBILE_OTP_VERIFY_FAILED", error);
    return null;
  }
}

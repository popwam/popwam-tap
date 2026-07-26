import "server-only";

import { prisma, Prisma } from "@popwam/db";
import type { PopSessionContext } from "@/lib/security-inventory";
import { consumeStepUpGrant } from "@/lib/security-step-up";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { createOtpCode, hashOtp, hashPhone, hashRequestIp, otpMatches } from "@/lib/otp-crypto";
import { getOtpTestDelivery } from "@/lib/otp-test-mode";
import { getSmsProvider, type SmsDelivery } from "@/lib/sms";
import { getSmsRuntimeSettings } from "@/lib/sms/runtime";
import { deliverWithFallback, parseCountryRules, SmsOtpProviderAdapter, WhatsAppOtpProvider, type PhoneOtpChannel } from "@/lib/phone-otp";
import { isOtpUsable, otpPolicyFromEnv } from "@/lib/otp-policy";

function requestAddress(request: Request) {
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",").map(value => value.trim()).filter(Boolean);
  return request.headers.get("x-real-ip")?.trim() || forwarded.at(-1) || "unknown";
}

export async function startPhoneChange(
  request: Request,
  context: PopSessionContext,
  input: { phone: string; countryIso2?: string; locale: "ar" | "en"; channel?: PhoneOtpChannel },
  grantToken: string | null,
) {
  if (!context.bindingHash) throw new Error("SESSION_CONTEXT_UPGRADE_REQUIRED");
  const normalized = normalizePhone(input.phone, input.countryIso2);
  if (!normalized.valid) throw new Error("PHONE_INVALID");
  const duplicate = await prisma.user.findFirst({ where: { id: { not: context.user.id }, OR: [{ phoneE164: normalized.e164 }, { phone: normalized.e164 }] }, select: { id: true } });
  if (duplicate) throw new Error("PHONE_UNAVAILABLE");
  const policy = otpPolicyFromEnv();
  const code = getOtpTestDelivery(normalized.e164).code || createOtpCode();
  const now = new Date();
  const challenge = await prisma.$transaction(async tx => {
    await consumeStepUpGrant(tx, context, "CHANGE_PHONE", grantToken);
    return tx.otpChallenge.create({
      data: {
        phone: normalized.e164,
        purpose: "CHANGE_PHONE",
        securityUserId: context.user.id,
        sessionBindingHash: context.bindingHash!,
        otpHash: hashOtp(normalized.e164, code),
        expiresAt: new Date(now.getTime() + policy.expiryMinutes * 60_000),
        maxAttempts: policy.maxAttempts,
        provider: "pending",
        channel: (input.channel || "sms").toUpperCase() as "SMS" | "WHATSAPP",
        requestIpHash: hashRequestIp(requestAddress(request)),
      },
    });
  }, { isolationLevel: "Serializable" });
  const testDelivery = getOtpTestDelivery(normalized.e164);
  const runtime = await getSmsRuntimeSettings();
  const smsProvider = testDelivery.testDelivery || !runtime.enabled ? null : getSmsProvider(runtime);
  const providers = [
    ...(smsProvider ? [new SmsOtpProviderAdapter(smsProvider, parseCountryRules(runtime.countryRules, smsProvider.name))] : []),
    new WhatsAppOtpProvider(),
  ];
  const delivery: SmsDelivery & { channel: PhoneOtpChannel } = testDelivery.testDelivery
    ? { status: "SENT", provider: "test-allowlist", channel: input.channel || "sms", responseCode: "TEST_BYPASS" }
    : await deliverWithFallback({ phoneE164: normalized.e164, countryIso2: normalized.countryIso2, code, expiresMinutes: policy.expiryMinutes, locale: input.locale }, providers, input.channel);
  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { provider: delivery.provider, channel: delivery.channel.toUpperCase() as "SMS" | "WHATSAPP", deliveryStatus: delivery.status, providerMessageId: delivery.messageId } }),
    prisma.otpSendLog.create({ data: { phoneHash: hashPhone(normalized.e164), purpose: "CHANGE_PHONE", status: delivery.status, provider: delivery.provider, responseCode: delivery.responseCode, messageId: delivery.messageId, cost: delivery.cost } }),
  ]);
  if (delivery.status !== "SENT") throw new Error("OTP_SEND_FAILED");
  return { challengeId: challenge.id, maskedPhone: maskPhone(normalized.e164), expiresIn: policy.expiryMinutes * 60 };
}

export async function verifyPhoneChange(context: PopSessionContext, challengeId: string, code: string) {
  if (!context.bindingHash || !/^\d{6}$/.test(code)) return false;
  return prisma.$transaction(async tx => {
    const challenge = await tx.otpChallenge.findFirst({
      where: { id: challengeId, securityUserId: context.user.id, purpose: "CHANGE_PHONE", sessionBindingHash: context.bindingHash! },
    });
    if (!challenge || isOtpUsable(challenge) !== "VALID") return false;
    if (!otpMatches(challenge.phone, code, challenge.otpHash)) {
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return false;
    }
    const duplicate = await tx.user.findFirst({ where: { id: { not: context.user.id }, OR: [{ phoneE164: challenge.phone }, { phone: challenge.phone }] }, select: { id: true } });
    if (duplicate) return false;
    const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date(), deliveryStatus: "VERIFIED" } });
    if (consumed.count !== 1) return false;
    const parsed = normalizePhone(challenge.phone);
    if (!parsed.valid) return false;
    await tx.user.update({
      where: { id: context.user.id },
      data: { phone: parsed.e164, phoneE164: parsed.e164, phoneCountryIso2: parsed.countryIso2, phoneCallingCode: parsed.callingCode, phoneVerifiedAt: new Date() },
    });
    await tx.auditLog.create({ data: { actorId: context.user.id, operation: "security.phone.changed", metadata: { outcome: "SUCCESS" } } });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function requestAccountDeletion(context: PopSessionContext, grantToken: string | null) {
  return prisma.$transaction(async tx => {
    await consumeStepUpGrant(tx, context, "DELETE_ACCOUNT", grantToken);
    const existing = await tx.accountDeletionRequest.findFirst({ where: { userId: context.user.id, status: { in: ["REQUESTED", "REVIEWING"] } }, orderBy: { requestedAt: "desc" } });
    if (existing) return { idempotent: true, status: existing.status };
    const request = await tx.accountDeletionRequest.create({ data: { userId: context.user.id } });
    await tx.auditLog.create({ data: { actorId: context.user.id, operation: "security.account_deletion.requested", targetId: request.id, metadata: { lifecycle: "REQUESTED" } } });
    return { idempotent: false, status: request.status };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

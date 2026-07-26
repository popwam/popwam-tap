import "server-only";

import { randomBytes } from "node:crypto";
import {
  generateAuthenticationOptions,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma, type Prisma, StepUpMethod, StepUpPurpose } from "@popwam/db";
import type { PopSessionContext } from "@/lib/security-inventory";
import { createOtpCode, hashOtp, hashPhone, hashRequestIp, otpMatches } from "@/lib/otp-crypto";
import { getOtpTestDelivery } from "@/lib/otp-test-mode";
import { getSmsProvider, type SmsDelivery } from "@/lib/sms";
import { getSmsRuntimeSettings } from "@/lib/sms/runtime";
import { deliverWithFallback, parseCountryRules, SmsOtpProviderAdapter, WhatsAppOtpProvider, type PhoneOtpChannel } from "@/lib/phone-otp";
import { isOtpUsable, otpHourlyLimitReached, otpPolicyFromEnv, otpRetryAfter } from "@/lib/otp-policy";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { passkeyChallengeHash, passkeyConfig } from "@/lib/passkeys";
import { consumeVerifiedPasskeyAssertion, verifyPasskeyAssertion, type PasskeyAssertionLookup } from "@/lib/passkey-authentication";
import { securityHash } from "@/lib/security-session";

const GRANT_TTL_MS = 7 * 60_000;
const PURPOSES = new Set(Object.values(StepUpPurpose));
const METHODS = new Set(Object.values(StepUpMethod));

export function parseStepUpPurpose(value: unknown) {
  return typeof value === "string" && PURPOSES.has(value as StepUpPurpose) ? value as StepUpPurpose : null;
}

export function parseStepUpMethod(value: unknown) {
  return typeof value === "string" && METHODS.has(value as StepUpMethod) ? value as StepUpMethod : null;
}

export const stepUpPurposePolicy: Record<StepUpPurpose, { methods: StepUpMethod[]; singleUse: true }> = {
  CHANGE_PHONE: { methods: ["PASSKEY", "OTP"], singleUse: true },
  DELETE_ACCOUNT: { methods: ["PASSKEY", "OTP"], singleUse: true },
  ADD_PASSKEY: { methods: ["PASSKEY", "OTP"], singleUse: true },
  REMOVE_PASSKEY: { methods: ["PASSKEY", "OTP"], singleUse: true },
  REVOKE_SESSION: { methods: ["PASSKEY", "OTP"], singleUse: true },
  REVOKE_OTHER_SESSIONS: { methods: ["PASSKEY", "OTP"], singleUse: true },
  PRODUCT_LOST: { methods: ["PASSKEY", "OTP"], singleUse: true },
  PRODUCT_TRANSFER: { methods: ["PASSKEY", "OTP"], singleUse: true },
  SECURITY_SETTINGS: { methods: ["PASSKEY", "OTP"], singleUse: true },
  LINK_DEVICE_APPROVAL: { methods: ["PASSKEY", "OTP"], singleUse: true },
};

function requestAddress(request: Request) {
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",").map(value => value.trim()).filter(Boolean);
  return request.headers.get("x-real-ip")?.trim() || forwarded.at(-1) || "unknown";
}

export async function stepUpOptions(context: PopSessionContext, purpose: StepUpPurpose) {
  if (!context.bindingHash) throw new Error("SESSION_CONTEXT_UPGRADE_REQUIRED");
  const [passkeyCount, user] = await Promise.all([
    prisma.passkeyCredential.count({ where: { userId: context.user.id, revokedAt: null } }),
    prisma.user.findUnique({ where: { id: context.user.id }, select: { phoneE164: true, phone: true, phoneVerifiedAt: true } }),
  ]);
  const available = stepUpPurposePolicy[purpose].methods.filter(method =>
    method === "PASSKEY" ? passkeyCount > 0 : Boolean(user?.phoneVerifiedAt && (user.phoneE164 || user.phone)),
  );
  return { purpose, methods: available, preferred: available.includes("PASSKEY") ? "PASSKEY" as const : available[0] || null };
}

export async function createPasskeyStepUpOptions(context: PopSessionContext, purpose: StepUpPurpose) {
  if (!context.bindingHash) throw new Error("SESSION_CONTEXT_UPGRADE_REQUIRED");
  const credentials = await prisma.passkeyCredential.findMany({
    where: { userId: context.user.id, revokedAt: null },
    select: { credentialId: true, transports: true },
  });
  if (!credentials.length) throw new Error("PASSKEY_NOT_AVAILABLE");
  const { rpID } = passkeyConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: credentials.map(row => ({ id: row.credentialId, transports: row.transports as never })),
  });
  await prisma.passkeyChallenge.create({
    data: {
      userId: context.user.id,
      type: "STEP_UP",
      stepUpPurpose: purpose,
      sessionBindingHash: context.bindingHash,
      challengeHash: passkeyChallengeHash(options.challenge),
      expiresAt: new Date(Date.now() + 5 * 60_000),
    },
  });
  return options;
}

export async function sendOtpStepUp(request: Request, context: PopSessionContext, purpose: StepUpPurpose, locale: "ar" | "en", channel?: PhoneOtpChannel) {
  if (!context.bindingHash) throw new Error("SESSION_CONTEXT_UPGRADE_REQUIRED");
  const user = await prisma.user.findUnique({ where: { id: context.user.id }, select: { phoneE164: true, phone: true, phoneVerifiedAt: true } });
  const phone = user?.phoneE164 || user?.phone;
  if (!phone || !user.phoneVerifiedAt) throw new Error("PHONE_RECOVERY_UNAVAILABLE");
  const normalized = normalizePhone(phone);
  if (!normalized.valid) throw new Error("PHONE_RECOVERY_UNAVAILABLE");
  const now = new Date();
  const policy = otpPolicyFromEnv();
  const latest = await prisma.otpChallenge.findFirst({
    where: { securityUserId: context.user.id, purpose: "STEP_UP" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const retryAfter = otpRetryAfter(latest?.createdAt || null, now, policy.resendSeconds);
  if (retryAfter > 0) return { ok: false as const, error: "OTP_COOLDOWN", retryAfter };
  const phoneHash = hashPhone(phone);
  const recent = await prisma.otpSendLog.count({ where: { phoneHash, purpose: "STEP_UP", createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } } });
  if (otpHourlyLimitReached(recent, policy.hourlySendLimit)) return { ok: false as const, error: "OTP_LIMIT_REACHED" };
  const testDelivery = getOtpTestDelivery(phone);
  const code = testDelivery.code || createOtpCode();
  const runtime = await getSmsRuntimeSettings();
  const smsProvider = testDelivery.testDelivery || !runtime.enabled ? null : getSmsProvider(runtime);
  const providers = [
    ...(smsProvider ? [new SmsOtpProviderAdapter(smsProvider, parseCountryRules(runtime.countryRules, smsProvider.name))] : []),
    new WhatsAppOtpProvider(),
  ];
  const delivery: SmsDelivery & { channel: PhoneOtpChannel } = testDelivery.testDelivery
    ? { status: "SENT", provider: "test-allowlist", channel: channel || "sms", responseCode: "TEST_BYPASS" }
    : await deliverWithFallback({ phoneE164: normalized.e164, countryIso2: normalized.countryIso2, code, expiresMinutes: policy.expiryMinutes, locale }, providers, channel);
  const challenge = await prisma.otpChallenge.create({
    data: {
      phone,
      purpose: "STEP_UP",
      securityUserId: context.user.id,
      stepUpPurpose: purpose,
      sessionBindingHash: context.bindingHash,
      otpHash: hashOtp(phone, code),
      expiresAt: new Date(now.getTime() + policy.expiryMinutes * 60_000),
      maxAttempts: policy.maxAttempts,
      provider: delivery.provider,
      channel: delivery.channel.toUpperCase() as "SMS" | "WHATSAPP",
      requestIpHash: hashRequestIp(requestAddress(request)),
      deliveryStatus: delivery.status,
      providerMessageId: delivery.messageId,
    },
  });
  await prisma.otpSendLog.create({
    data: { phoneHash, purpose: "STEP_UP", status: delivery.status, provider: delivery.provider, responseCode: delivery.responseCode, messageId: delivery.messageId, cost: delivery.cost },
  });
  if (delivery.status !== "SENT") return { ok: false as const, error: "OTP_SEND_FAILED" };
  return { ok: true as const, challengeId: challenge.id, maskedPhone: maskPhone(phone), expiresIn: policy.expiryMinutes * 60, resendAfter: policy.resendSeconds };
}

function grantTokenHash(token: string) {
  return securityHash("step-up-grant", token);
}

async function createGrant(tx: Prisma.TransactionClient, context: PopSessionContext, purpose: StepUpPurpose, method: StepUpMethod) {
  if (!context.bindingHash) throw new Error("SESSION_CONTEXT_UPGRADE_REQUIRED");
  const token = randomBytes(32).toString("base64url");
  await tx.stepUpGrant.create({
    data: {
      tokenHash: grantTokenHash(token),
      userId: context.user.id,
      deviceSessionId: context.deviceSessionId,
      webSessionId: context.webSessionId,
      purpose,
      method,
      sessionBindingHash: context.bindingHash,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS),
    },
  });
  await tx.auditLog.create({
    data: { actorId: context.user.id, operation: "security.step_up.succeeded", metadata: { purpose, method, outcome: "SUCCESS" } },
  });
  return { grantToken: token, expiresIn: Math.floor(GRANT_TTL_MS / 1000), method, purpose };
}

export async function verifyPasskeyStepUp(context: PopSessionContext, purpose: StepUpPurpose, assertion: AuthenticationResponseJSON | null) {
  if (!context.bindingHash) throw new Error("SESSION_CONTEXT_UPGRADE_REQUIRED");
  const lookup: PasskeyAssertionLookup = {
    findChallenge: (_type, challengeHash, now) => prisma.passkeyChallenge.findFirst({
      where: {
        type: "STEP_UP",
        userId: context.user.id,
        stepUpPurpose: purpose,
        sessionBindingHash: context.bindingHash!,
        challengeHash,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true },
    }),
    findCredential: credentialId => prisma.passkeyCredential.findFirst({
      where: { credentialId, userId: context.user.id, revokedAt: null },
      include: { user: { select: { status: true } } },
    }),
  };
  const proof = await verifyPasskeyAssertion(assertion, context.channel, undefined, lookup, "STEP_UP");
  if (!proof || proof.userId !== context.user.id) return null;
  return prisma.$transaction(async tx => {
    await consumeVerifiedPasskeyAssertion(tx, proof);
    return createGrant(tx, context, purpose, "PASSKEY");
  }, { isolationLevel: "Serializable" });
}

export async function verifyOtpStepUp(context: PopSessionContext, purpose: StepUpPurpose, challengeId: string, code: string) {
  if (!context.bindingHash || !/^\d{6}$/.test(code)) return null;
  return prisma.$transaction(async tx => {
    const challenge = await tx.otpChallenge.findFirst({
      where: {
        id: challengeId,
        securityUserId: context.user.id,
        purpose: "STEP_UP",
        stepUpPurpose: purpose,
        sessionBindingHash: context.bindingHash!,
      },
    });
    if (!challenge || isOtpUsable(challenge) !== "VALID") return null;
    if (!otpMatches(challenge.phone, code, challenge.otpHash)) {
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      await tx.auditLog.create({ data: { actorId: context.user.id, operation: "security.step_up.failed", metadata: { purpose, method: "OTP", outcome: "INVALID_PROOF" } } });
      return null;
    }
    const consumed = await tx.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: challenge.maxAttempts } },
      data: { consumedAt: new Date(), deliveryStatus: "VERIFIED" },
    });
    if (consumed.count !== 1) return null;
    return createGrant(tx, context, purpose, "OTP");
  }, { isolationLevel: "Serializable" });
}

export async function consumeStepUpGrant(
  tx: Prisma.TransactionClient,
  context: PopSessionContext,
  purpose: StepUpPurpose,
  token: string | null | undefined,
) {
  if (!context.bindingHash || !token || token.length < 32 || token.length > 256) throw new Error("STEP_UP_REQUIRED");
  const now = new Date();
  const grant = await tx.stepUpGrant.findUnique({ where: { tokenHash: grantTokenHash(token) } });
  if (!grant ||
      grant.userId !== context.user.id ||
      grant.purpose !== purpose ||
      grant.sessionBindingHash !== context.bindingHash ||
      grant.expiresAt <= now ||
      grant.consumedAt) throw new Error("STEP_UP_REQUIRED");
  const consumed = await tx.stepUpGrant.updateMany({
    where: {
      id: grant.id,
      userId: context.user.id,
      purpose,
      sessionBindingHash: context.bindingHash,
      expiresAt: { gt: now },
      consumedAt: null,
    },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) throw new Error("STEP_UP_REQUIRED");
  return { method: grant.method, grantId: grant.id };
}

export function stepUpGrantFromRequest(request: Request) {
  return request.headers.get("x-pop-step-up")?.trim() || null;
}

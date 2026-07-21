import { NextResponse } from "next/server";
import { prisma, OtpPurpose } from "@popwam/db";
import { cookies } from "next/headers";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { createOtpCode, hashOtp, hashPhone, hashRequestIp } from "@/lib/otp-crypto";
import { getSmsProvider, type SmsDelivery } from "@/lib/sms";
import { getSmsRuntimeSettings } from "@/lib/sms/runtime";
import { otpHourlyLimitReached, otpPolicyFromEnv, otpRetryAfter } from "@/lib/otp-policy";
import { getOtpTestDelivery } from "@/lib/otp-test-mode";
import { deliverWithFallback, parseCountryRules, SmsOtpProviderAdapter, WhatsAppOtpProvider, type PhoneOtpChannel } from "@/lib/phone-otp";
import { ACTIVATION_COOKIE, OTP_COOKIE, secureCookie } from "@/lib/activation-session";
import { hashActivationToken } from "@/lib/card-tokens";

function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const normalized = normalizePhone(String(body.phone || ""), typeof body.countryIso2 === "string" ? body.countryIso2 : undefined);
  if (!normalized.valid) return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });
  const purpose = body.purpose === "ACTIVATION" ? OtpPurpose.ACTIVATION : OtpPurpose.LOGIN;
  let claimSessionId: string | null = null;
  if (purpose === OtpPurpose.ACTIVATION) {
    const claimToken = (await cookies()).get(ACTIVATION_COOKIE)?.value;
    const claim = claimToken ? await prisma.activationClaimSession.findUnique({ where: { sessionTokenHash: hashActivationToken(claimToken) } }) : null;
    if (!claim || claim.status !== "PENDING_OTP" || claim.expiresAt <= new Date()) return NextResponse.json({ ok: false, error: "SESSION_EXPIRED" }, { status: 400 });
    claimSessionId = claim.id;
  }

  const now = new Date();
  const policy = otpPolicyFromEnv();
  const latest = await prisma.otpChallenge.findFirst({ where: { phone: normalized.e164 }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  const retryAfter = otpRetryAfter(latest?.createdAt || null, now, policy.resendSeconds);
  if (retryAfter > 0) {
    return NextResponse.json({ ok: false, error: "OTP_COOLDOWN", retryAfter }, { status: 429, headers: { "retry-after": String(retryAfter) } });
  }
  const phoneHash = hashPhone(normalized.e164);
  const hourStart = new Date(now.getTime() - 60 * 60_000);
  const recentSendCount = await prisma.otpSendLog.count({ where: { phoneHash, createdAt: { gte: hourStart } } });
  if (otpHourlyLimitReached(recentSendCount, policy.hourlySendLimit)) {
    return NextResponse.json({ ok: false, error: "OTP_LIMIT_REACHED" }, { status: 429 });
  }

  const testDelivery = getOtpTestDelivery(normalized.e164);
  const code = testDelivery.code || createOtpCode();
  const runtime=await getSmsRuntimeSettings();const smsProvider = testDelivery.testDelivery||!runtime.enabled ? null : getSmsProvider(runtime);
  const providers=[...(smsProvider?[new SmsOtpProviderAdapter(smsProvider,parseCountryRules(runtime.countryRules,smsProvider.name))]:[]),new WhatsAppOtpProvider()];
  const requested:PhoneOtpChannel|undefined=body.channel==="whatsapp"?"whatsapp":body.channel==="sms"?"sms":undefined;
  const delivery:SmsDelivery&{channel:PhoneOtpChannel}=testDelivery.testDelivery?{status:"SENT",provider:"test-allowlist",channel:requested||"sms",responseCode:"TEST_BYPASS"}:await deliverWithFallback({phoneE164:normalized.e164,countryIso2:normalized.countryIso2,code,expiresMinutes:policy.expiryMinutes,locale:body.locale==="ar"?"ar":"en"},providers,requested);
  const providerName = delivery.provider;
  const challenge = await prisma.otpChallenge.create({ data: {
    phone: normalized.e164, purpose, claimSessionId, otpHash: hashOtp(normalized.e164, code),
    expiresAt: new Date(now.getTime() + policy.expiryMinutes * 60_000), maxAttempts: policy.maxAttempts,
    provider: providerName, channel:delivery.channel.toUpperCase() as "SMS"|"WHATSAPP", requestIpHash: hashRequestIp(requestIp(request)),
  } });
  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { deliveryStatus: delivery.status, providerMessageId: delivery.messageId } }),
    prisma.otpSendLog.create({ data: { phoneHash, purpose, status: delivery.status, provider: providerName, responseCode: delivery.responseCode, messageId: delivery.messageId, cost: delivery.cost } }),
  ]);
  if (delivery.status !== "SENT") return NextResponse.json({ ok: false, error: "OTP_SEND_FAILED" }, { status: 503 });
  const response = NextResponse.json({ ok: true, maskedPhone: maskPhone(normalized.e164), expiresIn: policy.expiryMinutes * 60, resendAfter: policy.resendSeconds, ...(testDelivery.expose ? { testOtp: code, testingOnly: true } : {}) });
  response.cookies.set(OTP_COOKIE, challenge.id, { ...secureCookie, maxAge: policy.expiryMinutes * 60 });
  return response;
}

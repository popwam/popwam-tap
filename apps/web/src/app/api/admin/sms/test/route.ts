import { getServerSession } from "next-auth";
import { OtpPurpose, prisma } from "@popwam/db";
import { authOptions } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { createOtpCode, hashPhone } from "@/lib/otp-crypto";
import { getSmsProvider, type SmsDelivery } from "@/lib/sms";
import { otpHourlyLimitReached, otpPolicyFromEnv } from "@/lib/otp-policy";
import { getOtpTestDelivery } from "@/lib/otp-test-mode";
import { deliverOtpCode } from "@/lib/otp-delivery";
import { csrfRejected, isSameOriginMutation } from "@/lib/api-auth";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return csrfRejected();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  const body = await request.json().catch(() => ({})); const normalized = normalizePhone(String(body.phone || ""));
  if (!normalized.valid || !normalized.e164.startsWith("+20")) return Response.json({ ok: false, error: "PHONE_INVALID" }, { status: 400 });
  const phoneHash = hashPhone(normalized.e164); const policy = otpPolicyFromEnv();
  const recentSendCount = await prisma.otpSendLog.count({ where: { phoneHash, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } });
  if (otpHourlyLimitReached(recentSendCount, policy.hourlySendLimit)) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  const testDelivery = getOtpTestDelivery(normalized.e164); const code = testDelivery.code || createOtpCode(); const provider = testDelivery.testDelivery ? null : getSmsProvider();
  const delivery: SmsDelivery = await deliverOtpCode({ testDelivery: testDelivery.testDelivery, provider, otp: { to: normalized.e164, code, expiresMinutes: policy.expiryMinutes, locale: "ar" } });
  await prisma.$transaction([prisma.otpSendLog.create({ data: { phoneHash, purpose: OtpPurpose.LOGIN, status: delivery.status, provider: delivery.provider, responseCode: delivery.responseCode, messageId: delivery.messageId, cost: delivery.cost } }), prisma.auditLog.create({ data: { actorId: session.user.id, operation: "sms.test", targetId: delivery.messageId } })]);
  return delivery.status === "SENT" ? Response.json({ ok: true, testBypass: testDelivery.testDelivery }) : Response.json({ ok: false, error: "SEND_FAILED" }, { status: 503 });
}

import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@popwam/db";
import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { passkeyChallengeHash, passkeyConfig, passkeyExpectedOrigins, responseChallenge } from "@/lib/passkeys";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  if (!context.bindingHash) return Response.json({ ok: false, error: "SESSION_CONTEXT_UPGRADE_REQUIRED" }, { status: 409 });
  const body = await request.json().catch(() => null);
  const challenge = responseChallenge(body);
  if (!challenge) return Response.json({ ok: false, error: "PASSKEY_RESPONSE_INVALID" }, { status: 400 });
  const record = await prisma.passkeyChallenge.findFirst({
    where: {
      userId: context.user.id,
      type: "REGISTER",
      sessionBindingHash: context.bindingHash,
      challengeHash: passkeyChallengeHash(challenge),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) return Response.json({ ok: false, error: "PASSKEY_CHALLENGE_INVALID" }, { status: 400 });
  try {
    const config = passkeyConfig();
    const channel = request.headers.get("authorization")?.startsWith("Bearer ") ? "MOBILE" : "WEB";
    const verification = await verifyRegistrationResponse({
      response: body as RegistrationResponseJSON,
      expectedChallenge: challenge,
      expectedOrigin: passkeyExpectedOrigins(channel),
      expectedRPID: config.rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) return Response.json({ ok: false, error: "PASSKEY_VERIFICATION_FAILED" }, { status: 400 });
    const info = verification.registrationInfo;
    await prisma.$transaction(async tx => {
      const consumed = await tx.passkeyChallenge.updateMany({
        where: { id: record.id, sessionBindingHash: context.bindingHash!, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (!consumed.count) throw new Error("PASSKEY_CHALLENGE_REPLAYED");
      const passkey = await tx.passkeyCredential.create({
        data: {
          userId: context.user.id,
          deviceSessionId: context.deviceSessionId,
          credentialId: info.credential.id,
          publicKey: Buffer.from(info.credential.publicKey),
          counter: BigInt(info.credential.counter),
          transports: info.credential.transports || [],
          deviceType: info.credentialDeviceType,
          backedUp: info.credentialBackedUp,
          name: typeof body.name === "string" ? body.name.slice(0, 80) : undefined,
        },
      });
      await tx.auditLog.create({
        data: { actorId: context.user.id, operation: "security.passkey.added", targetId: passkey.id, metadata: { deviceType: info.credentialDeviceType, backedUp: info.credentialBackedUp } },
      });
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "PASSKEY_VERIFICATION_FAILED" }, { status: 400 });
  }
}

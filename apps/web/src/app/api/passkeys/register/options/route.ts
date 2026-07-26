import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@popwam/db";
import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { passkeyChallengeHash, passkeyConfig } from "@/lib/passkeys";
import { consumeStepUpGrant, stepUpGrantFromRequest } from "@/lib/security-step-up";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  if (!context.bindingHash) return Response.json({ ok: false, error: "SESSION_CONTEXT_UPGRADE_REQUIRED" }, { status: 409 });
  const config = passkeyConfig();
  const existing = await prisma.passkeyCredential.findMany({
    where: { userId: context.user.id, revokedAt: null },
    select: { credentialId: true, transports: true },
  });
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userID: Buffer.from(context.user.id),
    userName: context.user.name || context.user.email,
    userDisplayName: context.user.name || "POP user",
    attestationType: "none",
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    excludeCredentials: existing.map(item => ({ id: item.credentialId, transports: item.transports as never })),
  });
  const fresh = Boolean(
    context.lastAuthenticatedAt &&
    context.lastAuthenticatedAt.getTime() > Date.now() - 10 * 60_000 &&
    context.authMethod !== "LEGACY",
  );
  try {
    await prisma.$transaction(async tx => {
      if (existing.length > 0 || !fresh) {
        await consumeStepUpGrant(tx, context, "ADD_PASSKEY", stepUpGrantFromRequest(request));
      }
      await tx.passkeyChallenge.create({
        data: {
          userId: context.user.id,
          type: "REGISTER",
          sessionBindingHash: context.bindingHash!,
          challengeHash: passkeyChallengeHash(options.challenge),
          expiresAt: new Date(Date.now() + 5 * 60_000),
        },
      });
    });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
  return Response.json(options, { headers: { "cache-control": "no-store" } });
}

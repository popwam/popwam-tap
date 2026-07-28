import { generateRegistrationOptions, type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import { prisma } from "@popwam/db";
import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { passkeyChallengeHash, passkeyConfig } from "@/lib/passkeys";
import { passkeyRegistrationEligibility } from "@/lib/passkey-registration-policy";
import { consumeStepUpGrant, StepUpRequiredError, stepUpGrantFromRequest } from "@/lib/security-step-up";

const safeExceptionName = (error: unknown) => error instanceof Error ? error.name.slice(0, 80) : "UnknownError";
const runtime = (stage: string, fields: Record<string, string | boolean>) => console.info("PopAuthRuntime", { stage, ...fields });
const passkeyAlgorithms = [-7, -8, -257] as const;

/**
 * SimpleWebAuthn 13.3.2 unconditionally emits credProps. POP requires discoverable
 * credentials, so it has no registration-policy decision to make from that extension.
 * Keep the shared server contract minimal; clients receive this unchanged.
 */
const withoutUnneededCreationExtensions = (options: PublicKeyCredentialCreationOptionsJSON): PublicKeyCredentialCreationOptionsJSON => {
  const { credProps: _credProps, ...remainingExtensions } = options.extensions || {};
  const { extensions: _extensions, ...rest } = options;
  return Object.keys(remainingExtensions).length ? { ...rest, extensions: remainingExtensions } : rest;
};

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
  const generatedOptions = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userID: Buffer.from(context.user.id),
    userName: context.user.name || context.user.email,
    userDisplayName: context.user.name || "POP user",
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
    supportedAlgorithmIDs: [...passkeyAlgorithms],
    excludeCredentials: existing.map(item => ({ id: item.credentialId, transports: item.transports as never })),
  });
  const options = withoutUnneededCreationExtensions(generatedOptions);
  const eligibility = passkeyRegistrationEligibility({
    activePasskeyCount: existing.length,
    authMethod: context.authMethod,
    lastAuthenticatedAt: context.lastAuthenticatedAt,
  });
  runtime("PASSKEY_REGISTER_CONTEXT", {
    hasExistingPasskey: eligibility.hasExistingPasskey,
    authMethod: context.authMethod,
    freshnessSatisfied: eligibility.freshnessSatisfied,
    stepUpRequired: eligibility.stepUpRequired,
  });
  try {
    await prisma.$transaction(async tx => {
      if (eligibility.stepUpRequired) {
        await consumeStepUpGrant(tx, context, "ADD_PASSKEY", stepUpGrantFromRequest(request));
      }
      runtime("PASSKEY_REGISTER_CHALLENGE_CREATE", { outcome: "started" });
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
    runtime("PASSKEY_REGISTER_CHALLENGE_CREATE", { outcome: "success" });
  } catch (error) {
    if (error instanceof StepUpRequiredError) {
      return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
    }
    console.error("PopAuthRuntime", {
      stage: "PASSKEY_REGISTER_CHALLENGE_CREATE",
      outcome: "failed",
      exception: safeExceptionName(error),
    });
    return Response.json({ ok: false, error: "PASSKEY_OPTIONS_FAILED" }, { status: 500 });
  }
  return Response.json(options, { headers: { "cache-control": "no-store" } });
}

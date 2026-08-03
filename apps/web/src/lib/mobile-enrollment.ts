import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma, type MobileEnrollmentSession, type Prisma, type SystemRole } from "@popwam/db";
import { generateRegistrationOptions, verifyRegistrationResponse, type PublicKeyCredentialCreationOptionsJSON, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { issueMobileSession, hashMobileRefreshToken } from "./mobile-auth";
import { passkeyChallengeHash, passkeyConfig, passkeyExpectedOrigins, responseChallenge } from "./passkeys";
import { verifyMobileDeviceBinding } from "./mobile-device-binding";
import {
  MOBILE_AUTH_CONTRACT_VERSION,
  firebaseOtpConfiguration,
  nextEnrollmentAction,
  sessionScopeForNextAction,
  type MobileAuthChallenge,
  type MobileAuthMethod,
  type MobileEnrollmentView,
} from "./mobile-auth-contract-v2";

type Db = Prisma.TransactionClient | typeof prisma;
const noStore = { "cache-control": "no-store" };

function enrollmentSecret() {
  const value = process.env.MOBILE_ENROLLMENT_SECRET || process.env.MOBILE_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32) throw new Error("MOBILE_ENROLLMENT_SECRET_REQUIRED");
  return value;
}

function enrollmentDigest(namespace: string, value: string) {
  return createHmac("sha256", enrollmentSecret()).update(`${namespace}:${value}`).digest("base64url");
}

export const mobilePhoneHash = (phoneE164: string) => enrollmentDigest("phone", phoneE164);
export const mobileEnrollmentTokenHash = (token: string) => enrollmentDigest("token", token);
export const mobileDeviceChallengeHash = (challenge: string) => enrollmentDigest("device", challenge);
export const mobileFirebaseSubjectHash = (subject: string) => enrollmentDigest("firebase", subject);
export const mobileCompletionKeyHash = (key: string) => enrollmentDigest("completion", key);

export function enrollmentTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Enrollment ")) return null;
  const token = header.slice("Enrollment ".length).trim();
  return token.length >= 48 && token.length <= 256 ? token : null;
}

export class MobileEnrollmentError extends Error {
  constructor(
    readonly code:
      | "AUTH_CHALLENGE_INVALID"
      | "AUTH_CHALLENGE_EXPIRED"
      | "ENROLLMENT_SESSION_REQUIRED"
      | "ENROLLMENT_SESSION_EXPIRED"
      | "ENROLLMENT_SESSION_REPLAYED"
      | "PASSKEY_ENROLLMENT_REQUIRED"
      | "BIOMETRIC_ENROLLMENT_REQUIRED",
    readonly status = 401,
  ) { super(code); }
}

export function enrollmentErrorResponse(error: unknown) {
  const known = error instanceof MobileEnrollmentError ? error : new MobileEnrollmentError("ENROLLMENT_SESSION_REQUIRED", 401);
  return Response.json({ ok: false, error: known.code }, { status: known.status, headers: noStore });
}

export async function createMobileAuthChallenge(input: {
  phoneE164: string;
  deviceCredentialId?: string;
}) {
  const now = new Date();
  const phoneHash = mobilePhoneHash(input.phoneE164);
  const user = await prisma.user.findFirst({
    where: { status: "ACTIVE", OR: [{ phoneE164: input.phoneE164 }, { phone: input.phoneE164 }] },
    select: {
      id: true,
      passkeys: { where: { revokedAt: null }, select: { id: true }, take: 1 },
      mobileDeviceCredentials: {
        where: { credentialId: input.deviceCredentialId || "", status: "ACTIVE", revokedAt: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  const methods: MobileAuthMethod[] = [];
  if (user?.mobileDeviceCredentials.length) methods.push("BIOMETRIC_DEVICE_CREDENTIAL");
  if (user?.passkeys.length) methods.push("PASSKEY");
  methods.push("PHONE_OTP");
  const preferredMethod = methods[0];
  const challenge = await prisma.$transaction(async tx => {
    await tx.mobileAuthChallenge.updateMany({
      where: { phoneHash, state: "OPEN", consumedAt: null, revokedAt: null },
      data: { state: "REVOKED", revokedAt: now },
    });
    return tx.mobileAuthChallenge.create({
      data: {
        userId: user?.id,
        phoneHash,
        accountState: user ? "RETURNING" : "UNKNOWN",
        allowedMethods: methods,
        preferredMethod,
        expiresAt: new Date(now.getTime() + 5 * 60_000),
      },
    });
  }, { isolationLevel: "Serializable" });
  return mobileChallengeView(challenge, {
    nextAction: preferredMethod === "BIOMETRIC_DEVICE_CREDENTIAL"
      ? "AUTHENTICATE_BIOMETRIC"
      : preferredMethod === "PASSKEY" ? "AUTHENTICATE_PASSKEY" : "VERIFY_OTP",
  });
}

type ChallengeRow = {
  id: string;
  accountState: string;
  allowedMethods: string[];
  preferredMethod: string;
  otpLength: number;
  otpResendAfterSeconds: number;
  otpExpiresAfterSeconds: number;
  otpMaximumAttempts: number;
  expiresAt: Date;
};

export function mobileChallengeView(
  row: ChallengeRow,
  input: { nextAction: MobileAuthChallenge["nextAction"]; sessionScope?: MobileAuthChallenge["sessionScope"] },
): MobileAuthChallenge {
  return {
    contractVersion: MOBILE_AUTH_CONTRACT_VERSION,
    challengeId: row.id,
    accountState: row.accountState as MobileAuthChallenge["accountState"],
    allowedMethods: row.allowedMethods as MobileAuthMethod[],
    preferredMethod: row.preferredMethod as MobileAuthMethod,
    otpConfiguration: {
      ...firebaseOtpConfiguration(),
      codeLength: row.otpLength,
      resendAfterSeconds: row.otpResendAfterSeconds,
      expiresAfterSeconds: row.otpExpiresAfterSeconds,
      maximumAttempts: row.otpMaximumAttempts,
    },
    passkeyRequirement: input.nextAction === "ENROLL_PASSKEY" ? "REQUIRED" : row.allowedMethods.includes("PASSKEY") ? "AVAILABLE" : "NOT_REQUIRED",
    biometricEnrollmentPolicy: "REQUIRED_WHEN_AVAILABLE",
    sessionScope: input.sessionScope || sessionScopeForNextAction(input.nextAction),
    nextAction: input.nextAction,
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function requirePhoneChallenge(
  db: Db,
  challengeId: string,
  verifiedPhoneE164: string,
) {
  const now = new Date();
  const challenge = await db.mobileAuthChallenge.findFirst({
    where: { id: challengeId, phoneHash: mobilePhoneHash(verifiedPhoneE164), state: "OPEN", revokedAt: null },
  });
  if (!challenge) throw new MobileEnrollmentError("AUTH_CHALLENGE_INVALID", 400);
  if (challenge.expiresAt <= now) throw new MobileEnrollmentError("AUTH_CHALLENGE_EXPIRED", 410);
  return challenge;
}

export async function createRestrictedEnrollment(
  db: Prisma.TransactionClient,
  input: { challengeId: string; userId: string; firebaseSubject: string },
): Promise<MobileEnrollmentView> {
  const rawToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + 20 * 60_000);
  const challenge = await db.mobileAuthChallenge.update({
    where: { id: input.challengeId },
    data: {
      userId: input.userId,
      accountState: "NEW",
      state: "PHONE_VERIFIED",
      firebaseSubjectHash: mobileFirebaseSubjectHash(input.firebaseSubject),
    },
  });
  await db.mobileEnrollmentSession.create({
    data: {
      tokenHash: mobileEnrollmentTokenHash(rawToken),
      challengeId: challenge.id,
      userId: input.userId,
      expiresAt,
    },
  });
  return {
    ...mobileChallengeView(challenge, { nextAction: "ENROLL_PASSKEY", sessionScope: "ENROLLMENT" }),
    expiresAt: expiresAt.toISOString(),
    enrollmentSession: { token: rawToken, expiresAt: expiresAt.toISOString() },
  };
}

export async function authorizeEnrollment(
  request: Request,
  allowedStates: MobileEnrollmentSession["state"][] = ["PASSKEY_REQUIRED", "BIOMETRIC_REQUIRED", "READY_FOR_UPGRADE"],
  allowCompleted = false,
) {
  const token = enrollmentTokenFromRequest(request);
  if (!token) throw new MobileEnrollmentError("ENROLLMENT_SESSION_REQUIRED", 401);
  const record = await prisma.mobileEnrollmentSession.findUnique({
    where: { tokenHash: mobileEnrollmentTokenHash(token) },
    include: { challenge: true, user: { select: { id: true, role: true, status: true, name: true, email: true, phoneE164: true, phone: true, locale: true } } },
  });
  if (!record || record.abortedAt || record.state === "ABORTED") throw new MobileEnrollmentError("ENROLLMENT_SESSION_REQUIRED", 401);
  const completed = Boolean(record.completedAt) || record.state === "COMPLETED";
  if (completed && !allowCompleted) throw new MobileEnrollmentError("ENROLLMENT_SESSION_REPLAYED", 409);
  const retryDeadline = record.completedAt ? new Date(record.completedAt.getTime() + 5 * 60_000) : null;
  if ((!completed && record.expiresAt <= new Date()) || (completed && (!retryDeadline || retryDeadline <= new Date()))) throw new MobileEnrollmentError("ENROLLMENT_SESSION_EXPIRED", 401);
  if (record.user.status !== "ACTIVE" || (!completed && !allowedStates.includes(record.state))) throw new MobileEnrollmentError("ENROLLMENT_SESSION_REQUIRED", 403);
  return { record, tokenHash: mobileEnrollmentTokenHash(token) };
}

export function enrollmentView(record: MobileEnrollmentSession & { challenge: ChallengeRow }): MobileAuthChallenge {
  const nextAction = nextEnrollmentAction({
    passkeyEnrolled: Boolean(record.passkeyCredentialId),
    biometricOutcome: record.biometricOutcome,
  });
  return {
    ...mobileChallengeView(record.challenge, { nextAction, sessionScope: "ENROLLMENT" }),
    accountState: "NEW",
    expiresAt: record.expiresAt.toISOString(),
  };
}

export async function completeEnrollment(request: Request, completionKey: string, deviceName?: string, appVersion?: string) {
  if (completionKey.length < 32 || completionKey.length > 128) throw new MobileEnrollmentError("ENROLLMENT_SESSION_REQUIRED", 400);
  const { record } = await authorizeEnrollment(request, ["READY_FOR_UPGRADE"], true);
  if (!record.passkeyCredentialId) throw new MobileEnrollmentError("PASSKEY_ENROLLMENT_REQUIRED", 409);
  if (!record.biometricOutcome) throw new MobileEnrollmentError("BIOMETRIC_ENROLLMENT_REQUIRED", 409);
  const keyHash = mobileCompletionKeyHash(completionKey);
  if (record.state === "COMPLETED") {
    if (!record.completionKeyHash || !constantTimeTokenEquals(record.completionKeyHash, keyHash) || !record.completedDeviceSessionId) throw new MobileEnrollmentError("ENROLLMENT_SESSION_REPLAYED", 409);
    return prisma.$transaction(async tx => {
      await tx.mobileRefreshToken.updateMany({ where: { deviceSessionId: record.completedDeviceSessionId, revokedAt: null }, data: { revokedAt: new Date() } });
      const session = await issueMobileSession(tx, record.user as { id: string; role: SystemRole }, deviceName, undefined, { deviceSessionId: record.completedDeviceSessionId, authMethod: "PASSKEY", appVersion });
      await tx.mobileEnrollmentSession.update({ where: { id: record.id }, data: { completionRetriedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: record.userId, operation: "auth.mobile_enrollment.completion_recovered" } });
      return fullEnrollmentResponse(record, session);
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 });
  }
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.mobileEnrollmentSession.updateMany({
      where: { id: record.id, state: "READY_FOR_UPGRADE", completedAt: null, expiresAt: { gt: new Date() } },
      data: { state: "COMPLETED", completedAt: new Date(), completionKeyHash: keyHash },
    });
    if (claimed.count !== 1) throw new MobileEnrollmentError("ENROLLMENT_SESSION_REPLAYED", 409);
    await tx.mobileAuthChallenge.update({ where: { id: record.challengeId }, data: { state: "CONSUMED", consumedAt: new Date() } });
    const session = await issueMobileSession(tx, record.user as { id: string; role: SystemRole }, deviceName, undefined, { authMethod: "PASSKEY", appVersion });
    const storedRefresh = await tx.mobileRefreshToken.findUnique({
      where: { tokenHash: hashMobileRefreshToken(session.refreshToken) },
      select: { deviceSessionId: true },
    });
    if (storedRefresh?.deviceSessionId) {
      await tx.mobileDeviceCredential.updateMany({
        where: { enrollmentSessionId: record.id, status: "ACTIVE" },
        data: { deviceSessionId: storedRefresh.deviceSessionId },
      });
      await tx.mobileEnrollmentSession.update({ where: { id: record.id }, data: { completedDeviceSessionId: storedRefresh.deviceSessionId } });
    }
    await tx.auditLog.create({
      data: { actorId: record.userId, operation: "auth.mobile_enrollment.completed", metadata: { biometricOutcome: record.biometricOutcome } },
    });
    return fullEnrollmentResponse(record, session);
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 });
}

function fullEnrollmentResponse(
  record: Awaited<ReturnType<typeof authorizeEnrollment>>["record"],
  session: Awaited<ReturnType<typeof issueMobileSession>>,
) {
  return {
    ok: true as const,
    ...mobileChallengeView(record.challenge, { nextAction: "PROFILE_SETUP", sessionScope: "FULL" }),
    ...session,
    user: {
      id: record.user.id,
      name: record.user.name,
      phone: record.user.phoneE164 || record.user.phone,
      email: record.user.email,
      role: record.user.role,
      locale: record.user.locale,
    },
  };
}

export function constantTimeTokenEquals(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

const passkeyAlgorithms = [-7, -8, -257] as const;

function withoutUnneededCreationExtensions(options: PublicKeyCredentialCreationOptionsJSON): PublicKeyCredentialCreationOptionsJSON {
  const { credProps: _credProps, ...remainingExtensions } = options.extensions || {};
  const { extensions: _extensions, ...rest } = options;
  return Object.keys(remainingExtensions).length ? { ...rest, extensions: remainingExtensions } : rest;
}

export async function createEnrollmentPasskeyOptions(request: Request) {
  const { record, tokenHash } = await authorizeEnrollment(request, ["PASSKEY_REQUIRED"]);
  if (record.passkeyCredentialId) return { completed: true as const, decision: enrollmentView(record) };
  const config = passkeyConfig();
  passkeyExpectedOrigins("MOBILE");
  const existing = await prisma.passkeyCredential.findMany({
    where: { userId: record.userId, revokedAt: null },
    select: { credentialId: true, transports: true },
  });
  const generated = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userID: Buffer.from(record.userId),
    userName: `pop-${record.userId}`,
    userDisplayName: record.user.name || "POP user",
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
    supportedAlgorithmIDs: [...passkeyAlgorithms],
    excludeCredentials: existing.map(item => ({ id: item.credentialId, transports: item.transports as never })),
  });
  const options = withoutUnneededCreationExtensions(generated);
  await prisma.passkeyChallenge.create({
    data: {
      userId: record.userId,
      type: "REGISTER",
      enrollmentSessionId: record.id,
      sessionBindingHash: tokenHash,
      challengeHash: passkeyChallengeHash(options.challenge),
      expiresAt: new Date(Date.now() + 5 * 60_000),
    },
  });
  return { completed: false as const, options };
}

export async function verifyEnrollmentPasskey(request: Request, body: unknown) {
  const { record, tokenHash } = await authorizeEnrollment(request, ["PASSKEY_REQUIRED", "BIOMETRIC_REQUIRED"]);
  if (record.passkeyCredentialId) return { idempotent: true, decision: enrollmentView(record) };
  const challenge = responseChallenge(body);
  if (!challenge) throw new MobileEnrollmentError("ENROLLMENT_SESSION_REQUIRED", 400);
  const stored = await prisma.passkeyChallenge.findFirst({
    where: {
      userId: record.userId,
      enrollmentSessionId: record.id,
      type: "REGISTER",
      sessionBindingHash: tokenHash,
      challengeHash: passkeyChallengeHash(challenge),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!stored) throw new Error("PASSKEY_CHALLENGE_INVALID");
  const config = passkeyConfig();
  const verification = await verifyRegistrationResponse({
    response: body as RegistrationResponseJSON,
    expectedChallenge: challenge,
    expectedOrigin: passkeyExpectedOrigins("MOBILE"),
    expectedRPID: config.rpID,
    requireUserVerification: true,
  });
  if (!verification.verified) throw new Error("PASSKEY_VERIFICATION_FAILED");
  const info = verification.registrationInfo;
  return prisma.$transaction(async tx => {
    const consumed = await tx.passkeyChallenge.updateMany({
      where: { id: stored.id, enrollmentSessionId: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new Error("PASSKEY_CHALLENGE_REPLAYED");
    const passkey = await tx.passkeyCredential.create({
      data: {
        userId: record.userId,
        credentialId: info.credential.id,
        publicKey: Buffer.from(info.credential.publicKey),
        counter: BigInt(info.credential.counter),
        transports: info.credential.transports || [],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
      },
    });
    const updated = await tx.mobileEnrollmentSession.update({
      where: { id: record.id },
      data: { passkeyCredentialId: passkey.id, state: "BIOMETRIC_REQUIRED" },
      include: { challenge: true },
    });
    await tx.auditLog.create({
      data: { actorId: record.userId, operation: "auth.mobile_enrollment.passkey_added", targetId: passkey.id, metadata: { deviceType: info.credentialDeviceType, backedUp: info.credentialBackedUp } },
    });
    return { idempotent: false, decision: enrollmentView(updated) };
  }, { isolationLevel: "Serializable" });
}

export async function createDeviceBindingChallenge(request: Request) {
  const { record } = await authorizeEnrollment(request, ["BIOMETRIC_REQUIRED"]);
  if (!record.passkeyCredentialId) throw new MobileEnrollmentError("PASSKEY_ENROLLMENT_REQUIRED", 409);
  if (record.biometricOutcome) return { completed: true as const, decision: enrollmentView(record) };
  const challenge = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 2 * 60_000);
  await prisma.mobileEnrollmentSession.update({
    where: { id: record.id },
    data: { deviceChallengeHash: mobileDeviceChallengeHash(challenge), deviceChallengeExpiresAt: expiresAt, deviceChallengeConsumedAt: null },
  });
  return { completed: false as const, challenge, expiresAt: expiresAt.toISOString(), algorithms: ["ES256"] };
}

export async function verifyDeviceBinding(request: Request, body: unknown) {
  const { record } = await authorizeEnrollment(request, ["BIOMETRIC_REQUIRED", "READY_FOR_UPGRADE"]);
  if (!record.passkeyCredentialId) throw new MobileEnrollmentError("PASSKEY_ENROLLMENT_REQUIRED", 409);
  if (record.biometricOutcome) return { idempotent: true, decision: enrollmentView(record) };
  const value = body as { challenge?: unknown; credentialId?: unknown; publicKey?: unknown; signature?: unknown; biometricType?: unknown };
  const proof = {
    challenge: typeof value.challenge === "string" ? value.challenge : "",
    credentialId: typeof value.credentialId === "string" ? value.credentialId : "",
    publicKey: typeof value.publicKey === "string" ? value.publicKey : "",
    signature: typeof value.signature === "string" ? value.signature : "",
    biometricType: typeof value.biometricType === "string" ? value.biometricType : "",
  };
  if (!record.deviceChallengeHash || !record.deviceChallengeExpiresAt || record.deviceChallengeExpiresAt <= new Date()) throw new Error("DEVICE_BINDING_CHALLENGE_EXPIRED");
  if (record.deviceChallengeConsumedAt || mobileDeviceChallengeHash(proof.challenge) !== record.deviceChallengeHash) throw new Error("DEVICE_BINDING_CHALLENGE_INVALID");
  const verified = verifyMobileDeviceBinding(proof);
  if (!verified) throw new Error("DEVICE_BINDING_FAILED");
  return prisma.$transaction(async tx => {
    const consumed = await tx.mobileEnrollmentSession.updateMany({
      where: {
        id: record.id,
        state: "BIOMETRIC_REQUIRED",
        deviceChallengeHash: record.deviceChallengeHash,
        deviceChallengeConsumedAt: null,
        deviceChallengeExpiresAt: { gt: new Date() },
      },
      data: {
        deviceChallengeConsumedAt: new Date(),
        biometricOutcome: proof.biometricType === "UNAVAILABLE" ? "UNAVAILABLE" : "ENROLLED",
        state: "READY_FOR_UPGRADE",
      },
    });
    if (consumed.count !== 1) throw new Error("DEVICE_BINDING_CHALLENGE_REPLAYED");
    const credential = await tx.mobileDeviceCredential.create({
      data: {
        credentialId: proof.credentialId,
        userId: record.userId,
        enrollmentSessionId: record.id,
        publicKey: Uint8Array.from(verified.publicKey),
        biometricType: proof.biometricType,
      },
    });
    const updated = await tx.mobileEnrollmentSession.findUniqueOrThrow({ where: { id: record.id }, include: { challenge: true } });
    await tx.auditLog.create({
      data: { actorId: record.userId, operation: "auth.mobile_enrollment.device_bound", targetId: credential.id, metadata: { biometricType: proof.biometricType } },
    });
    return { idempotent: false, decision: enrollmentView(updated) };
  }, { isolationLevel: "Serializable" });
}

export async function createDeviceAuthenticationOptions(input: { challengeId: string; credentialId: string }) {
  const challenge = await prisma.mobileAuthChallenge.findFirst({
    where: { id: input.challengeId, state: "OPEN", revokedAt: null, expiresAt: { gt: new Date() }, allowedMethods: { has: "BIOMETRIC_DEVICE_CREDENTIAL" } },
  });
  if (!challenge?.userId) throw new Error("AUTH_METHOD_NOT_ALLOWED");
  const credential = await prisma.mobileDeviceCredential.findFirst({
    where: { credentialId: input.credentialId, userId: challenge.userId, status: "ACTIVE", revokedAt: null, deviceSession: { is: { revokedAt: null } } },
    select: { credentialId: true },
  });
  if (!credential) throw new Error("DEVICE_CREDENTIAL_UNAVAILABLE");
  const deviceChallenge = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 2 * 60_000);
  await prisma.mobileAuthChallenge.update({
    where: { id: challenge.id },
    data: { deviceChallengeHash: mobileDeviceChallengeHash(deviceChallenge), deviceChallengeExpiresAt: expiresAt, deviceChallengeConsumedAt: null },
  });
  return { challenge: deviceChallenge, expiresAt: expiresAt.toISOString(), algorithm: "ES256" as const };
}

export async function authenticateDeviceCredential(input: {
  challengeId: string;
  proof: { challenge: string; credentialId: string; publicKey: string; signature: string; biometricType: string };
  deviceName?: string;
  appVersion?: string;
}) {
  const challenge = await prisma.mobileAuthChallenge.findFirst({
    where: { id: input.challengeId, state: "OPEN", revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!challenge?.userId || !challenge.deviceChallengeHash || !challenge.deviceChallengeExpiresAt) throw new Error("AUTH_CHALLENGE_INVALID");
  if (challenge.deviceChallengeExpiresAt <= new Date()) throw new Error("AUTH_CHALLENGE_EXPIRED");
  if (challenge.deviceChallengeConsumedAt || mobileDeviceChallengeHash(input.proof.challenge) !== challenge.deviceChallengeHash) throw new Error("AUTH_CHALLENGE_INVALID");
  const credential = await prisma.mobileDeviceCredential.findFirst({
    where: { credentialId: input.proof.credentialId, userId: challenge.userId, status: "ACTIVE", revokedAt: null, deviceSession: { is: { revokedAt: null } } },
    include: { user: { select: { id: true, role: true, status: true, name: true, email: true, phoneE164: true, phone: true, locale: true } } },
  });
  if (!credential || credential.user.status !== "ACTIVE") throw new Error("DEVICE_CREDENTIAL_UNAVAILABLE");
  if (Buffer.from(input.proof.publicKey, "base64url").compare(Buffer.from(credential.publicKey)) !== 0) throw new Error("DEVICE_BINDING_FAILED");
  if (!verifyMobileDeviceBinding(input.proof)) throw new Error("DEVICE_BINDING_FAILED");
  return prisma.$transaction(async tx => {
    const consumed = await tx.mobileAuthChallenge.updateMany({
      where: { id: challenge.id, state: "OPEN", deviceChallengeConsumedAt: null, deviceChallengeExpiresAt: { gt: new Date() } },
      data: { state: "CONSUMED", consumedAt: new Date(), deviceChallengeConsumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new Error("AUTH_CHALLENGE_REPLAYED");
    await tx.mobileDeviceCredential.update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } });
    const session = await issueMobileSession(tx, credential.user as { id: string; role: SystemRole }, input.deviceName, undefined, { authMethod: "DEVICE_CREDENTIAL", appVersion: input.appVersion });
    await tx.auditLog.create({ data: { actorId: credential.userId, operation: "auth.mobile_device.verified", targetId: credential.id, metadata: { method: "BIOMETRIC_DEVICE_CREDENTIAL" } } });
    return {
      ok: true as const,
      ...mobileChallengeView(challenge, { nextAction: "AUTHENTICATED", sessionScope: "FULL" }),
      ...session,
      user: {
        id: credential.user.id,
        name: credential.user.name,
        phone: credential.user.phoneE164 || credential.user.phone,
        email: credential.user.email,
        role: credential.user.role,
        locale: credential.user.locale,
      },
    };
  }, { isolationLevel: "Serializable" });
}

import "server-only";

import { createHash } from "node:crypto";
import { Prisma, prisma, type User } from "@popwam/db";
import { ensureUserDefaultsInTransaction } from "./ensure-user";
import { issueMobileSession } from "./mobile-auth";
import { normalizePhone } from "./phone";
import { markNewAccountForProfileBootstrap } from "./profile-bootstrap";
import {
  ExternalIdentityError,
  isRetryableFirebasePhoneResolutionError,
  planFirebasePhoneResolution,
} from "./firebase/phone-policy";
export {
  ExternalIdentityError,
  isRetryableFirebasePhoneResolutionError,
  planFirebasePhoneResolution,
} from "./firebase/phone-policy";

function firebaseWhere(firebaseUid: string) {
  return { provider_providerSubject: { provider: "FIREBASE" as const, providerSubject: firebaseUid } };
}

function syntheticPhoneEmail(phone: string) {
  const digest = createHash("sha256").update(phone).digest("hex").slice(0, 32);
  return `firebase-phone-${digest}@auth.popwam.invalid`;
}

type VerifiedPhoneProof = { uid: string; phoneNumber: string };

async function resolveFirebasePhoneOnce(
  proof: VerifiedPhoneProof,
  deviceName?: string,
  appVersion?: string,
) {
  const normalized = normalizePhone(proof.phoneNumber);
  if (!normalized.valid || normalized.e164 !== proof.phoneNumber) throw new ExternalIdentityError("FIREBASE_PHONE_INVALID");
  return prisma.$transaction(async (tx) => {
    const identity = await tx.externalIdentity.findUnique({
      where: firebaseWhere(proof.uid),
      select: { id: true, userId: true, status: true },
    });
    const phoneUser = await tx.user.findFirst({
      where: { OR: [{ phoneE164: normalized.e164 }, { phone: normalized.e164 }] },
      select: { id: true, status: true, phone: true, phoneE164: true },
    });
    const linkedUser = identity?.userId
      ? await tx.user.findUnique({
          where: { id: identity.userId },
          select: { id: true, status: true, phone: true, phoneE164: true },
        })
      : null;
    const plan = planFirebasePhoneResolution({
      verifiedPhone: normalized.e164,
      identity,
      linkedUser,
      phoneUser,
    });
    const now = new Date();
    let isNewUser = false;
    let user:User;
    if (plan.action === "CREATE_USER") {
      isNewUser = true;
      user = await tx.user.create({
        data: {
          email: syntheticPhoneEmail(normalized.e164),
          phone: normalized.e164,
          phoneE164: normalized.e164,
          phoneCountryIso2: normalized.countryIso2,
          phoneCallingCode: normalized.callingCode,
          phoneVerifiedAt: now,
          name: null,
        },
      });
    } else {
      const foundUser = await tx.user.findUnique({ where: { id: plan.userId } });
      if (!foundUser || foundUser.status !== "ACTIVE") throw new ExternalIdentityError("POP_USER_UNAVAILABLE");
      user = foundUser;
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          phoneE164: normalized.e164,
          phone: user.phone || normalized.e164,
          phoneCountryIso2: normalized.countryIso2,
          phoneCallingCode: normalized.callingCode,
          phoneVerifiedAt: user.phoneVerifiedAt || now,
          lastLoginAt: now,
        },
      });
    }
    if (!identity) {
      await tx.externalIdentity.create({
        data: {
          userId: user.id,
          provider: "FIREBASE",
          providerSubject: proof.uid,
          identityType: "VERIFIED",
          status: "ACTIVE",
          linkedAt: now,
          lastSeenAt: now,
        },
      });
    } else if (identity.userId === null) {
      const linked = await tx.externalIdentity.updateMany({
        where: { id: identity.id, userId: null, status: "ACTIVE" },
        data: { userId: user.id, identityType: "VERIFIED", linkedAt: now, lastSeenAt: now },
      });
      if (linked.count !== 1) throw new ExternalIdentityError("EXTERNAL_IDENTITY_CONFLICT");
    } else {
      await tx.externalIdentity.update({ where: { id: identity.id }, data: { identityType: "VERIFIED", lastSeenAt: now } });
    }
    if (isNewUser) {
      await ensureUserDefaultsInTransaction(tx, user.id);
      await markNewAccountForProfileBootstrap(tx, user.id);
      user = await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        operation: "auth.firebase_phone.verified",
        metadata: { provider: "FIREBASE", newUser: isNewUser },
      },
    });
    const session = await issueMobileSession(tx, user, deviceName, undefined, {
      authMethod: "OTP",
      appVersion,
    });
    return {
      session,
      isNewUser,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phoneE164 || user.phone,
        email: user.email,
        role: user.role,
        locale: user.locale,
      },
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10_000,
    timeout: 30_000,
  });
}

/**
 * Unique phone and provider-subject constraints plus serializable retries make
 * concurrent first exchanges deterministic without introducing a new table.
 */
export async function resolveFirebasePhoneSession(
  proof: VerifiedPhoneProof,
  deviceName?: string,
  appVersion?: string,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await resolveFirebasePhoneOnce(proof, deviceName, appVersion);
    } catch (error) {
      lastError = error;
      if (!isRetryableFirebasePhoneResolutionError(error)) throw error;
    }
  }
  throw lastError;
}

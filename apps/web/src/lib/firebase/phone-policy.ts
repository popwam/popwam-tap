export type FirebaseIdentityRecord = {
  id: string;
  userId: string | null;
  status: "ACTIVE" | "REVOKED";
};

export type PopPhoneUser = {
  id: string;
  status: string;
  phone: string | null;
  phoneE164: string | null;
};

export class ExternalIdentityError extends Error {
  constructor(readonly code:
    | "EXTERNAL_IDENTITY_REVOKED"
    | "EXTERNAL_IDENTITY_CONFLICT"
    | "FIREBASE_PHONE_INVALID"
    | "POP_USER_UNAVAILABLE"
  ) { super(code); }
}

export type FirebasePhoneResolutionPlan =
  | { action: "CREATE_USER" }
  | { action: "USE_USER"; userId: string; identityAction: "CREATE" | "LINK" | "TOUCH" };

function normalizedUserPhone(user: PopPhoneUser | null) {
  if (!user) return null;
  const phone = user.phoneE164 || user.phone || "";
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function planFirebasePhoneResolution(input: {
  verifiedPhone: string;
  identity: FirebaseIdentityRecord | null;
  linkedUser: PopPhoneUser | null;
  phoneUser: PopPhoneUser | null;
}): FirebasePhoneResolutionPlan {
  const { identity, linkedUser, phoneUser, verifiedPhone } = input;
  if (identity?.status !== undefined && identity.status !== "ACTIVE") throw new ExternalIdentityError("EXTERNAL_IDENTITY_REVOKED");
  if (identity?.userId) {
    if (!linkedUser || linkedUser.status !== "ACTIVE" || normalizedUserPhone(linkedUser) !== verifiedPhone) {
      throw new ExternalIdentityError("EXTERNAL_IDENTITY_CONFLICT");
    }
    if (phoneUser && phoneUser.id !== linkedUser.id) throw new ExternalIdentityError("EXTERNAL_IDENTITY_CONFLICT");
    return { action: "USE_USER", userId: linkedUser.id, identityAction: "TOUCH" };
  }
  if (phoneUser) {
    if (phoneUser.status !== "ACTIVE") throw new ExternalIdentityError("POP_USER_UNAVAILABLE");
    return { action: "USE_USER", userId: phoneUser.id, identityAction: identity ? "LINK" : "CREATE" };
  }
  return { action: "CREATE_USER" };
}

export function isRetryableFirebasePhoneResolutionError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: string }).code
    : undefined;
  return code === "P2002" || code === "P2034";
}
